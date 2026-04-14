import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { OcrOutput } from './ocr-provider.interface';
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
}
interface DateCandidate {
    date: string;
    context: string;
    likelyExpiry: boolean;
    likelyIssue: boolean;
}
export declare function preScanDates(text: string): DateCandidate[];
export declare function normalizeTags(raw: string[]): string[];
export declare function suggestFolderFromType(documentType: string | null, tags: string[]): string | null;
export declare class ExtractionService {
    private readonly config;
    private readonly logger;
    private readonly openaiApiKey;
    private readonly anthropicClient;
    constructor(config: ConfigService);
    extract(ocrOutput: OcrOutput, documentName: string, anthropicClientOverride?: Anthropic): Promise<ExtractionResult | null>;
    private extractWithOpenAi;
    private extractWithClaude;
}
export {};
