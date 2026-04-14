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
var Gpt4oVisionOcrProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gpt4oVisionOcrProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let Gpt4oVisionOcrProvider = Gpt4oVisionOcrProvider_1 = class Gpt4oVisionOcrProvider {
    constructor(config) {
        this.config = config;
        this.name = 'gpt4o-vision-ocr';
        this.logger = new common_1.Logger(Gpt4oVisionOcrProvider_1.name);
        this.apiKey = this.config.get('OPENAI_API_KEY') ?? null;
    }
    isAvailable() {
        return !!this.apiKey;
    }
    canHandle(mimeType) {
        return (mimeType === 'image/jpeg' ||
            mimeType === 'image/jpg' ||
            mimeType === 'image/png' ||
            mimeType === 'image/webp' ||
            mimeType === 'image/gif');
    }
    async extract(buffer, mimeType, fileName) {
        if (!this.isAvailable())
            return null;
        const start = Date.now();
        try {
            const OpenAI = require('openai');
            const client = new OpenAI.OpenAI({ apiKey: this.apiKey });
            const base64 = buffer.toString('base64');
            const dataUrl = `data:${mimeType};base64,${base64}`;
            const response = await client.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: [
                                    'You are an OCR engine. Transcribe ALL text visible in this image exactly as it appears.',
                                    'Preserve original formatting, line breaks, and structure as much as possible.',
                                    'Include every field label, value, date, number, address, and signature text.',
                                    'If there is a table, render it with pipe-separated columns.',
                                    'Do NOT interpret, summarize, or add anything not in the image.',
                                    'Output ONLY the raw transcribed text — no commentary, no markdown code fences.',
                                ].join(' '),
                            },
                            {
                                type: 'image_url',
                                image_url: { url: dataUrl, detail: 'high' },
                            },
                        ],
                    },
                ],
                max_tokens: 4096,
                temperature: 0,
            });
            const fullText = response.choices[0]?.message?.content?.trim() ?? '';
            if (!fullText) {
                this.logger.warn(`GPT-4o Vision OCR returned empty text for "${fileName}"`);
                return null;
            }
            this.logger.log(`[GPT-4o Vision OCR] Extracted ${fullText.length} chars from "${fileName}" in ${Date.now() - start}ms`);
            return {
                provider: this.name,
                fullText,
                pages: [{ pageNumber: 1, text: fullText }],
                pageCount: 1,
                confidence: 0.88,
                processingTimeMs: Date.now() - start,
            };
        }
        catch (err) {
            this.logger.warn(`GPT-4o Vision OCR error for "${fileName}": ${err.message}`);
            return null;
        }
    }
};
exports.Gpt4oVisionOcrProvider = Gpt4oVisionOcrProvider;
exports.Gpt4oVisionOcrProvider = Gpt4oVisionOcrProvider = Gpt4oVisionOcrProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], Gpt4oVisionOcrProvider);
//# sourceMappingURL=gpt4o-vision-ocr.provider.js.map