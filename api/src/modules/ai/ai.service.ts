import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { PLAN_TOKEN_LIMITS } from '../workspaces/dto/ai-settings.dto';
import { OcrService } from '../document-intelligence/ocr.service';
import { ExtractionService } from '../document-intelligence/extraction.service';
import type { ConfidenceByField } from '../document-intelligence/extraction.service';

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
  CONFIDENCE_BY_FIELD: 'ai:confidenceByField',
  OCR_PROVIDER: 'ai:ocrProvider',
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
  confidenceByField: ConfidenceByField;
  ocrProvider: string | null;
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
  if (typeof v === 'string') return v.trim() || null;
  return String(v).trim() || null;
}

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string');
}

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

function emptyConfidenceByField(): ConfidenceByField {
  return {
    documentType: 0, title: 0, issuer: 0, counterparty: 0,
    contractNumber: 0, policyNumber: 0, certificateNumber: 0, referenceNumber: 0,
    issueDate: 0, effectiveDate: 0, expiryDate: 0, renewalDueDate: 0,
    suggestedTags: 0, suggestedFolder: 0,
  };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic | null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly ocrService: OcrService,
    private readonly extractionService: ExtractionService,
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
      const limit = PLAN_TOKEN_LIMITS[workspace.plan] ?? PLAN_TOKEN_LIMITS['FREE'];
      if (workspace.aiUsageTokens >= limit) {
        throw new Error(
          `AI usage limit reached for this workspace (${workspace.aiUsageTokens}/${limit} tokens used on ${workspace.plan} plan). Upgrade to Pro or Enterprise for higher limits.`,
        );
      }
      if (!this.client) return null;
      return { client: this.client, isplatform: true, workspaceId };
    } else {
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
      this.logger.warn(`Failed to track AI usage for workspace ${workspaceId}`);
    }
  }

  // ---------------------------------------------------------------- //
  // extractDocument  — main pipeline
  // ---------------------------------------------------------------- //
  async extractDocument(documentId: string): Promise<AiExtractionResult> {
    await this.upsertMeta(documentId, AI_KEYS.STATUS, 'running');

    try {
      // ---- 1. Fetch document ---------------------------------------- //
      const doc = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: { searchContent: true, metadata: true },
      });
      if (!doc) throw new NotFoundException(`Document ${documentId} not found`);

      // ---- 2. Get workspace client ----------------------------------- //
      const routing = await this.getClientForWorkspace(doc.workspaceId);
      if (!routing) {
        await this.upsertMeta(documentId, AI_KEYS.STATUS, 'disabled');
        return this.buildDisabledResult();
      }

      // ---- 3. Read file buffer --------------------------------------- //
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const storageKey: string = (doc as any).storageKey ?? '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mimeType: string = (doc as any).mimeType ?? '';

      let fileBuffer: Buffer | null = null;
      if (storageKey) {
        const filePath = path.join(process.cwd(), 'uploads', storageKey);
        try {
          fileBuffer = fs.readFileSync(filePath);
        } catch {
          this.logger.warn(`extractDocument ${documentId}: could not read file ${storageKey}`);
        }
      }

      // ---- 4. OCR --------------------------------------------------- //
      let ocrOutput = fileBuffer
        ? await this.ocrService.extract(fileBuffer, mimeType, doc.name)
        : null;

      // Fallback: use existing searchContent text if OCR failed/unavailable
      if (!ocrOutput && doc.searchContent?.extractedText) {
        const fallbackText = doc.searchContent.extractedText.trim();
        if (fallbackText.length > 10) {
          ocrOutput = {
            provider: 'search-content-fallback',
            fullText: fallbackText,
            pages: [{ pageNumber: 1, text: fallbackText }],
            pageCount: 1,
            confidence: 0.7,
            processingTimeMs: 0,
          };
        }
      }

      if (!ocrOutput) {
        throw new Error('Could not extract text from document — no OCR provider succeeded and no cached text available.');
      }

      this.logger.log(
        `extractDocument ${documentId}: OCR via ${ocrOutput.provider}, ${ocrOutput.fullText.length} chars`,
      );

      // ---- 5. Structured extraction ---------------------------------- //
      const extracted = await this.extractionService.extract(
        ocrOutput,
        doc.name,
        routing.client, // Pass workspace-specific client for BYOK support
      );

      if (!extracted) {
        throw new Error('Structured extraction failed — no AI provider returned a valid result.');
      }

      // ---- 6. Persist metadata -------------------------------------- //
      const metaEntries: [string, string][] = [
        [AI_KEYS.DOCUMENT_TYPE, extracted.documentType ?? 'other'],
        [AI_KEYS.TITLE, extracted.title ?? ''],
        [AI_KEYS.ISSUER, extracted.issuer ?? ''],
        [AI_KEYS.COUNTERPARTY, extracted.counterparty ?? ''],
        [AI_KEYS.CONTRACT_NUMBER, extracted.contractNumber ?? ''],
        [AI_KEYS.POLICY_NUMBER, extracted.policyNumber ?? ''],
        [AI_KEYS.CERTIFICATE_NUMBER, extracted.certificateNumber ?? ''],
        [AI_KEYS.REFERENCE_NUMBER, extracted.referenceNumber ?? ''],
        [AI_KEYS.ISSUE_DATE, extracted.issueDate ?? ''],
        [AI_KEYS.EFFECTIVE_DATE, extracted.effectiveDate ?? ''],
        [AI_KEYS.EXPIRY_DATE, extracted.expiryDate ?? ''],
        [AI_KEYS.RENEWAL_DATE, extracted.renewalDueDate ?? ''],
        [AI_KEYS.SUMMARY, extracted.summary ?? ''],
        [AI_KEYS.KEY_POINTS, JSON.stringify(extracted.keyPoints)],
        [AI_KEYS.SUGGESTED_TAGS, JSON.stringify(extracted.suggestedTags)],
        [AI_KEYS.SUGGESTED_FOLDER, extracted.suggestedFolder ?? ''],
        [AI_KEYS.RISK_FLAGS, JSON.stringify(extracted.riskFlags)],
        [AI_KEYS.OVERALL_CONFIDENCE, String(extracted.overallConfidence)],
        [AI_KEYS.DATE_CONFIDENCE, String(extracted.dateConfidence)],
        [AI_KEYS.CONFIDENCE_BY_FIELD, JSON.stringify(extracted.confidenceByField)],
        [AI_KEYS.OCR_PROVIDER, ocrOutput.provider],
      ];

      for (const [key, value] of metaEntries) {
        await this.upsertMeta(documentId, key, value);
      }

      const extractedAt = new Date().toISOString();
      await this.upsertMeta(documentId, AI_KEYS.STATUS, 'done');
      await this.upsertMeta(documentId, AI_KEYS.EXTRACTED_AT, extractedAt);

      // ---- 7. Auto-apply high-confidence fields ---------------------- //
      const appliedFields: string[] = [];

      const autoApplyThreshold = 0.85;
      const cfb = extracted.confidenceByField;

      // Determine previously AI-applied fields (respect manual edits)
      const existingAppliedMeta = doc.metadata.find((m) => m.key === AI_KEYS.APPLIED_FIELDS);
      const previouslyApplied: string[] = existingAppliedMeta
        ? (() => { try { return JSON.parse(existingAppliedMeta.value) as string[]; } catch { return []; } })()
        : [];

      const updateData: {
        expiryDate?: Date;
        renewalDueDate?: Date;
      } = {};

      if (extracted.expiryDate && cfb.expiryDate >= autoApplyThreshold) {
        if (doc.expiryDate === null || previouslyApplied.includes('expiryDate')) {
          updateData.expiryDate = new Date(extracted.expiryDate);
          appliedFields.push('expiryDate');
        }
      }

      if (extracted.renewalDueDate && cfb.renewalDueDate >= autoApplyThreshold) {
        if ((doc as any).renewalDueDate === null || previouslyApplied.includes('renewalDueDate')) {
          updateData.renewalDueDate = new Date(extracted.renewalDueDate);
          appliedFields.push('renewalDueDate');
        }
      }

      if (Object.keys(updateData).length > 0) {
        await this.prisma.document.update({ where: { id: documentId }, data: updateData });
      }

      await this.upsertMeta(documentId, AI_KEYS.APPLIED_FIELDS, JSON.stringify(appliedFields));

      // Track token usage for platform clients
      // (We don't have token counts from ExtractionService; use a reasonable estimate)
      if (routing.isplatform) {
        const estimatedTokens = Math.ceil(ocrOutput.fullText.length / 4) + 1000;
        await this.trackUsage(doc.workspaceId, estimatedTokens);
      }

      return {
        status: 'done',
        documentType: extracted.documentType,
        title: extracted.title,
        issuer: extracted.issuer,
        counterparty: extracted.counterparty,
        contractNumber: extracted.contractNumber,
        policyNumber: extracted.policyNumber,
        certificateNumber: extracted.certificateNumber,
        referenceNumber: extracted.referenceNumber,
        issueDate: extracted.issueDate,
        effectiveDate: extracted.effectiveDate,
        expiryDate: extracted.expiryDate,
        renewalDueDate: extracted.renewalDueDate,
        summary: extracted.summary,
        keyPoints: extracted.keyPoints,
        suggestedTags: extracted.suggestedTags,
        suggestedFolder: extracted.suggestedFolder,
        riskFlags: extracted.riskFlags,
        overallConfidence: extracted.overallConfidence,
        dateConfidence: extracted.dateConfidence,
        confidenceByField: extracted.confidenceByField,
        ocrProvider: ocrOutput.provider,
        extractedAt,
        appliedFields,
        error: null,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during extraction';
      this.logger.error(`extractDocument failed for ${documentId}: ${errorMessage}`);

      try {
        await this.upsertMeta(documentId, AI_KEYS.STATUS, 'failed');
        await this.upsertMeta(documentId, AI_KEYS.ERROR, errorMessage);
      } catch (metaErr) {
        this.logger.error(`Failed to write error metadata: ${(metaErr as Error).message}`);
      }

      return this.buildFailedResult(errorMessage);
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

    const meta = new Map<string, string>(metaRows.map((r) => [r.key, r.value]));

    const status = (meta.get(AI_KEYS.STATUS) ?? 'none') as AiExtractionResult['status'];

    const parseJsonArray = (key: string): string[] => {
      const raw = meta.get(key);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
    };

    const parseConfidenceByField = (): ConfidenceByField => {
      const raw = meta.get(AI_KEYS.CONFIDENCE_BY_FIELD);
      if (!raw) return emptyConfidenceByField();
      try {
        return JSON.parse(raw) as ConfidenceByField;
      } catch { return emptyConfidenceByField(); }
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
      issueDate: isValidDate(meta.get(AI_KEYS.ISSUE_DATE)) ? (meta.get(AI_KEYS.ISSUE_DATE) as string) : null,
      effectiveDate: isValidDate(meta.get(AI_KEYS.EFFECTIVE_DATE)) ? (meta.get(AI_KEYS.EFFECTIVE_DATE) as string) : null,
      expiryDate: isValidDate(meta.get(AI_KEYS.EXPIRY_DATE)) ? (meta.get(AI_KEYS.EXPIRY_DATE) as string) : null,
      renewalDueDate: isValidDate(meta.get(AI_KEYS.RENEWAL_DATE)) ? (meta.get(AI_KEYS.RENEWAL_DATE) as string) : null,
      summary: meta.get(AI_KEYS.SUMMARY) || null,
      keyPoints: parseJsonArray(AI_KEYS.KEY_POINTS),
      suggestedTags: parseJsonArray(AI_KEYS.SUGGESTED_TAGS),
      suggestedFolder: meta.get(AI_KEYS.SUGGESTED_FOLDER) || null,
      riskFlags: parseJsonArray(AI_KEYS.RISK_FLAGS),
      overallConfidence: safeNumber(meta.get(AI_KEYS.OVERALL_CONFIDENCE), 0),
      dateConfidence: safeNumber(meta.get(AI_KEYS.DATE_CONFIDENCE), 0),
      confidenceByField: parseConfidenceByField(),
      ocrProvider: meta.get(AI_KEYS.OCR_PROVIDER) || null,
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

    const [metaRows, doc] = await Promise.all([
      this.prisma.documentMetadata.findMany({
        where: { documentId, key: { startsWith: 'ai:' } },
      }),
      this.prisma.document.findUnique({ where: { id: documentId } }),
    ]);

    if (!doc) throw new NotFoundException(`Document ${documentId} not found`);

    const meta = new Map<string, string>(metaRows.map((r) => [r.key, r.value]));

    const appliedMeta = meta.get(AI_KEYS.APPLIED_FIELDS);
    const existingApplied: string[] = appliedMeta
      ? (() => { try { return JSON.parse(appliedMeta) as string[]; } catch { return []; } })()
      : [];

    const updateData: {
      expiryDate?: Date | null;
      renewalDueDate?: Date | null;
      isReminderEnabled?: boolean;
      folderId?: string | null;
    } = {};

    const supportedFields = new Set([
      'expiryDate', 'renewalDueDate', 'isReminderEnabled', 'suggestedTags', 'suggestedFolder',
    ]);

    for (const field of fields) {
      if (!supportedFields.has(field)) {
        skipped.push(field);
        continue;
      }

      if (field === 'expiryDate') {
        const rawDate = meta.get(AI_KEYS.EXPIRY_DATE);
        if (isValidDate(rawDate)) {
          updateData.expiryDate = new Date(rawDate as string);
          applied.push(field);
        } else {
          skipped.push(field);
        }
        continue;
      }

      if (field === 'renewalDueDate') {
        const rawDate = meta.get(AI_KEYS.RENEWAL_DATE);
        if (isValidDate(rawDate)) {
          updateData.renewalDueDate = new Date(rawDate as string);
          applied.push(field);
        } else {
          skipped.push(field);
        }
        continue;
      }

      if (field === 'isReminderEnabled') {
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

      if (field === 'suggestedTags') {
        const rawTags = meta.get(AI_KEYS.SUGGESTED_TAGS);
        const tagNames: string[] = rawTags
          ? (() => { try { return JSON.parse(rawTags) as string[]; } catch { return []; } })()
          : [];
        if (tagNames.length > 0) {
          const tagIds: string[] = [];
          for (const name of tagNames) {
            const trimmed = name.trim();
            if (!trimmed) continue;
            let tag = await this.prisma.documentTag.findFirst({
              where: { workspaceId: doc.workspaceId, name: { equals: trimmed, mode: 'insensitive' } },
            });
            if (!tag) {
              tag = await this.prisma.documentTag.create({
                data: { workspaceId: doc.workspaceId, name: trimmed },
              });
            }
            tagIds.push(tag.id);
          }
          await this.prisma.documentTagMapping.createMany({
            data: tagIds.map((tagId) => ({ documentId, tagId })),
            skipDuplicates: true,
          });
          applied.push(field);
        } else {
          skipped.push(field);
        }
        continue;
      }

      if (field === 'suggestedFolder') {
        const folderName = meta.get(AI_KEYS.SUGGESTED_FOLDER)?.trim();
        if (folderName) {
          let folder = await this.prisma.folder.findFirst({
            where: { workspaceId: doc.workspaceId, name: { equals: folderName, mode: 'insensitive' }, parentFolderId: null },
          });
          if (!folder) {
            folder = await this.prisma.folder.create({
              data: { workspaceId: doc.workspaceId, name: folderName, createdById: doc.ownerUserId },
            });
          }
          updateData.folderId = folder.id;
          applied.push(field);
        } else {
          skipped.push(field);
        }
        continue;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.document.update({ where: { id: documentId }, data: updateData });
    }

    const newApplied = Array.from(new Set([...existingApplied, ...applied]));
    await this.upsertMeta(documentId, AI_KEYS.APPLIED_FIELDS, JSON.stringify(newApplied));

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
    const routing = await this.getClientForWorkspace(workspaceId);
    if (!routing) {
      return {
        summary: 'AI insights unavailable — no AI provider configured for this workspace.',
        insights: [],
        recommendations: [],
        urgentItems: [],
      };
    }

    const dataJson = JSON.stringify(data, null, 2).slice(0, 4000);

    const prompt = `You are a document management analyst. You have been given ACTUAL data from the system database. Generate concrete, specific insights based on the numbers and information provided.

Report type: ${reportType}
Workspace ID: ${workspaceId}

ACTUAL DATA (this is real data from the database — do not claim you lack access):
${dataJson}

IMPORTANT: You have all the data you need above. Do not say "I don't have access" or "you would need to check". Generate insights based only on what is provided.

Generate a JSON response with specific insights referencing the actual numbers, dates, and items in the data above.

{
  "summary": "2-3 sentence executive summary using actual numbers from the data",
  "insights": [
    "Specific insight referencing actual data points (e.g. '5 documents expire within 30 days')",
    "Another specific insight with real numbers",
    "Third insight"
  ],
  "recommendations": [
    "Actionable recommendation based on the data",
    "Second recommendation"
  ],
  "urgentItems": [
    "Specific urgent item from the data (e.g. document name expiring on date)",
    "Another urgent item if applicable"
  ]
}

Respond with ONLY the JSON object. No markdown, no code blocks.`;

    const message = await routing.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

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
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'Report generated.',
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
        keyPoints: [], suggestedTags: [], documentType: 'unknown', confidence: 0,
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
        keyPoints: [], suggestedTags: [], documentType: 'unknown', confidence: 0.3,
      };
    }
  }

  async searchAssistant(
    workspaceId: string,
    question: string,
  ): Promise<{ answer: string; relevantDocuments: { id: string; name: string }[] }> {
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
      .map((d) => `[${d.id}] ${d.name}: ${d.searchContent!.extractedText.slice(0, 500)}`)
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
  ): Promise<{ title: string; summary: string; insights: string[]; recommendations: string[] }> {
    if (!this.client) {
      return {
        title: `${type} Report`,
        summary: 'AI report generation unavailable — ANTHROPIC_API_KEY not configured.',
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
      documentType: null, title: null, issuer: null, counterparty: null,
      contractNumber: null, policyNumber: null, certificateNumber: null, referenceNumber: null,
      issueDate: null, effectiveDate: null, expiryDate: null, renewalDueDate: null,
      summary: null, keyPoints: [], suggestedTags: [], suggestedFolder: null,
      riskFlags: [], overallConfidence: 0, dateConfidence: 0,
      confidenceByField: emptyConfidenceByField(), ocrProvider: null,
      extractedAt: null, appliedFields: [], error: null,
    };
  }

  private buildFailedResult(error: string): AiExtractionResult {
    return {
      status: 'failed',
      documentType: null, title: null, issuer: null, counterparty: null,
      contractNumber: null, policyNumber: null, certificateNumber: null, referenceNumber: null,
      issueDate: null, effectiveDate: null, expiryDate: null, renewalDueDate: null,
      summary: null, keyPoints: [], suggestedTags: [], suggestedFolder: null,
      riskFlags: [], overallConfidence: 0, dateConfidence: 0,
      confidenceByField: emptyConfidenceByField(), ocrProvider: null,
      extractedAt: null, appliedFields: [], error,
    };
  }
}
