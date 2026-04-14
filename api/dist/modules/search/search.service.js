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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const workspace_access_helper_1 = require("../../common/helpers/workspace-access.helper");
const SEARCH_INCLUDE = {
    folder: { select: { id: true, name: true } },
    owner: { select: { id: true, firstName: true, lastName: true, email: true } },
    tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
    searchContent: { select: { extractedText: true } },
    _count: { select: { versions: true } },
};
function buildSnippet(text, query, contextChars = 120) {
    if (!text)
        return undefined;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(query.toLowerCase());
    if (idx === -1)
        return undefined;
    const start = Math.max(0, idx - Math.floor(contextChars / 2));
    const end = Math.min(text.length, idx + query.length + Math.ceil(contextChars / 2));
    const raw = text.slice(start, end).replace(/\s+/g, ' ').trim();
    return (start > 0 ? '…' : '') + raw + (end < text.length ? '…' : '');
}
let SearchService = class SearchService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async search(query, user) {
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, query.workspaceId);
        const q = query.q.trim();
        const docs = await this.prisma.document.findMany({
            where: {
                workspaceId: query.workspaceId,
                status: query.status ?? { not: client_1.DocumentStatus.DELETED },
                ...(query.folderId && { folderId: query.folderId }),
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                    { fileName: { contains: q, mode: 'insensitive' } },
                    { tags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } },
                    { metadata: { some: { value: { contains: q, mode: 'insensitive' } } } },
                    { metadata: { some: { key: { contains: q, mode: 'insensitive' } } } },
                    {
                        searchContent: {
                            extractedText: { contains: q, mode: 'insensitive' },
                        },
                    },
                ],
            },
            include: SEARCH_INCLUDE,
            orderBy: { updatedAt: 'desc' },
            take: 50,
        });
        return docs.map((doc) => {
            const snippet = buildSnippet(doc.searchContent?.extractedText, q);
            return {
                id: doc.id,
                workspaceId: doc.workspaceId,
                name: doc.name,
                description: doc.description,
                fileName: doc.fileName,
                fileType: doc.fileType,
                status: doc.status,
                currentVersionNumber: doc.currentVersionNumber,
                folder: doc.folder,
                owner: doc.owner,
                tags: doc.tags.map((t) => t.tag),
                versionCount: doc._count.versions,
                snippet,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        });
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SearchService);
//# sourceMappingURL=search.service.js.map