import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { OcrService } from '../document-intelligence/ocr.service';
import { ExtractionService } from '../document-intelligence/extraction.service';
import type { ConfidenceByField } from '../document-intelligence/extraction.service';
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
    userAppliedFields: string[];
    error: string | null;
}
export declare class AiService {
    private readonly config;
    private readonly prisma;
    private readonly encryption;
    private readonly ocrService;
    private readonly extractionService;
    private readonly logger;
    private readonly client;
    private readonly openaiApiKey;
    constructor(config: ConfigService, prisma: PrismaService, encryption: EncryptionService, ocrService: OcrService, extractionService: ExtractionService);
    get isEnabled(): boolean;
    private upsertMeta;
    private getClientForWorkspace;
    private trackUsage;
    extractDocument(documentId: string): Promise<AiExtractionResult>;
    getExtraction(documentId: string): Promise<AiExtractionResult | null>;
    applyFields(documentId: string, fields: string[]): Promise<{
        applied: string[];
        skipped: string[];
    }>;
    generateReportInsights(workspaceId: string, reportType: string, data: Record<string, unknown>): Promise<{
        summary: string;
        insights: string[];
        recommendations: string[];
        urgentItems: string[];
    }>;
    analyzeDocument(documentId: string): Promise<{
        summary: string;
        keyPoints: string[];
        suggestedTags: string[];
        documentType: string;
        confidence: number;
    }>;
    searchAssistant(workspaceId: string, question: string): Promise<{
        answer: string;
        relevantDocuments: {
            id: string;
            name: string;
        }[];
    }>;
    generateReport(type: string, data: Record<string, unknown>): Promise<{
        title: string;
        summary: string;
        insights: string[];
        recommendations: string[];
    }>;
    debugExtract(documentId: string): Promise<Record<string, unknown>>;
    private buildDisabledResult;
    private buildFailedResult;
}
