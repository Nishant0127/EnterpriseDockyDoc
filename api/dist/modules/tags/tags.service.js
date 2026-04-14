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
exports.TagsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const workspace_access_helper_1 = require("../../common/helpers/workspace-access.helper");
let TagsService = class TagsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(workspaceId, user) {
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, workspaceId);
        return this.prisma.documentTag.findMany({
            where: { workspaceId },
            orderBy: { name: 'asc' },
        });
    }
    async create(dto, user) {
        (0, workspace_access_helper_1.assertEditorOrAbove)(user, dto.workspaceId);
        return this.prisma.documentTag.create({
            data: {
                workspaceId: dto.workspaceId,
                name: dto.name,
                color: dto.color ?? null,
            },
        });
    }
    async update(id, dto, user) {
        const tag = await this.prisma.documentTag.findUnique({ where: { id } });
        if (!tag)
            throw new common_1.NotFoundException(`Tag "${id}" not found`);
        (0, workspace_access_helper_1.assertEditorOrAbove)(user, tag.workspaceId);
        return this.prisma.documentTag.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.color !== undefined && { color: dto.color }),
            },
        });
    }
    async delete(id, user) {
        const tag = await this.prisma.documentTag.findUnique({ where: { id } });
        if (!tag)
            throw new common_1.NotFoundException(`Tag "${id}" not found`);
        (0, workspace_access_helper_1.assertEditorOrAbove)(user, tag.workspaceId);
        await this.prisma.documentTag.delete({ where: { id } });
    }
};
exports.TagsService = TagsService;
exports.TagsService = TagsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TagsService);
//# sourceMappingURL=tags.service.js.map