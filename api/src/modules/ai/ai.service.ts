import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { PLAN_TOKEN_LIMITS } from '../workspaces/dto/ai-settings.dto';

// ------------------------------------------------------------------ //
// Metadata key constants
// ------------------------------------------------------------------ //
const AI_KEYS = {
  STATUS: 'ai:status',
  DOCUMENT_TYPE: 'ai:documentType',
  TITLE: 'ai:title',
  ISSUER: 'ai:issuer',
  COUNTERPARTY: 'ai:counterparty',
  CONTRACT_NUMBER: 'ai:contractNumber',
  POLICY_NUMBER: 'ai:policyNumber',
  CERTIFICATE_NUMBER: 'ai:certificateNumber',
  REFERENCE_NUMBER: 'ai:referenceNumber',
  ISSUE_DATE: 'ai:issueDate',
  EFFECTIVE_DATE: 'ai:effectiveDate',
  EXPIRY_DATE: 'ai:expiryDate',
  RENEWAL_DATE: 'ai:renewalDueDate',
  SUMMARY: 'ai:summary',
  KEY_POINTS: 'ai:keyPoints',
  SUGGESTED_TAGS: 'ai:suggestedTags',
  SUGGESTED_FOLDER: 'ai:suggestedFolder',
  RISK_FLAGS: 'ai:riskFlags',
  OVERALL_CONFIDENCE: 'ai:overallConfidence',
  DATE_CONFIDENCE: 'ai:dateConfidence',
  EXTRACTED_AT: 'ai:extractedAt',
  APPLIED_FIELDS: 'ai:appliedFields',
  ERROR: 'ai:error',
} as const;

// ------------------------------------------------------------------ //
// AiExtractionResult interface
// ------------------------------------------------------------------ //
export interface AiExtractionResult {
  status: 'done' | 'running' | 'failed' | 'disabled' | 'none';
  documentType: string | null;
  title: string | null;
  issuer: string | null;
  counterparty: string | null;
  contractNumber: string | null;
  policyNumber: string | null;
  certificateNumber: string | null;
  referenceNumber: string | null;
  issueDate: string | null;
  effectiveDate: string | null;
  expiryDate: string | null;
  renewalDueDate: string | null;
  summary: string | null;
  keyPoints: string[];
  suggestedTags: string[];
  suggestedFolder: string | null;
  riskFlags: string[];
  overallConfidence: number;
  dateConfidence: number;
  extractedAt: string | null;
  appliedFields: string[];
  error: string | null;
}

// ------------------------------------------------------------------ //
// Helpers
// ------------------------------------------------------------------ //
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(v: unknown): v is string {
  return typeof v === 'string' && DATE_RE.test(v);
}

