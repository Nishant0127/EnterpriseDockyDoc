import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { OcrOutput } from './ocr-provider.interface';

// ------------------------------------------------------------------ //
// Output types
// ------------------------------------------------------------------ //

export interface ConfidenceByField {
  documentType: number;
  title: number;
  issuer: number;
  counterparty: number;
  contractNumber: number;
  policyNumber: number;
  certificateNumber: number;
  referenceNumber: number;
  issueDate: number;
  effectiveDate: number;
  expiryDate: number;
  renewalDueDate: number;
  suggestedTags: number;
  suggestedFolder: number;
}

export interface ExtractionResult {
  documentType: string | null;
  title: string | null;
  issuer: string | null;
  counterparty: string | null;
  contractNumber: string | null;
  policyNumber: string | null;
  certificateNumber: string | null;
  referenceNumber: string | null;
  issueDate: string | null;       // YYYY-MM-DD
  effectiveDate: string | null;   // YYYY-MM-DD
  expiryDate: string | null;      // YYYY-MM-DD
  renewalDueDate: string | null;  // YYYY-MM-DD
  summary: string | null;
  keyPoints: string[];
  suggestedTags: string[];
  suggestedFolder: string | null;
  riskFlags: string[];
  overallConfidence: number;      // 0-1
  dateConfidence: number;         // 0-1
  confidenceByField: ConfidenceByField;
}

// ------------------------------------------------------------------ //
// Prompt builder
// ------------------------------------------------------------------ //

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(v: unknown): v is string {
  return typeof v === 'string' && DATE_RE.test(v);
}

function safeDate(v: unknown): string | null {
  if (!isValidDate(v)) return null;
  try {
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? null : (v as string);
  } catch {
    return null;
  }
}

function safeString(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  return typeof v === 'string' ? v.trim() || null : String(v).trim() || null;
}

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return isNaN(n) ? fallback : Math.min(1, Math.max(0, n));
}

function clampConfidence(v: unknown): number {
  return safeNumber(v, 0.5);
}

/**
 * ExtractionService — takes OCR output (already-extracted text) and produces
 * a fully structured ExtractionResult with per-field confidence scores.
 *
 * Uses:
 *   - OpenAI GPT-4o with Structured Outputs if OPENAI_API_KEY is set
 *   - Claude Sonnet JSON mode as fallback (always available with ANTHROPIC_API_KEY)
 */
