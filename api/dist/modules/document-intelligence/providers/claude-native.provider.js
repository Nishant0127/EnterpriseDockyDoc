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
var ClaudeNativeProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeNativeProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sdk_1 = require("@anthropic-ai/sdk");
let ClaudeNativeProvider = ClaudeNativeProvider_1 = class ClaudeNativeProvider {
    constructor(config) {
        this.config = config;
        this.name = 'claude-native';
        this.logger = new common_1.Logger(ClaudeNativeProvider_1.name);
        const apiKey = this.config.get('ANTHROPIC_API_KEY');
        this.client = apiKey ? new sdk_1.default({ apiKey }) : null;
    }
    isAvailable() {
        return this.client !== null;
    }
    canHandle(mimeType) {
        return (mimeType === 'application/pdf' ||
            ClaudeNativeProvider_1.VISION_TYPES.has(mimeType) ||
            mimeType.startsWith('text/') ||
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimeType === 'application/msword');
    }
    async extract(buffer, mimeType, fileName) {
        if (!this.client)
            return null;
        const start = Date.now();
        try {
            if (mimeType.startsWith('text/') ||
                ['.txt', '.csv', '.md', '.json', '.xml'].some((ext) => fileName.toLowerCase().endsWith(ext))) {
                const text = buffer.toString('utf-8').trim();
                return {
                    provider: this.name,
                    fullText: text,
                    pages: [{ pageNumber: 1, text }],
                    pageCount: 1,
                    confidence: 1.0,
                    processingTimeMs: Date.now() - start,
                };
            }
            if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                mimeType === 'application/msword') {
                const text = await this.extractWord(buffer, fileName);
                if (text) {
                    return {
                        provider: this.name,
                        fullText: text,
                        pages: [{ pageNumber: 1, text }],
                        pageCount: 1,
                        confidence: 0.95,
                        processingTimeMs: Date.now() - start,
                    };
                }
                return null;
            }
            if (mimeType === 'application/pdf') {
                return await this.extractPdf(buffer, fileName, start);
            }
            if (ClaudeNativeProvider_1.VISION_TYPES.has(mimeType)) {
                return await this.extractImage(buffer, mimeType, fileName, start);
            }
            return null;
        }
        catch (err) {
            this.logger.warn(`Claude Native OCR error for ${fileName}: ${err.message}`);
            return null;
        }
    }
    async extractPdf(buffer, fileName, start) {
        const fileBase64 = buffer.toString('base64');
        let parsedText = '';
        try {
            const pdfParse = require('pdf-parse');
            const parsed = await pdfParse(buffer);
            parsedText = parsed.text.trim();
        }
        catch {
        }
        const prompt = `Extract ALL text content from this document verbatim. Include every word, number, date, and label visible in the document. Preserve the document structure.

Output format: Just the extracted text, no commentary.${parsedText ? `\n\nSupplementary text-layer (use to verify your extraction):\n${parsedText.slice(0, 3000)}` : ''}`;
        const message = await this.client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'document',
                            source: {
                                type: 'base64',
                                media_type: 'application/pdf',
                                data: fileBase64,
                            },
                        },
                        { type: 'text', text: prompt },
                    ],
                },
            ],
        });
        const content = message.content[0];
        if (content.type !== 'text')
            return null;
        const fullText = content.text.trim();
        if (!fullText)
            return null;
        this.logger.log(`Claude Native PDF OCR extracted ${fullText.length} chars from ${fileName} in ${Date.now() - start}ms`);
        return {
            provider: this.name,
            fullText,
            pages: [{ pageNumber: 1, text: fullText }],
            pageCount: 1,
            confidence: 0.92,
            processingTimeMs: Date.now() - start,
        };
    }
    async extractImage(buffer, mimeType, fileName, start) {
        const fileBase64 = buffer.toString('base64');
        const safeMediaType = ClaudeNativeProvider_1.VISION_TYPES.has(mimeType)
            ? mimeType
            : 'image/jpeg';
        const message = await this.client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: safeMediaType,
                                data: fileBase64,
                            },
                        },
                        {
                            type: 'text',
                            text: 'Extract ALL text visible in this image, exactly as it appears. Include every word, number, date, label, and identifier. Preserve the layout structure as much as possible. Output only the extracted text, no commentary.',
                        },
                    ],
                },
            ],
        });
        const content = message.content[0];
        if (content.type !== 'text')
            return null;
        const fullText = content.text.trim();
        if (!fullText)
            return null;
        this.logger.log(`Claude Native Vision OCR extracted ${fullText.length} chars from ${fileName} in ${Date.now() - start}ms`);
        return {
            provider: this.name,
            fullText,
            pages: [{ pageNumber: 1, text: fullText }],
            pageCount: 1,
            confidence: 0.9,
            processingTimeMs: Date.now() - start,
        };
    }
    async extractWord(buffer, fileName) {
        try {
            const mammoth = require('mammoth');
            const result = await mammoth.extractRawText({ buffer });
            return result.value.trim() || null;
        }
        catch (err) {
            this.logger.warn(`Word extraction error for ${fileName}: ${err.message}`);
            return null;
        }
    }
};
exports.ClaudeNativeProvider = ClaudeNativeProvider;
ClaudeNativeProvider.VISION_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
]);
exports.ClaudeNativeProvider = ClaudeNativeProvider = ClaudeNativeProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ClaudeNativeProvider);
//# sourceMappingURL=claude-native.provider.js.map