function safeString(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string') return v;
  return String(v);
}

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string');
}

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic | null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    if (!this.client) {
      this.logger.warn('ANTHROPIC_API_KEY not set — AI features disabled');
    }
  }

  get isEnabled(): boolean {
    return this.client !== null;
  }

  // ---------------------------------------------------------------- //
  // Metadata upsert helper
  // ---------------------------------------------------------------- //
  private async upsertMeta(
    documentId: string,
    key: string,
    value: string,
  ): Promise<void> {
    await this.prisma.documentMetadata.upsert({
      where: { documentId_key: { documentId, key } },
      update: { value },
      create: { documentId, key, value },
    });
  }

  // ---------------------------------------------------------------- //
  // Workspace-aware client routing
  // ---------------------------------------------------------------- //
  private async getClientForWorkspace(workspaceId: string): Promise<{
    client: Anthropic;
    isplatform: boolean;
    workspaceId: string;
  } | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workspace = await (this.prisma.workspace as any).findUnique({
      where: { id: workspaceId },
      select: {
        plan: true,
        aiProvider: true,
        aiApiKeyEncrypted: true,
        aiUsageTokens: true,
      },
    }) as { plan: string; aiProvider: string; aiApiKeyEncrypted: string | null; aiUsageTokens: number } | null;
    if (!workspace) return null;

    const isPlatform = workspace.aiProvider !== 'BYOK';

    if (isPlatform) {
      // Check usage limit
      const limit = PLAN_TOKEN_LIMITS[workspace.plan] ?? PLAN_TOKEN_LIMITS['FREE'];
      if (workspace.aiUsageTokens >= limit) {
        throw new Error(
          `AI usage limit reached for this workspace (${workspace.aiUsageTokens}/${limit} tokens used on ${workspace.plan} plan). Upgrade to Pro or Enterprise for higher limits.`,
        );
      }
      if (!this.client) return null; // system key not configured
      return { client: this.client, isplatform: true, workspaceId };
    } else {
      // BYOK
      if (!workspace.aiApiKeyEncrypted) {
        throw new Error('BYOK is selected but no API key has been configured. Please add your API key in Workspace Settings → AI Configuration.');
      }
      let decryptedKey: string;
      try {
        decryptedKey = this.encryption.decrypt(workspace.aiApiKeyEncrypted);
      } catch {
        throw new Error('Failed to decrypt workspace API key. Please re-enter your API key in Workspace Settings → AI Configuration.');
      }
      const byokClient = new Anthropic({ apiKey: decryptedKey });
      return { client: byokClient, isplatform: false, workspaceId };
    }
  }

  private async trackUsage(workspaceId: string, tokens: number): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.prisma.workspace as any).update({
        where: { id: workspaceId },
        data: { aiUsageTokens: { increment: tokens } },
      });
    } catch {
      // Non-fatal — log but don't fail the request
      this.logger.warn(`Failed to track AI usage for workspace ${workspaceId}`);
    }
  }

  // ---------------------------------------------------------------- //
  // extractDocument
  // ---------------------------------------------------------------- //
  async extractDocument(documentId: string): Promise<AiExtractionResult> {
    // Step 1: Mark as running
    await this.upsertMeta(documentId, AI_KEYS.STATUS, 'running');

    try {
      // Step 2: Fetch document + searchContent
      const doc = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: { searchContent: true, metadata: true },
      });
      if (!doc) throw new NotFoundException(`Document ${documentId} not found`);

      // Step 3: Get workspace-appropriate client (handles platform limits + BYOK)
      const routing = await this.getClientForWorkspace(doc.workspaceId);
      if (!routing) {
        await this.upsertMeta(documentId, AI_KEYS.STATUS, 'disabled');
        return this.buildDisabledResult();
      }
      const activeClient = routing.client;

      const text = doc.searchContent?.extractedText ?? '';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const storageKey: string = (doc as any).storageKey ?? '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mimeType: string = (doc as any).mimeType ?? '';
      const hasUsefulText = text.trim().length > 100;

      // Image types that Claude Vision supports natively
      const VISION_IMAGE_TYPES = new Set([
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      ]);
      const isVisionImage = VISION_IMAGE_TYPES.has(mimeType);
      const isPdf = mimeType === 'application/pdf';

      // PDFs: ALWAYS send the raw file via Document API — pdf-parse text loses
      // all layout context (tables, columns, headers), giving Claude garbage to parse.
      // Claude's Document API reads the actual PDF with full fidelity.
      const useVisionImage = isVisionImage && !hasUsefulText && !!storageKey;
      const useDocumentPdf = isPdf && !!storageKey;
      const needsFile = useVisionImage || useDocumentPdf;

      const EXTRACTION_JSON_SCHEMA = `Return exactly this JSON structure (use null for missing fields, YYYY-MM-DD for all dates):
{
  "documentType": "contract|invoice|insurance|certification|license|id|policy|agreement|report|receipt|other",
  "title": "string or null",
  "issuer": "string or null",
  "counterparty": "string or null",
  "contractNumber": "string or null",
  "policyNumber": "string or null",
  "certificateNumber": "string or null",
  "referenceNumber": "string or null",
  "issueDate": "YYYY-MM-DD or null",
  "effectiveDate": "YYYY-MM-DD or null",
  "expiryDate": "YYYY-MM-DD or null",
  "renewalDueDate": "YYYY-MM-DD or null",
  "summary": "string",
  "keyPoints": ["string"],
  "suggestedTags": ["string"],
  "suggestedFolder": "string or null",
  "riskFlags": ["string"],
  "overallConfidence": 0.85,
  "dateConfidence": 0.9
}`;

      const promptText = `Respond with ONLY a valid JSON object. No text before or after. No markdown. No code blocks.

You are a document metadata extraction engine. Extract structured information from the document.

Extract ANY expiration/expiry/valid until/valid through/expires on date as expiryDate in YYYY-MM-DD format. This is the most important field.

Document name: ${doc.name}
Document type hint: ${doc.fileType}${!needsFile ? `\nContent (first 4000 chars):\n${text.slice(0, 4000)}` : ''}

${EXTRACTION_JSON_SCHEMA}`;

      let messageContent: Anthropic.MessageParam['content'] = promptText;

      if (needsFile) {
        const filePath = path.join(process.cwd(), 'uploads', storageKey);
        try {
          const fileBase64 = fs.readFileSync(filePath).toString('base64');

          if (useVisionImage) {
            // Send image via Vision API
            const safeMediaType = VISION_IMAGE_TYPES.has(mimeType)
              ? (mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp')
              : 'image/jpeg';
            messageContent = [
              {
                type: 'image',
                source: { type: 'base64', media_type: safeMediaType, data: fileBase64 },
              },
              { type: 'text', text: promptText },
            ];
          } else if (useDocumentPdf) {
            // Send scanned PDF via Document API (Claude reads PDF natively)
            messageContent = [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 },
              } as Anthropic.DocumentBlockParam,
              { type: 'text', text: promptText },
            ];
          }
        } catch {
          this.logger.warn(`File read failed for ${storageKey} — falling back to text-only extraction`);
        }
      }

      const message = await activeClient.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: messageContent }],
      });

      // Step 4: Parse JSON response carefully
      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected AI response type');
      }

      let extracted: Record<string, unknown>;
      try {
        // Try direct parse first, then fall back to regex extraction
        const trimmed = content.text.trim();
        if (trimmed.startsWith('{')) {
          extracted = JSON.parse(trimmed);
        } else {
          const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No JSON object found in AI response');
          extracted = JSON.parse(jsonMatch[0]);
        }
      } catch (parseErr) {
        throw new Error(
          `Failed to parse AI JSON response: ${(parseErr as Error).message}`,
        );
      }

      // Step 5: Store all extracted fields as individual ai:* metadata entries
      const expiryDate = isValidDate(extracted.expiryDate)
        ? extracted.expiryDate
        : null;
      const renewalDueDate = isValidDate(extracted.renewalDueDate)
        ? extracted.renewalDueDate
        : null;
      const issueDate = isValidDate(extracted.issueDate)
        ? extracted.issueDate
        : null;
      const effectiveDate = isValidDate(extracted.effectiveDate)
        ? extracted.effectiveDate
        : null;
      const overallConfidence = safeNumber(extracted.overallConfidence, 0);
      const dateConfidence = safeNumber(extracted.dateConfidence, 0);

      const metaEntries: [string, string][] = [
        [AI_KEYS.DOCUMENT_TYPE, safeString(extracted.documentType) ?? 'other'],
        [AI_KEYS.TITLE, safeString(extracted.title) ?? ''],
        [AI_KEYS.ISSUER, safeString(extracted.issuer) ?? ''],
        [AI_KEYS.COUNTERPARTY, safeString(extracted.counterparty) ?? ''],
        [AI_KEYS.CONTRACT_NUMBER, safeString(extracted.contractNumber) ?? ''],
        [AI_KEYS.POLICY_NUMBER, safeString(extracted.policyNumber) ?? ''],
        [
          AI_KEYS.CERTIFICATE_NUMBER,
          safeString(extracted.certificateNumber) ?? '',
        ],
        [AI_KEYS.REFERENCE_NUMBER, safeString(extracted.referenceNumber) ?? ''],
        [AI_KEYS.ISSUE_DATE, issueDate ?? ''],
        [AI_KEYS.EFFECTIVE_DATE, effectiveDate ?? ''],
        [AI_KEYS.EXPIRY_DATE, expiryDate ?? ''],
        [AI_KEYS.RENEWAL_DATE, renewalDueDate ?? ''],
        [AI_KEYS.SUMMARY, safeString(extracted.summary) ?? ''],
        [
          AI_KEYS.KEY_POINTS,
          JSON.stringify(safeStringArray(extracted.keyPoints)),
        ],
        [
          AI_KEYS.SUGGESTED_TAGS,
          JSON.stringify(safeStringArray(extracted.suggestedTags)),
        ],
        [AI_KEYS.SUGGESTED_FOLDER, safeString(extracted.suggestedFolder) ?? ''],
        [
          AI_KEYS.RISK_FLAGS,
          JSON.stringify(safeStringArray(extracted.riskFlags)),
        ],
        [AI_KEYS.OVERALL_CONFIDENCE, String(overallConfidence)],
        [AI_KEYS.DATE_CONFIDENCE, String(dateConfidence)],
      ];

      for (const [key, value] of metaEntries) {
        await this.upsertMeta(documentId, key, value);
      }

      // Step 6: Set status to done and record extractedAt
      const extractedAt = new Date().toISOString();
      await this.upsertMeta(documentId, AI_KEYS.STATUS, 'done');
      await this.upsertMeta(documentId, AI_KEYS.EXTRACTED_AT, extractedAt);

      // Step 7: Auto-apply high-confidence fields (overallConfidence >= 0.8)
      const appliedFields: string[] = [];

      if (overallConfidence >= 0.8) {
        // Determine which fields were previously AI-applied (can be overwritten)
        const existingAppliedMeta = doc.metadata.find(
          (m) => m.key === AI_KEYS.APPLIED_FIELDS,
        );
        const previouslyApplied: string[] = existingAppliedMeta
          ? (() => {
              try {
                return JSON.parse(existingAppliedMeta.value) as string[];
              } catch {
                return [];
              }
            })()
          : [];

        const updateData: {
          expiryDate?: Date;
          renewalDueDate?: Date;
        } = {};

        // Auto-apply expiryDate if: doc has none OR it was previously AI-set
        if (expiryDate) {
          if (
            doc.expiryDate === null ||
            previouslyApplied.includes('expiryDate')
          ) {
            updateData.expiryDate = new Date(expiryDate);
            appliedFields.push('expiryDate');
          }
        }

        // Auto-apply renewalDueDate if: doc has none OR it was previously AI-set
        if (renewalDueDate) {
          if (
            doc.renewalDueDate === null ||
            previouslyApplied.includes('renewalDueDate')
          ) {
            updateData.renewalDueDate = new Date(renewalDueDate);
            appliedFields.push('renewalDueDate');
          }
        }

        if (Object.keys(updateData).length > 0) {
          await this.prisma.document.update({
            where: { id: documentId },
            data: updateData,
          });
        }
      }

      // Record applied fields (merge with any existing)
      await this.upsertMeta(
        documentId,
        AI_KEYS.APPLIED_FIELDS,
        JSON.stringify(appliedFields),
      );

      // Track token usage for platform AI
      if (routing.isplatform) {
        const totalTokens = message.usage.input_tokens + message.usage.output_tokens;
        await this.trackUsage(doc.workspaceId, totalTokens);
      }

      // Step 9: Return full AiExtractionResult
      return {
        status: 'done',
        documentType: safeString(extracted.documentType),
        title: safeString(extracted.title),
        issuer: safeString(extracted.issuer),
        counterparty: safeString(extracted.counterparty),
        contractNumber: safeString(extracted.contractNumber),
        policyNumber: safeString(extracted.policyNumber),
        certificateNumber: safeString(extracted.certificateNumber),
        referenceNumber: safeString(extracted.referenceNumber),
        issueDate,
        effectiveDate,
        expiryDate,
        renewalDueDate,
        summary: safeString(extracted.summary),
        keyPoints: safeStringArray(extracted.keyPoints),
        suggestedTags: safeStringArray(extracted.suggestedTags),
        suggestedFolder: safeString(extracted.suggestedFolder),
        riskFlags: safeStringArray(extracted.riskFlags),
        overallConfidence,
        dateConfidence,
        extractedAt,
        appliedFields,
        error: null,
      };
    } catch (err) {
      // Step 8: On error set ai:status = 'failed', ai:error = message
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error during extraction';
      this.logger.error(`extractDocument failed for ${documentId}: ${errorMessage}`);

      try {
        await this.upsertMeta(documentId, AI_KEYS.STATUS, 'failed');
        await this.upsertMeta(documentId, AI_KEYS.ERROR, errorMessage);
      } catch (metaErr) {
        this.logger.error(
          `Failed to write error metadata: ${(metaErr as Error).message}`,
        );
      }

      return {
        status: 'failed',
        documentType: null,
        title: null,
        issuer: null,
        counterparty: null,
        contractNumber: null,
        policyNumber: null,
        certificateNumber: null,
        referenceNumber: null,
        issueDate: null,
        effectiveDate: null,
        expiryDate: null,
        renewalDueDate: null,
        summary: null,
        keyPoints: [],
        suggestedTags: [],
        suggestedFolder: null,
        riskFlags: [],
        overallConfidence: 0,
        dateConfidence: 0,
        extractedAt: null,
        appliedFields: [],
        error: errorMessage,
      };
    }
  }

  // ---------------------------------------------------------------- //
  // getExtraction
  // ---------------------------------------------------------------- //
  async getExtraction(documentId: string): Promise<AiExtractionResult | null> {
    const metaRows = await this.prisma.documentMetadata.findMany({
      where: { documentId, key: { startsWith: 'ai:' } },
    });

    if (metaRows.length === 0) return null;

    const meta = new Map<string, string>(
      metaRows.map((r) => [r.key, r.value]),
    );

    const status = (meta.get(AI_KEYS.STATUS) ?? 'none') as AiExtractionResult['status'];

    const parseJsonArray = (key: string): string[] => {
      const raw = meta.get(key);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    return {
      status,
      documentType: meta.get(AI_KEYS.DOCUMENT_TYPE) || null,
      title: meta.get(AI_KEYS.TITLE) || null,
      issuer: meta.get(AI_KEYS.ISSUER) || null,
      counterparty: meta.get(AI_KEYS.COUNTERPARTY) || null,
      contractNumber: meta.get(AI_KEYS.CONTRACT_NUMBER) || null,
      policyNumber: meta.get(AI_KEYS.POLICY_NUMBER) || null,
      certificateNumber: meta.get(AI_KEYS.CERTIFICATE_NUMBER) || null,
      referenceNumber: meta.get(AI_KEYS.REFERENCE_NUMBER) || null,
      issueDate: isValidDate(meta.get(AI_KEYS.ISSUE_DATE))
        ? (meta.get(AI_KEYS.ISSUE_DATE) as string)
        : null,
      effectiveDate: isValidDate(meta.get(AI_KEYS.EFFECTIVE_DATE))
        ? (meta.get(AI_KEYS.EFFECTIVE_DATE) as string)
        : null,
      expiryDate: isValidDate(meta.get(AI_KEYS.EXPIRY_DATE))
        ? (meta.get(AI_KEYS.EXPIRY_DATE) as string)
        : null,
      renewalDueDate: isValidDate(meta.get(AI_KEYS.RENEWAL_DATE))
        ? (meta.get(AI_KEYS.RENEWAL_DATE) as string)
        : null,
      summary: meta.get(AI_KEYS.SUMMARY) || null,
      keyPoints: parseJsonArray(AI_KEYS.KEY_POINTS),
      suggestedTags: parseJsonArray(AI_KEYS.SUGGESTED_TAGS),
      suggestedFolder: meta.get(AI_KEYS.SUGGESTED_FOLDER) || null,
      riskFlags: parseJsonArray(AI_KEYS.RISK_FLAGS),
      overallConfidence: safeNumber(meta.get(AI_KEYS.OVERALL_CONFIDENCE), 0),
      dateConfidence: safeNumber(meta.get(AI_KEYS.DATE_CONFIDENCE), 0),
      extractedAt: meta.get(AI_KEYS.EXTRACTED_AT) || null,
      appliedFields: parseJsonArray(AI_KEYS.APPLIED_FIELDS),
      error: meta.get(AI_KEYS.ERROR) || null,
    };
  }

  // ---------------------------------------------------------------- //
  // applyFields
  // ---------------------------------------------------------------- //
  async applyFields(
    documentId: string,
    fields: string[],
  ): Promise<{ applied: string[]; skipped: string[] }> {
    const applied: string[] = [];
    const skipped: string[] = [];

    // Fetch extraction metadata and current document
    const [metaRows, doc] = await Promise.all([
      this.prisma.documentMetadata.findMany({
        where: { documentId, key: { startsWith: 'ai:' } },
      }),
      this.prisma.document.findUnique({ where: { id: documentId } }),
    ]);

    if (!doc) throw new NotFoundException(`Document ${documentId} not found`);

    const meta = new Map<string, string>(
      metaRows.map((r) => [r.key, r.value]),
    );

    const appliedMeta = meta.get(AI_KEYS.APPLIED_FIELDS);
    const existingApplied: string[] = appliedMeta
      ? (() => {
          try {
            return JSON.parse(appliedMeta) as string[];
          } catch {
            return [];
          }
        })()
      : [];

    const updateData: {
      expiryDate?: Date | null;
      renewalDueDate?: Date | null;
      isReminderEnabled?: boolean;
    } = {};

    const supportedFields = new Set(['expiryDate', 'renewalDueDate', 'isReminderEnabled']);

    for (const field of fields) {
      if (!supportedFields.has(field)) {
        skipped.push(field);
        continue;
      }

      if (field === 'expiryDate') {
        const rawDate = meta.get(AI_KEYS.EXPIRY_DATE);
        if (isValidDate(rawDate)) {
          updateData.expiryDate = new Date(rawDate);
          applied.push(field);
        } else {
          skipped.push(field);
        }
        continue;
      }

      if (field === 'renewalDueDate') {
        const rawDate = meta.get(AI_KEYS.RENEWAL_DATE);
        if (isValidDate(rawDate)) {
          updateData.renewalDueDate = new Date(rawDate);
          applied.push(field);
        } else {
          skipped.push(field);
        }
        continue;
      }

      if (field === 'isReminderEnabled') {
        // Enable reminder if there is an expiryDate or renewalDueDate extracted
        const hasExpiry =
          isValidDate(meta.get(AI_KEYS.EXPIRY_DATE)) ||
          isValidDate(meta.get(AI_KEYS.RENEWAL_DATE));
        if (hasExpiry) {
          updateData.isReminderEnabled = true;
          applied.push(field);
        } else {
          skipped.push(field);
        }
        continue;
      }
    }

    // Apply updates to document
    if (Object.keys(updateData).length > 0) {
      await this.prisma.document.update({
        where: { id: documentId },
        data: updateData,
      });
    }

    // Update ai:appliedFields — merge applied fields (avoid duplicates)
    const newApplied = Array.from(new Set([...existingApplied, ...applied]));
    await this.upsertMeta(
      documentId,
      AI_KEYS.APPLIED_FIELDS,
      JSON.stringify(newApplied),
    );

    return { applied, skipped };
  }

  // ---------------------------------------------------------------- //
  // generateReportInsights
  // ---------------------------------------------------------------- //
  async generateReportInsights(
    workspaceId: string,
    reportType: string,
    data: Record<string, unknown>,
  ): Promise<{
    summary: string;
    insights: string[];
    recommendations: string[];
    urgentItems: string[];
  }> {
    // Get workspace-appropriate client (handles platform limits + BYOK)
    const routing = await this.getClientForWorkspace(workspaceId);
    if (!routing) {
      return {
        summary:
          'AI report insights unavailable — ANTHROPIC_API_KEY not configured.',
        insights: [],
        recommendations: [],
        urgentItems: [],
      };
    }

    const prompt = `You are a document management analyst for workspace ${workspaceId}. Here is the actual data. Analyze it and generate insights.

Report type: ${reportType}

Actual data:
${JSON.stringify(data, null, 2).slice(0, 3000)}

Based on the numbers, dates, and information above, generate concrete, actionable insights. Do not ask for more data — you have everything you need.

Respond with ONLY this JSON structure. No text before or after. No markdown. No code blocks.
{
  "summary": "2-3 sentence executive summary based on the actual numbers provided",
  "insights": ["specific insight referencing actual data points", "insight 2", "insight 3"],
  "recommendations": ["actionable recommendation 1", "recommendation 2"],
  "urgentItems": ["item needing immediate attention based on data", "urgent item 2"]
}`;

    const message = await routing.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 768,
      messages: [{ role: 'user', content: prompt }],
    });

    // Track token usage for platform AI
    if (routing.isplatform) {
      const totalTokens = message.usage.input_tokens + message.usage.output_tokens;
      await this.trackUsage(workspaceId, totalTokens);
    }

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected AI response type');

    try {
      const trimmed = content.text.trim();
      let parsed: Record<string, unknown>;
      if (trimmed.startsWith('{')) {
        parsed = JSON.parse(trimmed);
      } else {
        const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in response');
        parsed = JSON.parse(jsonMatch[0]);
      }

      return {
        summary:
          typeof parsed.summary === 'string'
            ? parsed.summary
            : 'Report generated.',
        insights: safeStringArray(parsed.insights),
        recommendations: safeStringArray(parsed.recommendations),
        urgentItems: safeStringArray(parsed.urgentItems),
      };
    } catch {
      return {
        summary: content.text.slice(0, 300),
        insights: [],
        recommendations: [],
        urgentItems: [],
      };
    }
  }

  // ---------------------------------------------------------------- //
  // Existing methods (preserved)
  // ---------------------------------------------------------------- //
  async analyzeDocument(documentId: string): Promise<{
    summary: string;
    keyPoints: string[];
    suggestedTags: string[];
    documentType: string;
    confidence: number;
  }> {
    if (!this.client) {
      return {
        summary: 'AI analysis unavailable — ANTHROPIC_API_KEY not configured.',
        keyPoints: [],
        suggestedTags: [],
        documentType: 'unknown',
        confidence: 0,
      };
    }

    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { searchContent: true, tags: { include: { tag: true } } },
    });
    if (!doc) throw new NotFoundException(`Document ${documentId} not found`);

    const text = doc.searchContent?.extractedText ?? '';
    const prompt = `You are a document analyst. Analyze the following document and respond with JSON only.

Document name: ${doc.name}
Document type: ${doc.fileType}
Content excerpt (first 3000 chars): ${text.slice(0, 3000)}

Respond with this exact JSON structure:
{
  "summary": "2-3 sentence summary of the document",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "suggestedTags": ["tag1", "tag2"],
  "documentType": "contract|invoice|report|policy|agreement|other",
  "confidence": 0.85
}`;

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected AI response type');

    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      return JSON.parse(jsonMatch[0]);
    } catch {
      return {
        summary: content.text.slice(0, 200),
        keyPoints: [],
        suggestedTags: [],
        documentType: 'unknown',
        confidence: 0.3,
      };
    }
  }

  async searchAssistant(
    workspaceId: string,
    question: string,
  ): Promise<{
    answer: string;
    relevantDocuments: { id: string; name: string }[];
  }> {
    if (!this.client) {
      return {
        answer: 'AI search unavailable — ANTHROPIC_API_KEY not configured.',
        relevantDocuments: [],
      };
    }

    const docs = await this.prisma.document.findMany({
      where: { workspaceId, status: 'ACTIVE' },
      include: { searchContent: true },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const docContext = docs
      .filter((d) => d.searchContent?.extractedText)
      .slice(0, 10)
      .map(
        (d) =>
          `[${d.id}] ${d.name}: ${d.searchContent!.extractedText.slice(0, 500)}`,
      )
      .join('\n\n');

    const prompt = `You are a document search assistant. Answer the user's question based on the documents below.

Question: ${question}

Available documents:
${docContext || 'No indexed documents found.'}

Respond with JSON:
{
  "answer": "Your helpful answer here",
  "relevantDocumentIds": ["id1", "id2"]
}`;

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected AI response');

    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');
      const parsed = JSON.parse(jsonMatch[0]);
      const relevantDocuments = docs
        .filter((d) => (parsed.relevantDocumentIds ?? []).includes(d.id))
        .map((d) => ({ id: d.id, name: d.name }));
      return { answer: parsed.answer ?? content.text, relevantDocuments };
    } catch {
      return { answer: content.text.slice(0, 400), relevantDocuments: [] };
    }
  }

  async generateReport(
    type: string,
    data: Record<string, unknown>,
  ): Promise<{
    title: string;
    summary: string;
    insights: string[];
    recommendations: string[];
  }> {
    if (!this.client) {
      return {
        title: `${type} Report`,
        summary:
          'AI report generation unavailable — ANTHROPIC_API_KEY not configured.',
        insights: [],
        recommendations: [],
      };
    }

    const prompt = `You are a document management analyst. Generate an executive summary report based on this data.

Report type: ${type}
Data: ${JSON.stringify(data, null, 2).slice(0, 2000)}

Respond with JSON:
{
  "title": "Report title",
  "summary": "2-3 sentence executive summary",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected AI response');

    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');
      return JSON.parse(jsonMatch[0]);
    } catch {
      return {
        title: `${type} Report`,
        summary: content.text.slice(0, 300),
        insights: [],
        recommendations: [],
      };
    }
  }

  // ---------------------------------------------------------------- //
  // Private helpers
  // ---------------------------------------------------------------- //
  private buildDisabledResult(): AiExtractionResult {
    return {
      status: 'disabled',
      documentType: null,
      title: null,
      issuer: null,
      counterparty: null,
      contractNumber: null,
      policyNumber: null,
      certificateNumber: null,
      referenceNumber: null,
      issueDate: null,
      effectiveDate: null,
      expiryDate: null,
      renewalDueDate: null,
      summary: null,
      keyPoints: [],
      suggestedTags: [],
      suggestedFolder: null,
      riskFlags: [],
      overallConfidence: 0,
      dateConfidence: 0,
      extractedAt: null,
      appliedFields: [],
      error: null,
    };
  }
}
