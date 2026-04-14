"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentIntelligenceModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const azure_document_intelligence_provider_1 = require("./providers/azure-document-intelligence.provider");
const mistral_ocr_provider_1 = require("./providers/mistral-ocr.provider");
const gpt4o_vision_ocr_provider_1 = require("./providers/gpt4o-vision-ocr.provider");
const claude_native_provider_1 = require("./providers/claude-native.provider");
const ocr_service_1 = require("./ocr.service");
const extraction_service_1 = require("./extraction.service");
let DocumentIntelligenceModule = class DocumentIntelligenceModule {
};
exports.DocumentIntelligenceModule = DocumentIntelligenceModule;
exports.DocumentIntelligenceModule = DocumentIntelligenceModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            azure_document_intelligence_provider_1.AzureDocumentIntelligenceProvider,
            mistral_ocr_provider_1.MistralOcrProvider,
            gpt4o_vision_ocr_provider_1.Gpt4oVisionOcrProvider,
            claude_native_provider_1.ClaudeNativeProvider,
            ocr_service_1.OcrService,
            extraction_service_1.ExtractionService,
        ],
        exports: [ocr_service_1.OcrService, extraction_service_1.ExtractionService],
    })
], DocumentIntelligenceModule);
//# sourceMappingURL=document-intelligence.module.js.map