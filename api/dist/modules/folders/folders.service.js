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
exports.FoldersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const workspace_access_helper_1 = require("../../common/helpers/workspace-access.helper");
let FoldersService = class FoldersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(workspaceId, user) {
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, workspaceId);
        const folders = await this.prisma.folder.findMany({
            where: { workspaceId, deletedAt: null },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { documents: { where: { status: { not: client_1.DocumentStatus.DELETED } } }, children: { where: { deletedAt: null } } } },
            },
            orderBy: [{ parentFolderId: 'asc' }, { name: 'asc' }],
        });
        return folders.map((f) => ({
            id: f.id,
            workspaceId: f.workspaceId,
            name: f.name,
            parentFolderId: f.parentFolderId,
            createdBy: f.createdBy,
            documentCount: f._count.documents,
            childCount: f._count.children,
            deletedAt: null,
            createdAt: f.createdAt,
            updatedAt: f.updatedAt,
        }));
    }
    async findDeleted(workspaceId, user) {
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, workspaceId);
        const folders = await this.prisma.folder.findMany({
            where: { workspaceId, deletedAt: { not: null } },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { documents: { where: { status: client_1.DocumentStatus.DELETED } }, children: true } },
            },
            orderBy: [{ deletedAt: 'desc' }],
        });
        return folders.map((f) => ({
            id: f.id,
            workspaceId: f.workspaceId,
            name: f.name,
            parentFolderId: f.parentFolderId,
            createdBy: f.createdBy,
            documentCount: f._count.documents,
            childCount: f._count.children,
            deletedAt: f.deletedAt,
            createdAt: f.createdAt,
            updatedAt: f.updatedAt,
        }));
    }
    async findById(id, user) {
        const folder = await this.prisma.folder.findUnique({
            where: { id },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { documents: { where: { status: { not: client_1.DocumentStatus.DELETED } } }, children: { where: { deletedAt: null } } } },
                children: { where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } },
            },
        });
        if (!folder)
            throw new common_1.NotFoundException(`Folder "${id}" not found`);
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, folder.workspaceId);
        return {
            id: folder.id,
            workspaceId: folder.workspaceId,
            name: folder.name,
            parentFolderId: folder.parentFolderId,
            createdBy: folder.createdBy,
            documentCount: folder._count.documents,
            childCount: folder._count.children,
            children: folder.children,
            deletedAt: folder.deletedAt,
            createdAt: folder.createdAt,
            updatedAt: folder.updatedAt,
        };
    }
    async create(dto, user) {
        (0, workspace_access_helper_1.assertEditorOrAbove)(user, dto.workspaceId);
        if (dto.parentFolderId) {
            const parent = await this.prisma.folder.findUnique({
                where: { id: dto.parentFolderId },
            });
            if (!parent || parent.workspaceId !== dto.workspaceId) {
                throw new common_1.NotFoundException(`Parent folder "${dto.parentFolderId}" not found in workspace`);
            }
            let depth = 1;
            let current = parent;
            while (current.parentFolderId) {
                depth++;
                if (depth >= 5) {
                    throw new common_1.BadRequestException('Maximum folder nesting depth of 5 levels reached');
                }
                const next = await this.prisma.folder.findUnique({ where: { id: current.parentFolderId } });
                if (!next)
                    break;
                current = next;
            }
        }
        const folder = await this.prisma.folder.create({
            data: {
                workspaceId: dto.workspaceId,
                name: dto.name,
                parentFolderId: dto.parentFolderId ?? null,
                createdById: user.id,
            },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { documents: { where: { status: { not: client_1.DocumentStatus.DELETED } } }, children: { where: { deletedAt: null } } } },
            },
        });
        return {
            id: folder.id,
            workspaceId: folder.workspaceId,
            name: folder.name,
            parentFolderId: folder.parentFolderId,
            createdBy: folder.createdBy,
            documentCount: folder._count.documents,
            childCount: folder._count.children,
            deletedAt: null,
            createdAt: folder.createdAt,
            updatedAt: folder.updatedAt,
        };
    }
    async rename(id, dto, user) {
        const existing = await this.prisma.folder.findUnique({
            where: { id },
            select: { workspaceId: true },
        });
        if (!existing)
            throw new common_1.NotFoundException(`Folder "${id}" not found`);
        (0, workspace_access_helper_1.assertEditorOrAbove)(user, existing.workspaceId);
        const folder = await this.prisma.folder.update({
            where: { id },
            data: { name: dto.name },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { documents: { where: { status: { not: client_1.DocumentStatus.DELETED } } }, children: { where: { deletedAt: null } } } },
            },
        });
        return {
            id: folder.id,
            workspaceId: folder.workspaceId,
            name: folder.name,
            parentFolderId: folder.parentFolderId,
            createdBy: folder.createdBy,
            documentCount: folder._count.documents,
            childCount: folder._count.children,
            deletedAt: folder.deletedAt,
            createdAt: folder.createdAt,
            updatedAt: folder.updatedAt,
        };
    }
    async delete(id, user) {
        const folder = await this.prisma.folder.findUnique({
            where: { id },
            select: { workspaceId: true, name: true, deletedAt: true },
        });
        if (!folder)
            throw new common_1.NotFoundException(`Folder "${id}" not found`);
        if (folder.deletedAt)
            throw new common_1.BadRequestException(`Folder is already in trash`);
        (0, workspace_access_helper_1.assertEditorOrAbove)(user, folder.workspaceId);
        const allFolderIds = await this.collectDescendants(id);
        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.folder.updateMany({
                where: { id: { in: allFolderIds } },
                data: { deletedAt: now },
            }),
            this.prisma.document.updateMany({
                where: {
                    folderId: { in: allFolderIds },
                    status: { not: client_1.DocumentStatus.DELETED },
                },
                data: { status: client_1.DocumentStatus.DELETED },
            }),
        ]);
    }
    async restore(id, user) {
        const folder = await this.prisma.folder.findUnique({
            where: { id },
            select: { workspaceId: true, name: true, deletedAt: true },
        });
        if (!folder)
            throw new common_1.NotFoundException(`Folder "${id}" not found`);
        if (!folder.deletedAt)
            throw new common_1.BadRequestException(`Folder is not in trash`);
        (0, workspace_access_helper_1.assertEditorOrAbove)(user, folder.workspaceId);
        const allFolderIds = await this.collectDeletedDescendants(id);
        await this.prisma.$transaction([
            this.prisma.folder.updateMany({
                where: { id: { in: allFolderIds } },
                data: { deletedAt: null },
            }),
            this.prisma.document.updateMany({
                where: {
                    folderId: { in: allFolderIds },
                    status: client_1.DocumentStatus.DELETED,
                },
                data: { status: client_1.DocumentStatus.ACTIVE },
            }),
        ]);
    }
    async collectDescendants(rootId) {
        const ids = [rootId];
        const queue = [rootId];
        while (queue.length > 0) {
            const parentId = queue.shift();
            const children = await this.prisma.folder.findMany({
                where: { parentFolderId: parentId, deletedAt: null },
                select: { id: true },
            });
            for (const child of children) {
                ids.push(child.id);
                queue.push(child.id);
            }
        }
        return ids;
    }
    async collectDeletedDescendants(rootId) {
        const ids = [rootId];
        const queue = [rootId];
        while (queue.length > 0) {
            const parentId = queue.shift();
            const children = await this.prisma.folder.findMany({
                where: { parentFolderId: parentId, deletedAt: { not: null } },
                select: { id: true },
            });
            for (const child of children) {
                ids.push(child.id);
                queue.push(child.id);
            }
        }
        return ids;
    }
};
exports.FoldersService = FoldersService;
exports.FoldersService = FoldersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FoldersService);
//# sourceMappingURL=folders.service.js.map