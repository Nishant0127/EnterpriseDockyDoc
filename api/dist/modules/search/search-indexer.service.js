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
var SearchIndexerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchIndexerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const text_extractor_service_1 = require("./text-extractor.service");
let SearchIndexerService = SearchIndexerService_1 = class SearchIndexerService {
    constructor(prisma, extractor) {
        this.prisma = prisma;
        this.extractor = extractor;
        this.logger = new common_1.Logger(SearchIndexerService_1.name);
    }
    async indexDocument(documentId, file) {
        try {
            const doc = await this.prisma.document.findUnique({
                where: { id: documentId },
                include: {
                    tags: { include: { tag: { select: { name: true } } } },
                    metadata: { select: { key: true, value: true } },
                },
            });
            if (!doc) {
                this.logger.warn(`indexDocument: document ${documentId} not found`);
                return;
            }
            let fileText = null;
            if (file?.buffer?.length) {
                fileText = await this.extractor.extract(file.buffer, file.mimetype, file.originalname);
            }
            const parts = [
                doc.name,
                doc.description ?? '',
                doc.fileName,
                doc.fileType,
                doc.tags.map((t) => t.tag.name).join(' '),
                doc.metadata.map((m) => `${m.key} ${m.value}`).join(' '),
                fileText ?? '',
            ].map((s) => s.trim()).filter(Boolean);
            const extractedText = parts.join('\n');
            await this.prisma.documentSearchContent.upsert({
                where: { documentId },
                create: {
                    documentId,
                    extractedText,
                    lastIndexedAt: new Date(),
                },
                update: {
                    extractedText,
                    lastIndexedAt: new Date(),
                },
            });
            this.logger.debug(`Indexed doc ${documentId}: ${extractedText.length} chars` +
                (fileText ? ` (${fileText.length} from file)` : ' (metadata only)'));
        }
        catch (err) {
            this.logger.error(`Failed to index document ${documentId}: ${err.message}`);
        }
    }
};
exports.SearchIndexerService = SearchIndexerService;
exports.SearchIndexerService = SearchIndexerService = SearchIndexerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        text_extractor_service_1.TextExtractorService])
], SearchIndexerService);
//# sourceMappingURL=search-indexer.service.js.map