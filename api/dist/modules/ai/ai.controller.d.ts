import { AiService } from './ai.service';
import { ReportsService } from '../reports/reports.service';
import { OcrService } from '../document-intelligence/ocr.service';
import { type DevUserPayload } from '../../common/guards/dev-auth.guard';
declare class AiSearchDto {
    question: string;
}
declare class AiReportDto {
    type: string;
    data: Record<string, unknown>;
}
declare class AiApplyFieldsDto {
    fields: string[];
}
declare class AiReportInsightsDto {
    data?: Record<string, unknown>;
}
export declare class AiController {
    private readonly aiService;
    private readonly reportsService;
    private readonly ocrService;
    constructor(aiService: AiService, reportsService: ReportsService, ocrService: OcrService);
    status(): {
        enabled: boolean;
    };
    ocrStatus(): {
        anyAvailable: boolean;
        providers: {
            name: string;
            available: boolean;
        }[];
        recommendation: string | null;
    };
    analyze(id: string): Promise<{
        summary: string;
        keyPoints: string[];
        suggestedTags: string[];
        documentType: string;
        confidence: number;
    }>;
    search(workspaceId: string, dto: AiSearchDto): Promise<{
        answer: string;
        relevantDocuments: {
            id: string;
            name: string;
        }[];
    }>;
    generateReport(dto: AiReportDto): Promise<{
        title: string;
        summary: string;
        insights: string[];
        recommendations: string[];
    }>;
    debugExtract(id: string): Promise<Record<string, unknown>>;
    extract(id: string): Promise<import("./ai.service").AiExtractionResult>;
    getExtraction(id: string): Promise<import("./ai.service").AiExtractionResult | {
        status: string;
    }>;
    applyFields(id: string, dto: AiApplyFieldsDto): Promise<{
        applied: string[];
        skipped: string[];
    }>;
    reportInsights(workspaceId: string, reportType: string, dto: AiReportInsightsDto, user: DevUserPayload): Promise<{
        summary: string;
        insights: string[];
        recommendations: string[];
        urgentItems: string[];
    }>;
}
export {};
