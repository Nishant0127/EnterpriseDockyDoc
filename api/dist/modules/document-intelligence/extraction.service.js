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
var ExtractionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractionService = void 0;
exports.preScanDates = preScanDates;
exports.normalizeTags = normalizeTags;
exports.suggestFolderFromType = suggestFolderFromType;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sdk_1 = require("@anthropic-ai/sdk");
const DATE_PATTERNS = [
    { re: /\b(\d{4})[\/\-](\d{2})[\/\-](\d{2})\b/g, parse: (m) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` },
    { re: /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g, parse: (m) => normDmy(m[1], m[2], m[3]) },
    { re: /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/gi, parse: (m) => normTextDate(m[1], m[2], m[3]) },
    { re: /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/gi, parse: (m) => normTextDate(m[2], m[1], m[3]) },
    { re: /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{4})\b/gi, parse: (m) => normTextDate(m[1], m[2], m[3]) },
    { re: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{4})\b/gi, parse: (m) => normTextDate('01', m[1], m[2]) },
];
const MONTH_MAP = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08',
    sep: '09', oct: '10', nov: '11', dec: '12',
};
function normTextDate(day, month, year) {
    const m = MONTH_MAP[month.toLowerCase()];
    if (!m)
        return null;
    const d = day.padStart(2, '0');
    return `${year}-${m}-${d}`;
}
function normDmy(d, m, y) {
    const di = parseInt(d, 10), mi = parseInt(m, 10);
    if (di > 31 || mi > 31)
        return null;
    const [day, mon] = di > 12 ? [di, mi] : [di, mi];
    return `${y}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function isValidIsoDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s))
        return false;
    const d = new Date(s);
    return !isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2100;
}
const EXPIRY_PHRASES = [
    'date of expiry', 'expiry date', 'expiration date', 'expires on', 'expires',
    'valid until', 'valid thru', 'valid through', 'valid to', 'validity',
    'use before', 'use by', 'best before',
    'renewal date', 'renewal due', 'renew by', 'renewal on',
    'end date', 'termination date', 'policy end',
];
const ISSUE_PHRASES = [
    'date of issue', 'issue date', 'issued on', 'issued date', 'date issued',
    'start date', 'effective date', 'commencement date',
];
function preScanDates(text) {
    const found = new Map();
    for (const { re, parse } of DATE_PATTERNS) {
        const regex = new RegExp(re.source, re.flags);
        let m;
        while ((m = regex.exec(text)) !== null) {
            const iso = parse(m);
            if (!iso || !isValidIsoDate(iso))
                continue;
            if (found.has(iso))
                continue;
            const start = Math.max(0, m.index - 80);
            const end = Math.min(text.length, m.index + m[0].length + 80);
            const ctx = text.slice(start, end).replace(/\s+/g, ' ').toLowerCase();
            const likelyExpiry = EXPIRY_PHRASES.some((ph) => ctx.includes(ph));
            const likelyIssue = ISSUE_PHRASES.some((ph) => ctx.includes(ph));
            found.set(iso, { date: iso, context: ctx.slice(0, 120), likelyExpiry, likelyIssue });
        }
    }
    return Array.from(found.values()).sort((a, b) => {
        if (a.likelyExpiry !== b.likelyExpiry)
            return a.likelyExpiry ? -1 : 1;
        if (a.likelyIssue !== b.likelyIssue)
            return a.likelyIssue ? -1 : 1;
        return a.date.localeCompare(b.date);
    });
}
const NOISE_TAGS = new Set([
    'document', 'file', 'page', 'text', 'pdf', 'scan', 'copy', 'form',
    'official', 'original', 'general', 'misc', 'miscellaneous', 'other', 'na', 'n/a',
]);
function normalizeTags(raw) {
    const seen = new Set();
    const result = [];
    for (const tag of raw) {
        if (typeof tag !== 'string')
            continue;
        const normalized = tag
            .toLowerCase()
            .trim()
            .replace(/[\s_]+/g, '-')
            .replace(/[^a-z0-9\-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        if (!normalized || normalized.length < 2 || normalized.length > 40)
            continue;
        if (NOISE_TAGS.has(normalized))
            continue;
        if (seen.has(normalized))
            continue;
        seen.add(normalized);
        result.push(normalized);
    }
    return result.slice(0, 6);
}
const FOLDER_BY_TYPE = {
    id: 'Passports & IDs',
    passport: 'Passports & IDs',
    license: 'Licenses',
    insurance: 'Insurance',
    contract: 'Contracts',
    agreement: 'Contracts',
    invoice: 'Finance',
    receipt: 'Finance',
    certification: 'Certificates',
    certificate: 'Certificates',
    policy: 'Policies',
    report: 'Reports',
};
function suggestFolderFromType(documentType, tags) {
    if (documentType) {
        const key = documentType.toLowerCase().replace(/[^a-z]/g, '');
        if (FOLDER_BY_TYPE[key])
            return FOLDER_BY_TYPE[key];
    }
    for (const tag of tags) {
        if (tag.includes('passport') || tag.includes('identity') || tag.includes('id-card'))
            return 'Passports & IDs';
        if (tag.includes('insurance') || tag.includes('policy'))
            return 'Insurance';
        if (tag.includes('contract') || tag.includes('agreement'))
            return 'Contracts';
        if (tag.includes('invoice') || tag.includes('receipt'))
            return 'Finance';
        if (tag.includes('certificate') || tag.includes('certification'))
            return 'Certificates';
        if (tag.includes('license') || tag.includes('licence'))
            return 'Licenses';
        if (tag.includes('report'))
            return 'Reports';
    }
    return null;
}
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(v) {
    return typeof v === 'string' && ISO_DATE_RE.test(v) && isValidIsoDate(v);
}
function safeDate(v) {
    if (!isValidDate(v))
        return null;
    return v;
}
function safeString(v) {
    if (v === null || v === undefined || v === '')
        return null;
    const s = typeof v === 'string' ? v.trim() : String(v).trim();
    return s || null;
}
function safeStringArray(v) {
    if (!Array.isArray(v))
        return [];
    return v.filter((x) => typeof x === 'string' && x.trim().length > 0);
}
function safeNumber(v, fallback = 0) {
    const n = Number(v);
    return isNaN(n) ? fallback : Math.min(1, Math.max(0, n));
}
function clampConf(v) {
    if (v === null || v === undefined)
        return 0.0;
    const n = Number(v);
    return isNaN(n) ? 0.0 : Math.min(1, Math.max(0, n));
}
let ExtractionService = ExtractionService_1 = class ExtractionService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(ExtractionService_1.name);
        this.openaiApiKey = this.config.get('OPENAI_API_KEY') ?? null;
        const anthropicKey = this.config.get('ANTHROPIC_API_KEY');
        this.anthropicClient = anthropicKey ? new sdk_1.default({ apiKey: anthropicKey }) : null;
        this.logger.log(`ExtractionService initialized: OpenAI=${this.openaiApiKey ? 'yes' : 'no'}, Claude=${this.anthropicClient ? 'yes' : 'no'}`);
    }
    async extract(ocrOutput, documentName, anthropicClientOverride) {
        const text = ocrOutput.fullText;
        if (!text || text.trim().length < 5) {
            this.logger.warn(`ExtractionService: empty OCR text for "${documentName}"`);
            return null;
        }
        this.logger.log(`[Extraction] "${documentName}" | OCR provider: ${ocrOutput.provider} | text length: ${text.length} chars | pages: ${ocrOutput.pageCount}`);
        const dateCandidates = preScanDates(text);
        const expiryCandidates = dateCandidates.filter((d) => d.likelyExpiry);
        const issueCandidates = dateCandidates.filter((d) => d.likelyIssue);
        this.logger.log(`[Extraction] "${documentName}" | pre-scan: ${dateCandidates.length} dates found (${expiryCandidates.length} expiry, ${issueCandidates.length} issue)`);
        if (expiryCandidates.length > 0) {
            this.logger.log(`[Extraction] "${documentName}" | expiry candidates: ${expiryCandidates.map((d) => `${d.date} ("${d.context.slice(0, 50)}")`).join(' | ')}`);
        }
        const client = anthropicClientOverride ?? this.anthropicClient;
        try {
            let result = null;
            if (this.openaiApiKey) {
                result = await this.extractWithOpenAi(text, documentName, ocrOutput.keyValuePairs, dateCandidates);
            }
            else if (client) {
                result = await this.extractWithClaude(text, documentName, ocrOutput.keyValuePairs, dateCandidates, client);
            }
            else {
                this.logger.warn('ExtractionService: no AI client available for structured extraction');
                return null;
            }
            if (!result)
                return null;
            result = postProcess(result, documentName, this.logger);
            this.logger.log(`[Extraction] "${documentName}" | RESULT: type=${result.documentType} | ` +
                `expiryDate=${result.expiryDate ?? 'null'} (conf=${result.confidenceByField.expiryDate.toFixed(2)}) | ` +
                `renewalDate=${result.renewalDueDate ?? 'null'} | ` +
                `tags=[${result.suggestedTags.join(',')}] | folder="${result.suggestedFolder}" | ` +
                `overallConf=${result.overallConfidence.toFixed(2)}`);
            return result;
        }
        catch (err) {
            this.logger.error(`ExtractionService extract failed for "${documentName}": ${err.message}`);
            return null;
        }
    }
    async extractWithOpenAi(text, documentName, keyValuePairs, dateCandidates) {
        try {
            const OpenAI = require('openai');
            const client = new OpenAI.OpenAI({ apiKey: this.openaiApiKey });
            const userContent = buildUserContent(documentName, text, keyValuePairs, dateCandidates);
            const response = await client.chat.completions.create({
                model: 'gpt-4o-2024-08-06',
                messages: [
                    { role: 'system', content: buildSystemPrompt() },
                    { role: 'user', content: userContent },
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
            if (!raw)
                return null;
            this.logger.log(`[Extraction] GPT-4o extraction successful for "${documentName}"`);
            return parseExtractionJson(JSON.parse(raw));
        }
        catch (err) {
            this.logger.warn(`[Extraction] GPT-4o failed for "${documentName}": ${err.message}. Falling back to Claude.`);
            if (this.anthropicClient) {
                return this.extractWithClaude(text, documentName, keyValuePairs, dateCandidates, this.anthropicClient);
            }
            return null;
        }
    }
    async extractWithClaude(text, documentName, keyValuePairs, dateCandidates, client) {
        const userContent = buildUserContent(documentName, text, keyValuePairs, dateCandidates);
        const prompt = `${buildSystemPrompt()}\n\n${userContent}\n\n${buildJsonTemplate()}`;
        const message = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt }],
        });
        const content = message.content[0];
        if (content.type !== 'text')
            return null;
        const raw = content.text.trim();
        let parsed;
        try {
            if (raw.startsWith('{')) {
                parsed = JSON.parse(raw);
            }
            else {
                const jsonMatch = raw.match(/\{[\s\S]*\}/);
                if (!jsonMatch)
                    throw new Error('No JSON object found in response');
                parsed = JSON.parse(jsonMatch[0]);
            }
        }
        catch (err) {
            this.logger.warn(`[Extraction] Claude JSON parse failed for "${documentName}": ${err.message}`);
            return null;
        }
        this.logger.log(`[Extraction] Claude Sonnet successful for "${documentName}"`);
        return parseExtractionJson(parsed);
    }
};
exports.ExtractionService = ExtractionService;
exports.ExtractionService = ExtractionService = ExtractionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ExtractionService);
function buildUserContent(documentName, text, keyValuePairs, dateCandidates) {
    const parts = [`Document filename: ${documentName}`];
    if (keyValuePairs && Object.keys(keyValuePairs).length > 0) {
        parts.push(`\nKey-value pairs detected by OCR:\n` +
            Object.entries(keyValuePairs)
                .slice(0, 40)
                .map(([k, v]) => `  ${k}: ${v}`)
                .join('\n'));
    }
    if (dateCandidates.length > 0) {
        const expiry = dateCandidates.filter((d) => d.likelyExpiry);
        const issue = dateCandidates.filter((d) => d.likelyIssue);
        const other = dateCandidates.filter((d) => !d.likelyExpiry && !d.likelyIssue);
        parts.push('\nPRE-SCANNED DATE CANDIDATES (use these to identify the correct dates):');
        if (expiry.length > 0) {
            parts.push('  Likely EXPIRY dates:');
            expiry.slice(0, 5).forEach((d) => parts.push(`    ${d.date}  (context: "${d.context.slice(0, 80)}")`));
        }
        if (issue.length > 0) {
            parts.push('  Likely ISSUE/START dates:');
            issue.slice(0, 3).forEach((d) => parts.push(`    ${d.date}  (context: "${d.context.slice(0, 80)}")`));
        }
        if (other.length > 0) {
            parts.push('  Other dates found:');
            other.slice(0, 5).forEach((d) => parts.push(`    ${d.date}  (context: "${d.context.slice(0, 60)}")`));
        }
    }
    else {
        parts.push('\n(No date patterns detected in pre-scan — scan carefully in full text)');
    }
    parts.push(`\nFull extracted text:\n${text.slice(0, 8000)}`);
    return parts.join('\n');
}
function buildSystemPrompt() {
    return `You are an expert document analyst. Extract structured data from the document text below with maximum accuracy.

═══ DATE EXTRACTION (CRITICAL) ═══
Use the PRE-SCANNED DATE CANDIDATES provided to identify the correct dates. Do not guess.

EXPIRY DATE — look for these exact phrases (in any case):
  "date of expiry", "expiry date", "expiration date", "expires", "expires on",
  "valid until", "valid thru", "valid through", "valid to", "not valid after",
  "use before", "renewal date", "renewal due", "renew by", "policy end date",
  "end date", "termination date", "valid through"

ISSUE/START DATE — look for:
  "date of issue", "issue date", "issued on", "date issued", "effective date",
  "commencement date", "start date", "policy start", "valid from"

Date format rules — convert ALL dates to YYYY-MM-DD:
  "31 Dec 2027"        → "2027-12-31"
  "31/12/2027"         → "2027-12-31"
  "12/31/2027"         → "2027-12-31"
  "December 31, 2027"  → "2027-12-31"
  "2027-12-31"         → "2027-12-31" (already ISO)
  If DD > 12: must be day. If ambiguous DD/MM/YYYY: assume DD/MM.

If a pre-scanned expiry candidate matches a phrase above → use it as expiryDate with high confidence (0.95+).
If no expiry phrase found but there is a future date in an appropriate position → use it with lower confidence (0.70).

═══ DOCUMENT TYPE ═══
Classify as one of: contract | invoice | insurance | certification | license | id | policy | agreement | report | receipt | other
  - passport, national_id, driving_licence, visa → id
  - insurance_policy, insurance_certificate → insurance
  - employment_contract, lease, service_agreement, NDA → contract
  - purchase_order, bill, proforma → invoice

═══ REFERENCE NUMBERS ═══
Extract ALL visible numbers:
  contractNumber → contract/agreement/reference numbers
  policyNumber   → insurance policy numbers
  certificateNumber → certificate/credential/registration numbers
  referenceNumber → any other case/order/reference number

═══ TAGS (2-5 tags) ═══
Return lowercase, hyphenated tags. Be specific, not generic.
GOOD: "passport", "uk-government", "insurance", "expiring-soon", "employment-contract"
BAD: "document", "file", "official", "misc", "other", "general"
If expiry is within 90 days from today (${new Date().toISOString().slice(0, 10)}): include "expiring-soon"
If already expired: include "expired"

═══ FOLDER ═══
Suggest ONE folder from this taxonomy (or null if uncertain):
"Passports & IDs" | "Insurance" | "Contracts" | "Finance" | "Certificates" |
"Licenses" | "Policies" | "Reports" | "HR Documents" | "Legal"
Match to documentType. Only suggest if confident (≥0.7).

═══ CONFIDENCE ═══
Set confidence per field:
  0.0: field not found in document (null value → must be 0.0)
  0.50–0.69: uncertain / inferred
  0.70–0.84: field visible but minor uncertainty
  0.85–0.94: field clearly visible
  0.95–1.00: field explicitly stated, unambiguous
IMPORTANT: if expiryDate is null, set confidenceByField.expiryDate = 0.0

═══ RISK FLAGS ═══
Only include if genuinely present:
  - "Expires in N days" if expiry within 90 days
  - "Expired on YYYY-MM-DD" if already past
  - "Policy cancelled" if explicitly stated
Empty array [] if no real risks.`;
}
function buildJsonTemplate() {
    return `Respond with ONLY a valid JSON object. No markdown, no code blocks, no explanation.

{
  "documentType": "id",
  "title": "document title or null",
  "issuer": "issuing authority or null",
  "counterparty": "holder / other party or null",
  "contractNumber": null,
  "policyNumber": null,
  "certificateNumber": null,
  "referenceNumber": null,
  "issueDate": "YYYY-MM-DD or null",
  "effectiveDate": "YYYY-MM-DD or null",
  "expiryDate": "YYYY-MM-DD or null",
  "renewalDueDate": "YYYY-MM-DD or null",
  "summary": "2-3 sentence description",
  "keyPoints": ["key fact 1"],
  "suggestedTags": ["tag1", "tag2"],
  "suggestedFolder": "Passports & IDs",
  "riskFlags": [],
  "overallConfidence": 0.92,
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
    "suggestedFolder": 0.88
  }
}`;
}
function getOpenAiSchema() {
    const nullable = (t) => ({ anyOf: [{ type: t }, { type: 'null' }] });
    return {
        type: 'object',
        properties: {
            documentType: { type: 'string' },
            title: nullable('string'),
            issuer: nullable('string'),
            counterparty: nullable('string'),
            contractNumber: nullable('string'),
            policyNumber: nullable('string'),
            certificateNumber: nullable('string'),
            referenceNumber: nullable('string'),
            issueDate: nullable('string'),
            effectiveDate: nullable('string'),
            expiryDate: nullable('string'),
            renewalDueDate: nullable('string'),
            summary: nullable('string'),
            keyPoints: { type: 'array', items: { type: 'string' } },
            suggestedTags: { type: 'array', items: { type: 'string' } },
            suggestedFolder: nullable('string'),
            riskFlags: { type: 'array', items: { type: 'string' } },
            overallConfidence: { type: 'number' },
            dateConfidence: { type: 'number' },
            confidenceByField: {
                type: 'object',
                properties: {
                    documentType: { type: 'number' }, title: { type: 'number' },
                    issuer: { type: 'number' }, counterparty: { type: 'number' },
                    contractNumber: { type: 'number' }, policyNumber: { type: 'number' },
                    certificateNumber: { type: 'number' }, referenceNumber: { type: 'number' },
                    issueDate: { type: 'number' }, effectiveDate: { type: 'number' },
                    expiryDate: { type: 'number' }, renewalDueDate: { type: 'number' },
                    suggestedTags: { type: 'number' }, suggestedFolder: { type: 'number' },
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
function parseExtractionJson(raw) {
    const cbfRaw = (raw.confidenceByField ?? {});
    const expiryDate = safeDate(raw.expiryDate);
    const renewalDueDate = safeDate(raw.renewalDueDate);
    const issueDate = safeDate(raw.issueDate);
    const effectiveDate = safeDate(raw.effectiveDate);
    const tags = safeStringArray(raw.suggestedTags);
    const folder = safeString(raw.suggestedFolder);
    const conf = {
        documentType: clampConf(cbfRaw.documentType),
        title: safeString(raw.title) ? clampConf(cbfRaw.title) : 0.0,
        issuer: safeString(raw.issuer) ? clampConf(cbfRaw.issuer) : 0.0,
        counterparty: safeString(raw.counterparty) ? clampConf(cbfRaw.counterparty) : 0.0,
        contractNumber: safeString(raw.contractNumber) ? clampConf(cbfRaw.contractNumber) : 0.0,
        policyNumber: safeString(raw.policyNumber) ? clampConf(cbfRaw.policyNumber) : 0.0,
        certificateNumber: safeString(raw.certificateNumber) ? clampConf(cbfRaw.certificateNumber) : 0.0,
        referenceNumber: safeString(raw.referenceNumber) ? clampConf(cbfRaw.referenceNumber) : 0.0,
        issueDate: issueDate ? clampConf(cbfRaw.issueDate) : 0.0,
        effectiveDate: effectiveDate ? clampConf(cbfRaw.effectiveDate) : 0.0,
        expiryDate: expiryDate ? clampConf(cbfRaw.expiryDate) : 0.0,
        renewalDueDate: renewalDueDate ? clampConf(cbfRaw.renewalDueDate) : 0.0,
        suggestedTags: tags.length > 0 ? clampConf(cbfRaw.suggestedTags) : 0.0,
        suggestedFolder: folder ? clampConf(cbfRaw.suggestedFolder) : 0.0,
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
        issueDate,
        effectiveDate,
        expiryDate,
        renewalDueDate,
        summary: safeString(raw.summary),
        keyPoints: safeStringArray(raw.keyPoints),
        suggestedTags: tags,
        suggestedFolder: folder,
        riskFlags: safeStringArray(raw.riskFlags),
        overallConfidence: safeNumber(raw.overallConfidence, 0.5),
        dateConfidence: safeNumber(raw.dateConfidence, 0.5),
        confidenceByField: conf,
    };
}
function postProcess(result, documentName, logger) {
    const rawTags = result.suggestedTags;
    const normalizedTags = normalizeTags(rawTags);
    if (normalizedTags.join(',') !== rawTags.join(',')) {
        logger.log(`[Extraction] "${documentName}" | tags normalized: [${rawTags.join(',')}] → [${normalizedTags.join(',')}]`);
    }
    const riskFlags = [...result.riskFlags];
    if (result.expiryDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exp = new Date(result.expiryDate);
        const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / 86_400_000);
        if (daysLeft < 0 && !riskFlags.some((f) => f.toLowerCase().includes('expired'))) {
            riskFlags.push(`Expired on ${result.expiryDate}`);
        }
        else if (daysLeft >= 0 && daysLeft <= 90 && !riskFlags.some((f) => f.toLowerCase().includes('expir'))) {
            riskFlags.push(`Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`);
        }
        if (daysLeft >= 0 && daysLeft <= 90 && !normalizedTags.includes('expiring-soon')) {
            normalizedTags.push('expiring-soon');
        }
        if (daysLeft < 0 && !normalizedTags.includes('expired')) {
            normalizedTags.push('expired');
        }
    }
    let folder = result.suggestedFolder;
    let folderConf = result.confidenceByField.suggestedFolder;
    if (!folder || folderConf < 0.5) {
        const derived = suggestFolderFromType(result.documentType, normalizedTags);
        if (derived) {
            folder = derived;
            folderConf = 0.75;
            logger.log(`[Extraction] "${documentName}" | folder derived from taxonomy: "${derived}"`);
        }
    }
    return {
        ...result,
        suggestedTags: normalizedTags,
        suggestedFolder: folder,
        riskFlags,
        confidenceByField: {
            ...result.confidenceByField,
            suggestedTags: normalizedTags.length > 0 ? result.confidenceByField.suggestedTags || 0.75 : 0.0,
            suggestedFolder: folder ? folderConf : 0.0,
        },
    };
}
//# sourceMappingURL=extraction.service.js.map