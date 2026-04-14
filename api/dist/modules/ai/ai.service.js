"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = require("fs");
const path = require("path");
const sdk_1 = require("@anthropic-ai/sdk");
const prisma_service_1 = require("../../prisma/prisma.service");
const encryption_service_1 = require("../../common/services/encryption.service");
const ai_settings_dto_1 = require("../workspaces/dto/ai-settings.dto");
const ocr_service_1 = require("../document-intelligence/ocr.service");
const extraction_service_1 = require("../document-intelligence/extraction.service");
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
    USER_APPLIED_FIELDS: 'ai:userAppliedFields',
    ERROR: 'ai:error',
};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(v) {
    return typeof v === 'string' && DATE_RE.test(v);
}
function safeString(v) {
    if (v === null || v === undefined || v === '')
        return null;
    if (typeof v === 'string')
        return v.trim() || null;
    return String(v).trim() || null;
}
function safeStringArray(v) {
    if (!Array.isArray(v))
        return [];
    return v.filter((x) => typeof x === 'string');
}
function safeNumber(v, fallback = 0) {
    const n = Number(v);
    return isNaN(n) ? fallback : n;
}
function emptyConfidenceByField() {
    return {
        documentType: 0, title: 0, issuer: 0, counterparty: 0,
        contractNumber: 0, policyNumber: 0, certificateNumber: 0, referenceNumber: 0,
        issueDate: 0, effectiveDate: 0, expiryDate: 0, renewalDueDate: 0,
        suggestedTags: 0, suggestedFolder: 0,
    };
}
let AiService = AiService_1 = class AiService {
    constructor(config, prisma, encryption, ocrService, extractionService) {
        this.config = config;
        this.prisma = prisma;
        this.encryption = encryption;
        this.ocrService = ocrService;
        this.extractionService = extractionService;
        this.logger = new common_1.Logger(AiService_1.name);
        const apiKey = this.config.get('ANTHROPIC_API_KEY');
        this.client = apiKey ? new sdk_1.default({ apiKey }) : null;
        this.openaiApiKey = this.config.get('OPENAI_API_KEY') ?? null;
        if (!this.client && !this.openaiApiKey) {
            this.logger.warn('Neither ANTHROPIC_API_KEY nor OPENAI_API_KEY is set — AI features disabled');
        }
        else if (!this.client) {
            this.logger.log('ANTHROPIC_API_KEY not set — using OpenAI GPT-4o for extraction');
        }
    }
    get isEnabled() {
        return this.client !== null || !!this.openaiApiKey;
    }
    async upsertMeta(documentId, key, value) {
        await this.prisma.documentMetadata.upsert({
            where: { documentId_key: { documentId, key } },
            update: { value },
            create: { documentId, key, value },
        });
    }
    async getClientForWorkspace(workspaceId) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                plan: true,
                aiProvider: true,
                aiApiKeyEncrypted: true,
                aiUsageTokens: true,
            },
        });
        if (!workspace)
            return null;
        const isPlatform = workspace.aiProvider !== 'BYOK';
        if (isPlatform) {
            const limit = ai_settings_dto_1.PLAN_TOKEN_LIMITS[workspace.plan] ?? ai_settings_dto_1.PLAN_TOKEN_LIMITS['FREE'];
            if (workspace.aiUsageTokens >= limit) {
                throw new Error(`AI usage limit reached for this workspace (${workspace.aiUsageTokens}/${limit} tokens used on ${workspace.plan} plan). Upgrade to Pro or Enterprise for higher limits.`);
            }
            if (!this.client && !this.openaiApiKey) {
                this.logger.warn(`[extractDocument] No AI client available for workspace ${workspaceId} — both ANTHROPIC_API_KEY and OPENAI_API_KEY are missing`);
                return null;
            }
            return { client: this.client, isplatform: true, workspaceId };
        }
        else {
            if (!workspace.aiApiKeyEncrypted) {
                throw new Error('BYOK is selected but no API key has been configured. Please add your API key in Workspace Settings → AI Configuration.');
            }
            let decryptedKey;
            try {
                decryptedKey = this.encryption.decrypt(workspace.aiApiKeyEncrypted);
            }
            catch {
                throw new Error('Failed to decrypt workspace API key. Please re-enter your API key in Workspace Settings → AI Configuration.');
            }
            const byokClient = new sdk_1.default({ apiKey: decryptedKey });
            return { client: byokClient, isplatform: false, workspaceId };
        }
    }
    async trackUsage(workspaceId, tokens) {
        try {
            await this.prisma.workspace.update({
                where: { id: workspaceId },
                data: { aiUsageTokens: { increment: tokens } },
            });
        }
        catch {
            this.logger.warn(`Failed to track AI usage for workspace ${workspaceId}`);
        }
    }
    async extractDocument(documentId) {
        await this.upsertMeta(documentId, AI_KEYS.STATUS, 'running');
        try {
            const doc = await this.prisma.document.findUnique({
                where: { id: documentId },
                include: {
                    searchContent: true,
                    metadata: true,
                    versions: {
                        orderBy: { versionNumber: 'desc' },
                        take: 1,
                        select: { storageKey: true, mimeType: true },
                    },
                },
            });
            if (!doc)
                throw new common_1.NotFoundException(`Document ${documentId} not found`);
            const routing = await this.getClientForWorkspace(doc.workspaceId);
            if (!routing) {
                await this.upsertMeta(documentId, AI_KEYS.STATUS, 'disabled');
                return this.buildDisabledResult();
            }
            const currentVersion = doc.versions[0] ?? null;
            const storageKey = currentVersion?.storageKey ?? '';
            const mimeType = currentVersion?.mimeType ?? '';
            this.logger.log(`extractDocument ${documentId}: storageKey="${storageKey}" mimeType="${mimeType}"`);
            let fileBuffer = null;
            if (storageKey) {
                const segments = storageKey
                    .split('/')
                    .filter((s) => s.length > 0 && s !== '..' && s !== '.');
                const filePath = path.join(process.cwd(), 'uploads', ...segments);
                try {
                    fileBuffer = fs.readFileSync(filePath);
                    this.logger.log(`extractDocument ${documentId}: read ${fileBuffer.length} bytes from ${filePath}`);
                }
                catch {
                    this.logger.warn(`extractDocument ${documentId}: could not read file at "${filePath}" — file may not exist yet`);
                }
            }
            else {
                this.logger.warn(`extractDocument ${documentId}: no storageKey found (document has ${doc.versions.length} version(s))`);
            }
            let ocrOutput = fileBuffer
                ? await this.ocrService.extract(fileBuffer, mimeType, doc.name)
                : null;
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
            this.logger.log(`extractDocument ${documentId}: OCR via ${ocrOutput.provider}, ${ocrOutput.fullText.length} chars`);
            const extracted = await this.extractionService.extract(ocrOutput, doc.name, routing.client ?? undefined);
            if (!extracted) {
                throw new Error('Structured extraction failed — no AI provider returned a valid result.');
            }
            const metaEntries = [
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
            const EXPIRY_AUTO_APPLY_THRESHOLD = 0.60;
            const cfb = extracted.confidenceByField;
            const userAppliedMeta = doc.metadata.find((m) => m.key === AI_KEYS.USER_APPLIED_FIELDS);
            const userAppliedFields = userAppliedMeta
                ? (() => { try {
                    return JSON.parse(userAppliedMeta.value);
                }
                catch {
                    return [];
                } })()
                : [];
            const prevAutoAppliedMeta = doc.metadata.find((m) => m.key === AI_KEYS.APPLIED_FIELDS);
            const prevAutoApplied = prevAutoAppliedMeta
                ? (() => { try {
                    return JSON.parse(prevAutoAppliedMeta.value);
                }
                catch {
                    return [];
                } })()
                : [];
            const autoApplied = [];
            const docUpdate = {};
            if (extracted.expiryDate) {
                const conf = cfb.expiryDate;
                const isUserConfirmed = userAppliedFields.includes('expiryDate');
                const wasAiApplied = prevAutoApplied.includes('expiryDate');
                this.logger.log(`[AutoFill] expiryDate=${extracted.expiryDate} conf=${conf.toFixed(2)} ` +
                    `userConfirmed=${isUserConfirmed} wasAiApplied=${wasAiApplied} docHasDate=${doc.expiryDate !== null}`);
                if (!isUserConfirmed && conf >= EXPIRY_AUTO_APPLY_THRESHOLD) {
                    if (doc.expiryDate === null || wasAiApplied) {
                        docUpdate.expiryDate = new Date(extracted.expiryDate);
                        autoApplied.push('expiryDate');
                        this.logger.log(`[AutoFill] ✓ Auto-saved expiryDate=${extracted.expiryDate} (conf=${conf.toFixed(2)})`);
                    }
                    else {
                        this.logger.log(`[AutoFill] Skipped expiryDate — user has manually set a date (protected)`);
                    }
                }
                else if (conf < EXPIRY_AUTO_APPLY_THRESHOLD) {
                    this.logger.log(`[AutoFill] expiryDate conf=${conf.toFixed(2)} below threshold — shown as suggestion only`);
                }
            }
            if (extracted.renewalDueDate) {
                const conf = cfb.renewalDueDate;
                const isUserConfirmed = userAppliedFields.includes('renewalDueDate');
                const wasAiApplied = prevAutoApplied.includes('renewalDueDate');
                this.logger.log(`[AutoFill] renewalDueDate=${extracted.renewalDueDate} conf=${conf.toFixed(2)} userConfirmed=${isUserConfirmed}`);
                if (!isUserConfirmed && conf >= EXPIRY_AUTO_APPLY_THRESHOLD) {
                    const docRenewal = doc.renewalDueDate;
                    if (docRenewal === null || wasAiApplied) {
                        docUpdate.renewalDueDate = new Date(extracted.renewalDueDate);
                        autoApplied.push('renewalDueDate');
                        this.logger.log(`[AutoFill] ✓ Auto-saved renewalDueDate=${extracted.renewalDueDate}`);
                    }
                }
            }
            if (Object.keys(docUpdate).length > 0) {
                await this.prisma.document.update({ where: { id: documentId }, data: docUpdate });
            }
            await this.upsertMeta(documentId, AI_KEYS.APPLIED_FIELDS, JSON.stringify(autoApplied));
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
                appliedFields: autoApplied,
                userAppliedFields,
                error: null,
            };
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error during extraction';
            this.logger.error(`extractDocument failed for ${documentId}: ${errorMessage}`);
            try {
                await this.upsertMeta(documentId, AI_KEYS.STATUS, 'failed');
                await this.upsertMeta(documentId, AI_KEYS.ERROR, errorMessage);
            }
            catch (metaErr) {
                this.logger.error(`Failed to write error metadata: ${metaErr.message}`);
            }
            return this.buildFailedResult(errorMessage);
        }
    }
    async getExtraction(documentId) {
        const metaRows = await this.prisma.documentMetadata.findMany({
            where: { documentId, key: { startsWith: 'ai:' } },
        });
        if (metaRows.length === 0)
            return null;
        const meta = new Map(metaRows.map((r) => [r.key, r.value]));
        const status = (meta.get(AI_KEYS.STATUS) ?? 'none');
        const parseJsonArray = (key) => {
            const raw = meta.get(key);
            if (!raw)
                return [];
            try {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            }
            catch {
                return [];
            }
        };
        const parseConfidenceByField = () => {
            const raw = meta.get(AI_KEYS.CONFIDENCE_BY_FIELD);
            if (!raw)
                return emptyConfidenceByField();
            try {
                return JSON.parse(raw);
            }
            catch {
                return emptyConfidenceByField();
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
            issueDate: isValidDate(meta.get(AI_KEYS.ISSUE_DATE)) ? meta.get(AI_KEYS.ISSUE_DATE) : null,
            effectiveDate: isValidDate(meta.get(AI_KEYS.EFFECTIVE_DATE)) ? meta.get(AI_KEYS.EFFECTIVE_DATE) : null,
            expiryDate: isValidDate(meta.get(AI_KEYS.EXPIRY_DATE)) ? meta.get(AI_KEYS.EXPIRY_DATE) : null,
            renewalDueDate: isValidDate(meta.get(AI_KEYS.RENEWAL_DATE)) ? meta.get(AI_KEYS.RENEWAL_DATE) : null,
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
            userAppliedFields: parseJsonArray(AI_KEYS.USER_APPLIED_FIELDS),
            error: meta.get(AI_KEYS.ERROR) || null,
        };
    }
    async applyFields(documentId, fields) {
        const applied = [];
        const skipped = [];
        const [metaRows, doc] = await Promise.all([
            this.prisma.documentMetadata.findMany({
                where: { documentId, key: { startsWith: 'ai:' } },
            }),
            this.prisma.document.findUnique({ where: { id: documentId } }),
        ]);
        if (!doc)
            throw new common_1.NotFoundException(`Document ${documentId} not found`);
        const meta = new Map(metaRows.map((r) => [r.key, r.value]));
        const appliedMeta = meta.get(AI_KEYS.APPLIED_FIELDS);
        const existingApplied = appliedMeta
            ? (() => { try {
                return JSON.parse(appliedMeta);
            }
            catch {
                return [];
            } })()
            : [];
        const updateData = {};
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
                    updateData.expiryDate = new Date(rawDate);
                    applied.push(field);
                }
                else {
                    skipped.push(field);
                }
                continue;
            }
            if (field === 'renewalDueDate') {
                const rawDate = meta.get(AI_KEYS.RENEWAL_DATE);
                if (isValidDate(rawDate)) {
                    updateData.renewalDueDate = new Date(rawDate);
                    applied.push(field);
                }
                else {
                    skipped.push(field);
                }
                continue;
            }
            if (field === 'isReminderEnabled') {
                const hasExpiry = isValidDate(meta.get(AI_KEYS.EXPIRY_DATE)) ||
                    isValidDate(meta.get(AI_KEYS.RENEWAL_DATE));
                if (hasExpiry) {
                    updateData.isReminderEnabled = true;
                    applied.push(field);
                }
                else {
                    skipped.push(field);
                }
                continue;
            }
            if (field === 'suggestedTags') {
                const rawTags = meta.get(AI_KEYS.SUGGESTED_TAGS);
                const tagNames = rawTags
                    ? (() => { try {
                        return JSON.parse(rawTags);
                    }
                    catch {
                        return [];
                    } })()
                    : [];
                if (tagNames.length > 0) {
                    const tagIds = [];
                    for (const name of tagNames) {
                        const trimmed = name.trim();
                        if (!trimmed)
                            continue;
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
                }
                else {
                    skipped.push(field);
                }
                continue;
            }
            if (field === 'suggestedFolder') {
                const folderName = meta.get(AI_KEYS.SUGGESTED_FOLDER)?.trim();
                if (folderName) {
                    const existingFolders = await this.prisma.folder.findMany({
                        where: { workspaceId: doc.workspaceId },
                        select: { id: true, name: true },
                    });
                    const canon = (s) => s.toLowerCase()
                        .replace(/&/g, 'and')
                        .replace(/[^a-z0-9\s]/g, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                    const targetCanon = canon(folderName);
                    let folder = existingFolders.find((f) => canon(f.name) === targetCanon)
                        ?? existingFolders.find((f) => canon(f.name).includes(targetCanon) || targetCanon.includes(canon(f.name)))
                        ?? null;
                    if (!folder) {
                        this.logger.log(`[ApplyFields] Creating new folder: "${folderName}"`);
                        folder = await this.prisma.folder.create({
                            data: { workspaceId: doc.workspaceId, name: folderName, createdById: doc.ownerUserId },
                        });
                    }
                    else {
                        this.logger.log(`[ApplyFields] Matched existing folder: "${folder.name}" for suggestion "${folderName}"`);
                    }
                    updateData.folderId = folder.id;
                    applied.push(field);
                }
                else {
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
        const userAppliedMeta = await this.prisma.documentMetadata.findFirst({
            where: { documentId, key: AI_KEYS.USER_APPLIED_FIELDS },
        });
        const existingUserApplied = userAppliedMeta
            ? (() => { try {
                return JSON.parse(userAppliedMeta.value);
            }
            catch {
                return [];
            } })()
            : [];
        const newUserApplied = Array.from(new Set([...existingUserApplied, ...applied]));
        await this.upsertMeta(documentId, AI_KEYS.USER_APPLIED_FIELDS, JSON.stringify(newUserApplied));
        this.logger.log(`[ApplyFields] doc=${documentId} | applied=[${applied.join(',')}] | skipped=[${skipped.join(',')}]`);
        return { applied, skipped };
    }
    async generateReportInsights(workspaceId, reportType, data) {
        const routing = await this.getClientForWorkspace(workspaceId);
        if (!routing) {
            return {
                summary: 'AI insights unavailable — no AI provider configured for this workspace.',
                insights: [],
                recommendations: [],
                urgentItems: [],
            };
        }
        const dataJson = JSON.stringify(data, null, 2).slice(0, 5000);
        const today = new Date().toISOString().slice(0, 10);
        const prompt = `You are a document management analyst. The JSON data below is LIVE data fetched directly from the database — it is complete and accurate.

Report type: ${reportType}
Today's date: ${today}

═══ LIVE DATABASE DATA ═══
${dataJson}
═══════════════════════════

RULES:
1. Use ONLY the data provided above. Do NOT say "I don't have access", "I cannot see", or "you should check".
2. Reference actual numbers: e.g. "5 of 23 documents expire within 30 days" not "some documents may expire".
3. For expiring_documents: name specific documents and their exact expiry dates from the items array.
4. For compliance_exposure: use the riskScore and the actual expired/expiringSoon counts.
5. urgentItems should list actual document names or specific findings — not generic advice.
6. If the data shows 0 issues (e.g. 0 expired documents), say so clearly. Do not invent problems.

Respond with ONLY this JSON object:
{
  "summary": "2-3 sentence executive summary with actual numbers from the data",
  "insights": [
    "Insight 1 with specific data reference",
    "Insight 2 with specific data reference",
    "Insight 3 with specific data reference"
  ],
  "recommendations": [
    "Actionable recommendation based on findings",
    "Second recommendation if applicable"
  ],
  "urgentItems": [
    "Specific urgent item (name, date, count) from the data",
    "Second urgent item if applicable"
  ]
}

No markdown. No code blocks. JSON only.`;
        let rawText;
        if (routing.client) {
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
            if (content.type !== 'text')
                throw new Error('Unexpected AI response type');
            rawText = content.text.trim();
        }
        else if (this.openaiApiKey) {
            const OpenAI = require('openai');
            const openai = new OpenAI.OpenAI({ apiKey: this.openaiApiKey });
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1024,
                temperature: 0,
                response_format: { type: 'json_object' },
            });
            rawText = response.choices[0]?.message?.content?.trim() ?? '';
        }
        else {
            return {
                summary: 'AI insights unavailable — no AI provider configured.',
                insights: [], recommendations: [], urgentItems: [],
            };
        }
        try {
            let parsed;
            if (rawText.startsWith('{')) {
                parsed = JSON.parse(rawText);
            }
            else {
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                if (!jsonMatch)
                    throw new Error('No JSON in response');
                parsed = JSON.parse(jsonMatch[0]);
            }
            return {
                summary: typeof parsed.summary === 'string' ? parsed.summary : 'Report generated.',
                insights: safeStringArray(parsed.insights),
                recommendations: safeStringArray(parsed.recommendations),
                urgentItems: safeStringArray(parsed.urgentItems),
            };
        }
        catch {
            return {
                summary: rawText.slice(0, 300),
                insights: [],
                recommendations: [],
                urgentItems: [],
            };
        }
    }
    async analyzeDocument(documentId) {
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
        if (!doc)
            throw new common_1.NotFoundException(`Document ${documentId} not found`);
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
        if (content.type !== 'text')
            throw new Error('Unexpected AI response type');
        try {
            const jsonMatch = content.text.match(/\{[\s\S]*\}/);
            if (!jsonMatch)
                throw new Error('No JSON in response');
            return JSON.parse(jsonMatch[0]);
        }
        catch {
            return {
                summary: content.text.slice(0, 200),
                keyPoints: [], suggestedTags: [], documentType: 'unknown', confidence: 0.3,
            };
        }
    }
    async searchAssistant(workspaceId, question) {
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
            .map((d) => `[${d.id}] ${d.name}: ${d.searchContent.extractedText.slice(0, 500)}`)
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
        if (content.type !== 'text')
            throw new Error('Unexpected AI response');
        try {
            const jsonMatch = content.text.match(/\{[\s\S]*\}/);
            if (!jsonMatch)
                throw new Error('No JSON');
            const parsed = JSON.parse(jsonMatch[0]);
            const relevantDocuments = docs
                .filter((d) => (parsed.relevantDocumentIds ?? []).includes(d.id))
                .map((d) => ({ id: d.id, name: d.name }));
            return { answer: parsed.answer ?? content.text, relevantDocuments };
        }
        catch {
            return { answer: content.text.slice(0, 400), relevantDocuments: [] };
        }
    }
    async generateReport(type, data) {
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
        if (content.type !== 'text')
            throw new Error('Unexpected AI response');
        try {
            const jsonMatch = content.text.match(/\{[\s\S]*\}/);
            if (!jsonMatch)
                throw new Error('No JSON');
            return JSON.parse(jsonMatch[0]);
        }
        catch {
            return {
                title: `${type} Report`,
                summary: content.text.slice(0, 300),
                insights: [],
                recommendations: [],
            };
        }
    }
    async debugExtract(documentId) {
        const steps = [];
        const doc = await this.prisma.document.findUnique({
            where: { id: documentId },
            include: {
                searchContent: true,
                versions: { orderBy: { versionNumber: 'desc' }, take: 1, select: { storageKey: true, mimeType: true } },
            },
        });
        if (!doc)
            return { error: `Document ${documentId} not found` };
        steps.push({
            step: '1_document',
            name: doc.name,
            versionsFound: doc.versions.length,
            storageKey: doc.versions[0]?.storageKey ?? null,
            mimeType: doc.versions[0]?.mimeType ?? null,
            searchContentLength: doc.searchContent?.extractedText?.length ?? 0,
        });
        const currentVersion = doc.versions[0] ?? null;
        const storageKey = currentVersion?.storageKey ?? '';
        const mimeType = currentVersion?.mimeType ?? '';
        let fileBuffer = null;
        let fileError = null;
        if (storageKey) {
            const segments = storageKey.split('/').filter((s) => s.length > 0 && s !== '..' && s !== '.');
            const filePath = path.join(process.cwd(), 'uploads', ...segments);
            try {
                fileBuffer = fs.readFileSync(filePath);
                steps.push({ step: '2_file', status: 'ok', path: filePath, bytes: fileBuffer.length });
            }
            catch (e) {
                fileError = e.message;
                steps.push({ step: '2_file', status: 'error', path: filePath, error: fileError });
            }
        }
        else {
            steps.push({ step: '2_file', status: 'no_storage_key', storageKey });
        }
        if (fileBuffer) {
            const ocrProviderStatus = this.ocrService.getProviderStatus();
            steps.push({ step: '3_ocr_providers', providers: ocrProviderStatus });
            try {
                const ocrResult = await this.ocrService.extract(fileBuffer, mimeType, doc.name);
                if (ocrResult) {
                    steps.push({
                        step: '3_ocr_result', status: 'ok',
                        provider: ocrResult.provider,
                        textLength: ocrResult.fullText.length,
                        textPreview: ocrResult.fullText.slice(0, 200),
                        pageCount: ocrResult.pageCount,
                    });
                }
                else {
                    steps.push({ step: '3_ocr_result', status: 'all_providers_failed' });
                }
            }
            catch (e) {
                steps.push({ step: '3_ocr_result', status: 'error', error: e.message });
            }
        }
        else {
            steps.push({ step: '3_ocr_result', status: 'skipped_no_file' });
        }
        steps.push({
            step: '4_ai_providers',
            anthropicKey: !!(this.config.get('ANTHROPIC_API_KEY')),
            openaiKey: !!this.openaiApiKey,
            anthropicClientReady: !!this.client,
        });
        return { documentId, steps };
    }
    buildDisabledResult() {
        return {
            status: 'disabled',
            documentType: null, title: null, issuer: null, counterparty: null,
            contractNumber: null, policyNumber: null, certificateNumber: null, referenceNumber: null,
            issueDate: null, effectiveDate: null, expiryDate: null, renewalDueDate: null,
            summary: null, keyPoints: [], suggestedTags: [], suggestedFolder: null,
            riskFlags: [], overallConfidence: 0, dateConfidence: 0,
            confidenceByField: emptyConfidenceByField(), ocrProvider: null,
            extractedAt: null, appliedFields: [], userAppliedFields: [], error: null,
        };
    }
    buildFailedResult(error) {
        return {
            status: 'failed',
            documentType: null, title: null, issuer: null, counterparty: null,
            contractNumber: null, policyNumber: null, certificateNumber: null, referenceNumber: null,
            issueDate: null, effectiveDate: null, expiryDate: null, renewalDueDate: null,
            summary: null, keyPoints: [], suggestedTags: [], suggestedFolder: null,
            riskFlags: [], overallConfidence: 0, dateConfidence: 0,
            confidenceByField: emptyConfidenceByField(), ocrProvider: null,
            extractedAt: null, appliedFields: [], userAppliedFields: [], error,
        };
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService,
        ocr_service_1.OcrService,
        extraction_service_1.ExtractionService])
], AiService);
//# sourceMappingURL=ai.service.js.map