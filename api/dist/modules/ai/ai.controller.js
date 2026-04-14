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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const ai_service_1 = require("./ai.service");
const reports_service_1 = require("../reports/reports.service");
const ocr_service_1 = require("../document-intelligence/ocr.service");
const dev_auth_guard_1 = require("../../common/guards/dev-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
class AiSearchDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AiSearchDto.prototype, "question", void 0);
class AiReportDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AiReportDto.prototype, "type", void 0);
class AiApplyFieldsDto {
}
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], AiApplyFieldsDto.prototype, "fields", void 0);
class AiReportInsightsDto {
}
let AiController = class AiController {
    constructor(aiService, reportsService, ocrService) {
        this.aiService = aiService;
        this.reportsService = reportsService;
        this.ocrService = ocrService;
    }
    status() {
        return { enabled: this.aiService.isEnabled };
    }
    ocrStatus() {
        const providers = this.ocrService.getProviderStatus();
        const anyAvailable = providers.some((p) => p.available);
        return {
            anyAvailable,
            providers,
            recommendation: anyAvailable
                ? null
                : 'No OCR providers are configured. Set AZURE_DOCUMENT_INTELLIGENCE_KEY, MISTRAL_API_KEY, or OPENAI_API_KEY in your environment.',
        };
    }
    analyze(id) {
        return this.aiService.analyzeDocument(id);
    }
    search(workspaceId, dto) {
        return this.aiService.searchAssistant(workspaceId, dto.question);
    }
    generateReport(dto) {
        return this.aiService.generateReport(dto.type, dto.data ?? {});
    }
    debugExtract(id) {
        return this.aiService.debugExtract(id);
    }
    extract(id) {
        return this.aiService.extractDocument(id);
    }
    async getExtraction(id) {
        const result = await this.aiService.getExtraction(id);
        if (result === null) {
            return { status: 'none' };
        }
        return result;
    }
    applyFields(id, dto) {
        return this.aiService.applyFields(id, dto.fields ?? []);
    }
    async reportInsights(workspaceId, reportType, dto, user) {
        let freshData = {};
        try {
            switch (reportType) {
                case 'expiring_documents':
                    freshData = await this.reportsService.getExpiringDocuments(workspaceId, user, 90);
                    break;
                case 'document_activity':
                    freshData = await this.reportsService.getDocumentActivity(workspaceId, user, 30);
                    break;
                case 'storage_usage':
                    freshData = await this.reportsService.getStorageUsage(workspaceId, user);
                    break;
                case 'member_activity':
                    freshData = await this.reportsService.getMemberActivity(workspaceId, user, 30);
                    break;
                case 'tag_coverage':
                    freshData = await this.reportsService.getTagCoverage(workspaceId, user);
                    break;
                case 'compliance_exposure':
                    freshData = await this.reportsService.getComplianceExposure(workspaceId, user);
                    break;
                default:
                    freshData = dto.data ?? {};
            }
        }
        catch {
            freshData = dto.data ?? {};
        }
        const mergedData = { ...dto.data, ...freshData };
        return this.aiService.generateReportInsights(workspaceId, reportType, mergedData);
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({ summary: 'Check AI availability' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiController.prototype, "status", null);
__decorate([
    (0, common_1.Get)('ocr-status'),
    (0, swagger_1.ApiOperation)({ summary: 'Diagnostic: list OCR provider availability' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiController.prototype, "ocrStatus", null);
__decorate([
    (0, common_1.Get)('documents/:id/analyze'),
    (0, swagger_1.ApiOperation)({ summary: 'Analyze a document with AI' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'AI analysis result' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "analyze", null);
__decorate([
    (0, common_1.Post)('search'),
    (0, swagger_1.ApiOperation)({ summary: 'AI document search assistant' }),
    __param(0, (0, common_1.Query)('workspaceId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AiSearchDto]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "search", null);
__decorate([
    (0, common_1.Post)('reports/generate'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate an AI report' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AiReportDto]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "generateReport", null);
__decorate([
    (0, common_1.Get)('documents/:id/debug'),
    (0, swagger_1.ApiOperation)({ summary: 'Step-by-step diagnostic: file read → OCR → AI provider check' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "debugExtract", null);
__decorate([
    (0, common_1.Post)('documents/:id/extract'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Run full AI extraction on a document' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'AiExtractionResult' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "extract", null);
__decorate([
    (0, common_1.Get)('documents/:id/extraction'),
    (0, swagger_1.ApiOperation)({ summary: 'Get the latest AI extraction result for a document' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'AiExtractionResult or { status: "none" }' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getExtraction", null);
__decorate([
    (0, common_1.Post)('documents/:id/apply'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Apply specific AI-extracted fields to the document' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lists applied and skipped fields' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AiApplyFieldsDto]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "applyFields", null);
__decorate([
    (0, common_1.Post)('reports/insights'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Generate AI insights from live report data' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Summary, insights, recommendations, urgent items' }),
    __param(0, (0, common_1.Query)('workspaceId')),
    __param(1, (0, common_1.Query)('reportType')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, AiReportInsightsDto, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "reportInsights", null);
exports.AiController = AiController = __decorate([
    (0, swagger_1.ApiTags)('AI'),
    (0, common_1.Controller)('ai'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    __metadata("design:paramtypes", [ai_service_1.AiService,
        reports_service_1.ReportsService,
        ocr_service_1.OcrService])
], AiController);
//# sourceMappingURL=ai.controller.js.map