@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  private readonly openaiApiKey: string | null;
  private readonly anthropicClient: Anthropic | null;

  constructor(private readonly config: ConfigService) {
    this.openaiApiKey = this.config.get<string>('OPENAI_API_KEY') ?? null;

    const anthropicKey = this.config.get<string>('ANTHROPIC_API_KEY');
    this.anthropicClient = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;

    this.logger.log(
      `ExtractionService: OpenAI=${this.openaiApiKey ? 'yes' : 'no'}, Claude=${this.anthropicClient ? 'yes' : 'no'}`,
    );
  }

  async extract(
    ocrOutput: OcrOutput,
    documentName: string,
    anthropicClientOverride?: Anthropic,
  ): Promise<ExtractionResult | null> {
    const text = ocrOutput.fullText;
    if (!text || text.trim().length < 5) {
      this.logger.warn(`ExtractionService: empty OCR text for ${documentName}`);
      return null;
    }

    const client = anthropicClientOverride ?? this.anthropicClient;

    try {
      if (this.openaiApiKey) {
        return await this.extractWithOpenAi(text, documentName, ocrOutput.keyValuePairs);
      } else if (client) {
        return await this.extractWithClaude(text, documentName, ocrOutput.keyValuePairs, client);
      } else {
        this.logger.warn('ExtractionService: no AI client available');
        return null;
      }
    } catch (err) {
      this.logger.error(
        `ExtractionService extract failed for ${documentName}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  // ---------------------------------------------------------------- //
  // OpenAI GPT-4o Structured Outputs
  // ---------------------------------------------------------------- //
  private async extractWithOpenAi(
    text: string,
    documentName: string,
    keyValuePairs?: Record<string, string>,
  ): Promise<ExtractionResult | null> {
    try {
      // Dynamic import to avoid breaking if openai package not installed
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const OpenAI = require('openai');
      const client = new OpenAI.OpenAI({ apiKey: this.openaiApiKey });

      const kvSection = keyValuePairs && Object.keys(keyValuePairs).length > 0
        ? `\n\nKey-value pairs detected by OCR:\n${Object.entries(keyValuePairs)
            .slice(0, 30)
            .map(([k, v]) => `  ${k}: ${v}`)
            .join('\n')}`
        : '';

      const response = await client.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(),
          },
          {
            role: 'user',
            content: `Document filename: ${documentName}${kvSection}\n\nFull extracted text:\n${text.slice(0, 8000)}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'document_extraction',
            strict: true,
            schema: getOpenAiSchema(),
          },
        },
        max_tokens: 2048,
        temperature: 0,
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) return null;

      this.logger.log(`GPT-4o extraction successful for ${documentName}`);
      return parseExtractionJson(JSON.parse(raw));
    } catch (err) {
      this.logger.warn(
        `GPT-4o extraction failed for ${documentName}: ${(err as Error).message}. Falling back to Claude.`,
      );
      // Fall through to Claude
      if (this.anthropicClient) {
        return this.extractWithClaude(text, documentName, keyValuePairs, this.anthropicClient);
      }
      return null;
    }
  }

  // ---------------------------------------------------------------- //
  // Claude Sonnet JSON mode
  // ---------------------------------------------------------------- //
  private async extractWithClaude(
    text: string,
    documentName: string,
    keyValuePairs: Record<string, string> | undefined,
    client: Anthropic,
  ): Promise<ExtractionResult | null> {
    const kvSection = keyValuePairs && Object.keys(keyValuePairs).length > 0
      ? `\n\nKey-value pairs detected by OCR:\n${Object.entries(keyValuePairs)
          .slice(0, 30)
          .map(([k, v]) => `  ${k}: ${v}`)
          .join('\n')}`
      : '';

    const prompt = `${buildSystemPrompt()}

Document filename: ${documentName}${kvSection}

Full extracted text:
${text.slice(0, 8000)}

${buildJsonTemplate()}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') return null;

    const raw = content.text.trim();
    let parsed: Record<string, unknown>;
    try {
      if (raw.startsWith('{')) {
        parsed = JSON.parse(raw);
      } else {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON object found');
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      this.logger.warn(
        `Claude JSON parse failed for ${documentName}: ${(err as Error).message}`,
      );
      return null;
    }

    this.logger.log(`Claude Sonnet extraction successful for ${documentName}`);
    return parseExtractionJson(parsed);
  }
}

// ------------------------------------------------------------------ //
// Shared prompt builder
// ------------------------------------------------------------------ //

function buildSystemPrompt(): string {
  return `You are an expert document analyst specializing in structured data extraction. Your task is to extract specific fields from the provided document text with high precision.

CRITICAL EXTRACTION RULES:
1. DATES: Convert ALL dates to YYYY-MM-DD format
   - "31 Dec 2027" → "2027-12-31"
   - "12/31/2027" → "2027-12-31"
   - "December 31, 2027" → "2027-12-31"
   - Passports: look for "Date of expiry", "Expiry date", "Valid until", "Date of issue"
   - Contracts: "effective date", "termination date", "renewal date"
   - Insurance: "policy period", "valid from/to", "expiration date"

2. DOCUMENT TYPE: Be precise
   - passport, national_id, drivers_license → id
   - insurance_policy, insurance_certificate → insurance
   - employment_contract, lease_agreement, service_agreement → contract
   - invoice, receipt, purchase_order → invoice
   - Use: contract|invoice|insurance|certification|license|id|policy|agreement|report|receipt|other

3. REFERENCE NUMBERS: Extract ALL visible reference numbers
   - contractNumber: contract/agreement numbers
   - policyNumber: insurance policy numbers
   - certificateNumber: certificate/credential numbers
   - referenceNumber: any other reference/case/order number

4. CONFIDENCE SCORES:
   - 0.95+: Field clearly visible and unambiguous
   - 0.80-0.94: Field visible but may have minor uncertainty
   - 0.60-0.79: Field inferred or partially visible
   - 0.40-0.59: Uncertain extraction
   - 0.0-0.39: Field not found or very uncertain

5. TAGS: 2-5 relevant, lowercase, hyphenated tags (e.g., "insurance", "expiring-soon", "government-id")

6. FOLDER: Suggest a logical folder name (e.g., "Passports & IDs", "Insurance", "Contracts", "Certificates")

7. RISK FLAGS: Only real risks — expiring within 90 days, already expired, suspicious content. Empty array if none.`;
}

function buildJsonTemplate(): string {
  return `Respond with ONLY a valid JSON object. No text, no markdown, no code blocks.

{
  "documentType": "contract|invoice|insurance|certification|license|id|policy|agreement|report|receipt|other",
  "title": "full document title or null",
  "issuer": "issuing organization/authority or null",
  "counterparty": "other party/holder name or null",
  "contractNumber": "contract number or null",
  "policyNumber": "policy number or null",
  "certificateNumber": "certificate number or null",
  "referenceNumber": "any other reference number or null",
  "issueDate": "YYYY-MM-DD or null",
  "effectiveDate": "YYYY-MM-DD or null",
  "expiryDate": "YYYY-MM-DD or null",
  "renewalDueDate": "YYYY-MM-DD or null",
  "summary": "2-3 sentence description",
  "keyPoints": ["key fact 1", "key fact 2"],
  "suggestedTags": ["tag1", "tag2"],
  "suggestedFolder": "folder name or null",
  "riskFlags": [],
  "overallConfidence": 0.95,
  "dateConfidence": 0.95,
  "confidenceByField": {
    "documentType": 0.95,
    "title": 0.90,
    "issuer": 0.90,
    "counterparty": 0.85,
    "contractNumber": 0.0,
    "policyNumber": 0.0,
    "certificateNumber": 0.0,
    "referenceNumber": 0.0,
    "issueDate": 0.90,
    "effectiveDate": 0.0,
    "expiryDate": 0.95,
    "renewalDueDate": 0.0,
    "suggestedTags": 0.85,
    "suggestedFolder": 0.85
  }
}`;
}

// ------------------------------------------------------------------ //
// OpenAI strict JSON schema
// ------------------------------------------------------------------ //
function getOpenAiSchema() {
  return {
    type: 'object',
    properties: {
      documentType: { type: 'string' },
      title: { type: ['string', 'null'] },
      issuer: { type: ['string', 'null'] },
      counterparty: { type: ['string', 'null'] },
      contractNumber: { type: ['string', 'null'] },
      policyNumber: { type: ['string', 'null'] },
      certificateNumber: { type: ['string', 'null'] },
      referenceNumber: { type: ['string', 'null'] },
      issueDate: { type: ['string', 'null'] },
      effectiveDate: { type: ['string', 'null'] },
      expiryDate: { type: ['string', 'null'] },
      renewalDueDate: { type: ['string', 'null'] },
      summary: { type: ['string', 'null'] },
      keyPoints: { type: 'array', items: { type: 'string' } },
      suggestedTags: { type: 'array', items: { type: 'string' } },
      suggestedFolder: { type: ['string', 'null'] },
      riskFlags: { type: 'array', items: { type: 'string' } },
      overallConfidence: { type: 'number' },
      dateConfidence: { type: 'number' },
      confidenceByField: {
        type: 'object',
        properties: {
          documentType: { type: 'number' },
          title: { type: 'number' },
          issuer: { type: 'number' },
          counterparty: { type: 'number' },
          contractNumber: { type: 'number' },
          policyNumber: { type: 'number' },
          certificateNumber: { type: 'number' },
          referenceNumber: { type: 'number' },
          issueDate: { type: 'number' },
          effectiveDate: { type: 'number' },
          expiryDate: { type: 'number' },
          renewalDueDate: { type: 'number' },
          suggestedTags: { type: 'number' },
          suggestedFolder: { type: 'number' },
        },
        required: [
          'documentType', 'title', 'issuer', 'counterparty',
          'contractNumber', 'policyNumber', 'certificateNumber', 'referenceNumber',
          'issueDate', 'effectiveDate', 'expiryDate', 'renewalDueDate',
          'suggestedTags', 'suggestedFolder',
        ],
        additionalProperties: false,
      },
    },
    required: [
      'documentType', 'title', 'issuer', 'counterparty',
      'contractNumber', 'policyNumber', 'certificateNumber', 'referenceNumber',
      'issueDate', 'effectiveDate', 'expiryDate', 'renewalDueDate',
      'summary', 'keyPoints', 'suggestedTags', 'suggestedFolder',
      'riskFlags', 'overallConfidence', 'dateConfidence', 'confidenceByField',
    ],
    additionalProperties: false,
  };
}

// ------------------------------------------------------------------ //
// Parse raw JSON to ExtractionResult
// ------------------------------------------------------------------ //
function parseExtractionJson(raw: Record<string, unknown>): ExtractionResult {
  const cbf = (raw.confidenceByField ?? {}) as Record<string, unknown>;

  const defaultConfidence: ConfidenceByField = {
    documentType: clampConfidence(cbf.documentType),
    title: clampConfidence(cbf.title),
    issuer: clampConfidence(cbf.issuer),
    counterparty: clampConfidence(cbf.counterparty),
    contractNumber: clampConfidence(cbf.contractNumber),
    policyNumber: clampConfidence(cbf.policyNumber),
    certificateNumber: clampConfidence(cbf.certificateNumber),
    referenceNumber: clampConfidence(cbf.referenceNumber),
    issueDate: clampConfidence(cbf.issueDate),
    effectiveDate: clampConfidence(cbf.effectiveDate),
    expiryDate: clampConfidence(cbf.expiryDate),
    renewalDueDate: clampConfidence(cbf.renewalDueDate),
    suggestedTags: clampConfidence(cbf.suggestedTags),
    suggestedFolder: clampConfidence(cbf.suggestedFolder),
  };

  return {
    documentType: safeString(raw.documentType),
    title: safeString(raw.title),
    issuer: safeString(raw.issuer),
    counterparty: safeString(raw.counterparty),
    contractNumber: safeString(raw.contractNumber),
    policyNumber: safeString(raw.policyNumber),
    certificateNumber: safeString(raw.certificateNumber),
    referenceNumber: safeString(raw.referenceNumber),
    issueDate: safeDate(raw.issueDate),
    effectiveDate: safeDate(raw.effectiveDate),
    expiryDate: safeDate(raw.expiryDate),
    renewalDueDate: safeDate(raw.renewalDueDate),
    summary: safeString(raw.summary),
    keyPoints: safeStringArray(raw.keyPoints),
    suggestedTags: safeStringArray(raw.suggestedTags),
    suggestedFolder: safeString(raw.suggestedFolder),
    riskFlags: safeStringArray(raw.riskFlags),
    overallConfidence: safeNumber(raw.overallConfidence, 0.5),
    dateConfidence: safeNumber(raw.dateConfidence, 0.5),
    confidenceByField: defaultConfidence,
  };
}
