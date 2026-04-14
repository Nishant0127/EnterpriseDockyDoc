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
var AzureDocumentIntelligenceProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureDocumentIntelligenceProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let AzureDocumentIntelligenceProvider = AzureDocumentIntelligenceProvider_1 = class AzureDocumentIntelligenceProvider {
    constructor(config) {
        this.config = config;
        this.name = 'azure-document-intelligence';
        this.logger = new common_1.Logger(AzureDocumentIntelligenceProvider_1.name);
        this.endpoint =
            this.config.get('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT') ?? null;
        this.apiKey =
            this.config.get('AZURE_DOCUMENT_INTELLIGENCE_KEY') ?? null;
    }
    isAvailable() {
        return !!(this.endpoint && this.apiKey);
    }
    canHandle(mimeType) {
        return (mimeType === 'application/pdf' ||
            mimeType.startsWith('image/') ||
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimeType === 'application/msword');
    }
    async extract(buffer, mimeType, fileName) {
        if (!this.isAvailable())
            return null;
        const start = Date.now();
        try {
            const endpoint = this.endpoint.replace(/\/$/, '');
            const analyzeUrl = `${endpoint}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30`;
            const legacyAnalyzeUrl = `${endpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`;
            this.logger.log(`[Azure DI] Submitting "${fileName}" (${mimeType}, ${buffer.length} bytes) via prebuilt-read`);
            let submitRes = await fetch(analyzeUrl, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': this.apiKey,
                    'Content-Type': this.getContentType(mimeType),
                },
                body: buffer,
            });
            if (!submitRes.ok && (submitRes.status === 404 || submitRes.status === 400)) {
                this.logger.log(`[Azure DI] New API path returned ${submitRes.status}, trying legacy formrecognizer path`);
                submitRes = await fetch(legacyAnalyzeUrl, {
                    method: 'POST',
                    headers: {
                        'Ocp-Apim-Subscription-Key': this.apiKey,
                        'Content-Type': this.getContentType(mimeType),
                    },
                    body: buffer,
                });
            }
            if (!submitRes.ok) {
                const errBody = await submitRes.text();
                this.logger.warn(`[Azure DI] Submit failed (${submitRes.status}): ${errBody.slice(0, 300)}`);
                return null;
            }
            const operationLocation = submitRes.headers.get('Operation-Location');
            if (!operationLocation) {
                this.logger.warn('Azure DI: no Operation-Location header in response');
                return null;
            }
            let result = null;
            const delays = [2000, 2000, 3000, 3000, 3000, 3000, 4000, 4000, 4000, 4000, 5000, 5000, 5000, 5000, 5000];
            for (let attempt = 0; attempt < delays.length; attempt++) {
                await new Promise((r) => setTimeout(r, delays[attempt]));
                const pollRes = await fetch(operationLocation, {
                    headers: { 'Ocp-Apim-Subscription-Key': this.apiKey },
                });
                if (!pollRes.ok) {
                    this.logger.warn(`[Azure DI] Poll failed (attempt ${attempt + 1}, status ${pollRes.status})`);
                    if (pollRes.status >= 500)
                        continue;
                    return null;
                }
                const pollData = (await pollRes.json());
                this.logger.debug(`[Azure DI] Poll attempt ${attempt + 1}: status=${pollData.status}`);
                if (pollData.status === 'succeeded') {
                    result = pollData.analyzeResult ?? null;
                    break;
                }
                if (pollData.status === 'failed') {
                    const errDetail = JSON.stringify(pollData.error ?? {});
                    this.logger.warn(`[Azure DI] Analysis failed for "${fileName}": ${errDetail}`);
                    return null;
                }
            }
            if (!result) {
                this.logger.warn(`[Azure DI] Timeout waiting for result for "${fileName}" (${delays.length} attempts)`);
                return null;
            }
            const fullText = result.content ?? '';
            const pages = (result.pages ?? []).map((p) => ({
                pageNumber: p.pageNumber,
                text: p.lines?.map((l) => l.content).join('\n') ?? '',
            }));
            const keyValuePairs = {};
            for (const kv of result.keyValuePairs ?? []) {
                const k = kv.key?.content?.trim();
                const v = kv.value?.content?.trim();
                if (k && v) {
                    keyValuePairs[k] = v;
                }
            }
            this.logger.log(`[Azure DI] Extracted ${fullText.length} chars, ${pages.length} pages, ` +
                `${Object.keys(keyValuePairs).length} key-value pairs from "${fileName}" in ${Date.now() - start}ms`);
            return {
                provider: this.name,
                fullText,
                pages,
                keyValuePairs: Object.keys(keyValuePairs).length > 0 ? keyValuePairs : undefined,
                pageCount: pages.length || 1,
                confidence: 0.95,
                processingTimeMs: Date.now() - start,
            };
        }
        catch (err) {
            this.logger.warn(`Azure DI extraction error for ${fileName}: ${err.message}`);
            return null;
        }
    }
    getContentType(mimeType) {
        return mimeType === 'application/pdf' ? 'application/pdf' : mimeType;
    }
};
exports.AzureDocumentIntelligenceProvider = AzureDocumentIntelligenceProvider;
exports.AzureDocumentIntelligenceProvider = AzureDocumentIntelligenceProvider = AzureDocumentIntelligenceProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AzureDocumentIntelligenceProvider);
//# sourceMappingURL=azure-document-intelligence.provider.js.map