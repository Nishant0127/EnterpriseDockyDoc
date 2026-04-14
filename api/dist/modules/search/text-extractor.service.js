"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TextExtractorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextExtractorService = void 0;
const common_1 = require("@nestjs/common");
const path = require("path");
let TextExtractorService = TextExtractorService_1 = class TextExtractorService {
    constructor() {
        this.logger = new common_1.Logger(TextExtractorService_1.name);
    }
    async extract(buffer, mimeType, fileName) {
        const ext = path.extname(fileName).toLowerCase();
        try {
            if (ext === '.txt' ||
                ext === '.csv' ||
                ext === '.md' ||
                ext === '.json' ||
                ext === '.xml' ||
                mimeType.startsWith('text/')) {
                return buffer.toString('utf-8').trim() || null;
            }
            if (ext === '.pdf' || mimeType === 'application/pdf') {
                return await this.extractPdf(buffer);
            }
            if (ext === '.docx' ||
                ext === '.doc' ||
                mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                mimeType === 'application/msword') {
                return await this.extractWord(buffer);
            }
            if (mimeType.startsWith('image/')) {
                return null;
            }
            return null;
        }
        catch (err) {
            this.logger.warn(`Extraction failed for "${fileName}" (${mimeType}): ${err.message}`);
            return null;
        }
    }
    async extractPdf(buffer) {
        try {
            const pdfParse = require('pdf-parse');
            const data = await pdfParse(buffer);
            return data.text.trim() || null;
        }
        catch (err) {
            this.logger.warn(`PDF extraction error: ${err.message}`);
            return null;
        }
    }
    async extractWord(buffer) {
        try {
            const mammoth = require('mammoth');
            const result = await mammoth.extractRawText({ buffer });
            return result.value.trim() || null;
        }
        catch (err) {
            this.logger.warn(`Word extraction error: ${err.message}`);
            return null;
        }
    }
};
exports.TextExtractorService = TextExtractorService;
exports.TextExtractorService = TextExtractorService = TextExtractorService_1 = __decorate([
    (0, common_1.Injectable)()
], TextExtractorService);
//# sourceMappingURL=text-extractor.service.js.map