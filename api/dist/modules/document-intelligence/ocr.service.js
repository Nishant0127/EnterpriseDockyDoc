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
var OcrService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrService = void 0;
const common_1 = require("@nestjs/common");
const azure_document_intelligence_provider_1 = require("./providers/azure-document-intelligence.provider");
const mistral_ocr_provider_1 = require("./providers/mistral-ocr.provider");
const gpt4o_vision_ocr_provider_1 = require("./providers/gpt4o-vision-ocr.provider");
const claude_native_provider_1 = require("./providers/claude-native.provider");
let OcrService = OcrService_1 = class OcrService {
    constructor(azure, mistral, gpt4oVision, claudeNative) {
        this.azure = azure;
        this.mistral = mistral;
        this.gpt4oVision = gpt4oVision;
        this.claudeNative = claudeNative;
        this.logger = new common_1.Logger(OcrService_1.name);
        this.providers = [azure, mistral, gpt4oVision, claudeNative];
        this.logger.log(`OCR providers available: ${this.providers
            .filter((p) => p.isAvailable())
            .map((p) => p.name)
            .join(', ') || 'none'}`);
    }
    async extract(buffer, mimeType, fileName) {
        for (const provider of this.providers) {
            if (!provider.isAvailable())
                continue;
            if (!provider.canHandle(mimeType))
                continue;
            this.logger.debug(`Trying OCR provider: ${provider.name} for ${fileName} (${mimeType})`);
            try {
                const result = await provider.extract(buffer, mimeType, fileName);
                if (result && result.fullText.trim().length > 10) {
                    this.logger.log(`OCR success via ${provider.name} for ${fileName}: ${result.fullText.length} chars`);
                    return result;
                }
                this.logger.debug(`${provider.name} returned empty/short result for ${fileName}, trying next`);
            }
            catch (err) {
                this.logger.warn(`${provider.name} threw for ${fileName}: ${err.message}`);
            }
        }
        this.logger.warn(`No OCR provider could extract text from ${fileName}`);
        return null;
    }
    getProviderStatus() {
        return this.providers.map((p) => ({
            name: p.name,
            available: p.isAvailable(),
        }));
    }
};
exports.OcrService = OcrService;
exports.OcrService = OcrService = OcrService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [azure_document_intelligence_provider_1.AzureDocumentIntelligenceProvider,
        mistral_ocr_provider_1.MistralOcrProvider,
        gpt4o_vision_ocr_provider_1.Gpt4oVisionOcrProvider,
        claude_native_provider_1.ClaudeNativeProvider])
], OcrService);
//# sourceMappingURL=ocr.service.js.map