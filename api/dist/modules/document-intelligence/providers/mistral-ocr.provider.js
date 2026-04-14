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
var MistralOcrProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MistralOcrProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let MistralOcrProvider = MistralOcrProvider_1 = class MistralOcrProvider {
    constructor(config) {
        this.config = config;
        this.name = 'mistral-ocr';
        this.logger = new common_1.Logger(MistralOcrProvider_1.name);
        this.apiKey = this.config.get('MISTRAL_API_KEY') ?? null;
    }
    isAvailable() {
        return !!this.apiKey;
    }
    canHandle(mimeType) {
        return (mimeType === 'application/pdf' ||
            mimeType === 'image/jpeg' ||
            mimeType === 'image/jpg' ||
            mimeType === 'image/png' ||
            mimeType === 'image/webp');
    }
    async extract(buffer, mimeType, fileName) {
        if (!this.isAvailable())
            return null;
        const MAX_BYTES = 10 * 1024 * 1024;
        if (buffer.length > MAX_BYTES) {
            this.logger.warn(`Mistral OCR skipped "${fileName}" — file is ${(buffer.length / 1024 / 1024).toFixed(1)} MB (limit 10 MB)`);
            return null;
        }
        const start = Date.now();
        try {
            const base64Data = buffer.toString('base64');
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            const isPdf = mimeType === 'application/pdf';
            const requestBody = {
                model: 'mistral-ocr-latest',
                document: isPdf
                    ? { type: 'document_url', document_url: dataUrl }
                    : { type: 'image_url', image_url: dataUrl },
                include_image_base64: false,
            };
            const response = await fetch('https://api.mistral.ai/v1/ocr', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                const errBody = await response.text();
                this.logger.warn(`Mistral OCR failed (${response.status}): ${errBody.slice(0, 200)}`);
                return null;
            }
            const data = (await response.json());
            const pages = (data.pages ?? []).map((p, idx) => ({
                pageNumber: p.index ?? idx + 1,
                text: p.markdown ?? '',
            }));
            const fullText = pages.map((p) => p.text).join('\n\n').trim();
            if (!fullText) {
                this.logger.warn(`Mistral OCR returned empty text for ${fileName}`);
                return null;
            }
            this.logger.log(`Mistral OCR extracted ${fullText.length} chars from ${fileName} in ${Date.now() - start}ms`);
            return {
                provider: this.name,
                fullText,
                pages,
                pageCount: pages.length || 1,
                confidence: 0.9,
                processingTimeMs: Date.now() - start,
            };
        }
        catch (err) {
            this.logger.warn(`Mistral OCR error for ${fileName}: ${err.message}`);
            return null;
        }
    }
};
exports.MistralOcrProvider = MistralOcrProvider;
exports.MistralOcrProvider = MistralOcrProvider = MistralOcrProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MistralOcrProvider);
//# sourceMappingURL=mistral-ocr.provider.js.map