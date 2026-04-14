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
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const path = require("path");
const prisma_service_1 = require("../../prisma/prisma.service");
const local_storage_service_1 = require("../storage/local-storage.service");
const search_indexer_service_1 = require("../search/search-indexer.service");
const audit_service_1 = require("../audit/audit.service");
const ai_service_1 = require("../ai/ai.service");
const workspace_access_helper_1 = require("../../common/helpers/workspace-access.helper");
const DOC_LIST_INCLUDE = {
    folder: { select: { id: true, name: true } },
    owner: { select: { id: true, firstName: true, lastName: true, email: true } },
    tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
    _count: { select: { versions: true } },
};
const DOC_DETAIL_INCLUDE = {
    folder: { select: { id: true, name: true } },
    owner: { select: { id: true, firstName: true, lastName: true, email: true } },
    workspace: { select: { id: true, name: true } },
    tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
    versions: {
        include: {
            uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { versionNumber: 'desc' },
    },
    metadata: { orderBy: { key: 'asc' } },
    _count: { select: { versions: true } },
};
function buildStorageKey(workspaceId, documentId, versionNumber, originalName) {
    const sanitized = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${workspaceId}/${documentId}/v${versionNumber}/${sanitized}`;
}
function fileExtension(originalName) {
    return path.extname(originalName).replace('.', '').toLowerCase() || 'bin';
}
let DocumentsService = class DocumentsService {
    constructor(prisma, storage, indexer, audit, aiService) {
        this.prisma = prisma;
        this.storage = storage;
        this.indexer = indexer;
        this.audit = audit;
        this.aiService = aiService;
    }
    async findAll(query, user) {
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, query.workspaceId);
        const docs = await this.prisma.document.findMany({
            where: {
                workspaceId: query.workspaceId,
                status: query.status ?? { not: client_1.DocumentStatus.DELETED },
                ...(query.folderId && { folderId: query.folderId }),
                ...(query.ownerUserId && { ownerUserId: query.ownerUserId }),
            },
            include: DOC_LIST_INCLUDE,
            orderBy: { createdAt: 'desc' },
        });
        return docs.map((d) => this.toListItemDto(d));
    }
    async findById(id, user) {
        const doc = await this.prisma.document.findUnique({
            where: { id },
            include: DOC_DETAIL_INCLUDE,
        });
        if (!doc)
            throw new common_1.NotFoundException(`Document "${id}" not found`);
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, doc.workspaceId);
        return this.toDetailDto(doc);
    }
    async create(dto, user) {
        (0, workspace_access_helper_1.assertEditorOrAbove)(user, dto.workspaceId);
        const created = await this.prisma.$transaction(async (tx) => {
            const doc = await tx.document.create({
                data: {
                    workspaceId: dto.workspaceId,
                    folderId: dto.folderId ?? null,
                    ownerUserId: dto.ownerUserId,
                    name: dto.name,
                    description: dto.description ?? null,
                    fileName: dto.fileName,
                    fileType: dto.fileType,
                    status: client_1.DocumentStatus.ACTIVE,
                    currentVersionNumber: 1,
                },
            });
            await tx.documentVersion.create({
                data: {
                    documentId: doc.id,
                    versionNumber: 1,
                    storageKey: `pending/${dto.workspaceId}/${doc.id}/v1/${dto.fileName}`,
                    fileSizeBytes: BigInt(0),
                    mimeType: dto.mimeType,
                    uploadedById: dto.ownerUserId,
                },
            });
            return doc;
        });
        this.audit.log({
            workspaceId: dto.workspaceId,
            userId: user.id,
            action: audit_service_1.AuditAction.DOCUMENT_CREATED,
            entityType: audit_service_1.AuditEntityType.DOCUMENT,
            entityId: created.id,
            metadata: { documentName: dto.name, fileName: dto.fileName },
        });
        return this.findById(created.id, user);
    }
    async upload(dto, file, user) {
        (0, workspace_access_helper_1.assertEditorOrAbove)(user, dto.workspaceId);
        const ext = fileExtension(file.originalname);
        const { docId, storageKey } = await this.prisma.$transaction(async (tx) => {
            const doc = await tx.document.create({
                data: {
                    workspaceId: dto.workspaceId,
                    folderId: dto.folderId ?? null,
                    ownerUserId: user.id,
                    name: dto.name,
                    description: dto.description ?? null,
                    fileName: file.originalname,
                    fileType: ext,
                    status: client_1.DocumentStatus.ACTIVE,
                    currentVersionNumber: 1,
                },
            });
            const storageKey = buildStorageKey(dto.workspaceId, doc.id, 1, file.originalname);
            await tx.documentVersion.create({
                data: {
                    documentId: doc.id,
                    versionNumber: 1,
                    storageKey,
                    fileSizeBytes: BigInt(file.size),
                    mimeType: file.mimetype,
                    uploadedById: user.id,
                },
            });
            if (dto.tags) {
                const tagIds = dto.tags
                    .split(',')
                    .map((id) => id.trim())
                    .filter(Boolean);
                for (const tagId of tagIds) {
                    await tx.documentTagMapping
                        .create({ data: { documentId: doc.id, tagId } })
                        .catch(() => { });
                }
            }
            if (dto.metadata) {
                try {
                    const entries = JSON.parse(dto.metadata);
                    for (const entry of entries) {
                        if (entry.key && entry.value !== undefined) {
                            await tx.documentMetadata.create({
                                data: { documentId: doc.id, key: entry.key, value: String(entry.value) },
                            });
                        }
                    }
                }
                catch {
                }
            }
            return { docId: doc.id, storageKey };
        });
        await this.storage.save(storageKey, file.buffer);
        void this.indexer.indexDocument(docId, file);
        void this.aiService.extractDocument(docId).catch(() => { });
        this.audit.log({
            workspaceId: dto.workspaceId,
            userId: user.id,
            action: audit_service_1.AuditAction.DOCUMENT_CREATED,
            entityType: audit_service_1.AuditEntityType.DOCUMENT,
            entityId: docId,
            metadata: { documentName: dto.name, fileName: file.originalname },
        });
        return this.findById(docId, user);
    }
    async uploadVersion(id, file, _dto, user) {
        const existing = await this.prisma.document.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException(`Document "${id}" not found`);
        (0, workspace_access_helper_1.assertEditorOrAbove)(user, existing.workspaceId);
        const nextVersion = existing.currentVersionNumber + 1;
        const { storageKey } = await this.prisma.$transaction(async (tx) => {
            const storageKey = buildStorageKey(existing.workspaceId, id, nextVersion, file.originalname);
            await tx.documentVersion.create({
                data: {
                    documentId: id,
                    versionNumber: nextVersion,
                    storageKey,
                    fileSizeBytes: BigInt(file.size),
                    mimeType: file.mimetype,
                    uploadedById: user.id,
                },
            });
            await tx.document.update({
                where: { id },
                data: { currentVersionNumber: nextVersion },
            });
            return { storageKey };
        });
        await this.storage.save(storageKey, file.buffer);
        void this.indexer.indexDocument(id, file);
        void this.aiService.extractDocument(id).catch((err) => {
            console.warn(`[DocumentsService] AI re-extraction failed after version upload for ${id}: ${err.message}`);
        });
        this.audit.log({
            workspaceId: existing.workspaceId,
            userId: user.id,
            action: audit_service_1.AuditAction.DOCUMENT_VERSION_ADDED,
            entityType: audit_service_1.AuditEntityType.DOCUMENT,
            entityId: id,
            metadata: { documentName: existing.name, version: nextVersion },
        });
        return this.findById(id, user);
    }
    async getDownloadInfo(id, user) {
        const doc = await this.prisma.document.findUnique({
            where: { id },
            include: {
                versions: {
                    orderBy: { versionNumber: 'desc' },
                    take: 1,
                },
            },
        });
        if (!doc)
            throw new common_1.NotFoundException(`Document "${id}" not found`);
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, doc.workspaceId);
        const version = doc.versions[0];
        if (!version)
            throw new common_1.NotFoundException(`No versions found for document "${id}"`);
        if (!this.storage.exists(version.storageKey)) {
            throw new common_1.NotFoundException(`File not found in storage. The document may have been created before file upload was supported.`);
        }
        this.audit.log({
            workspaceId: doc.workspaceId,
            userId: user.id,
            action: audit_service_1.AuditAction.DOCUMENT_DOWNLOADED,
            entityType: audit_service_1.AuditEntityType.DOCUMENT,
            entityId: id,
            metadata: { documentName: doc.fileName, version: version.versionNumber },
        });
        return {
            absolutePath: this.storage.getAbsolutePath(version.storageKey),
            fileName: doc.fileName,
            mimeType: version.mimeType,
        };
    }
    async getVersionDownloadInfo(id, versionNumber, user) {
        const doc = await this.prisma.document.findUnique({ where: { id } });
        if (!doc)
            throw new common_1.NotFoundException(`Document "${id}" not found`);
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, doc.workspaceId);
        const version = await this.prisma.documentVersion.findUnique({
            where: { documentId_versionNumber: { documentId: id, versionNumber } },
        });
        if (!version) {
            throw new common_1.NotFoundException(`Version ${versionNumber} not found for document "${id}"`);
        }
        if (!this.storage.exists(version.storageKey)) {
            throw new common_1.NotFoundException(`File not found in storage for version ${versionNumber}.`);
        }
        return {
            absolutePath: this.storage.getAbsolutePath(version.storageKey),
            fileName: doc.fileName,
            mimeType: version.mimeType,
        };
    }
    async update(id, dto, user) {
        const existing = await this.prisma.document.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException(`Document "${id}" not found`);
        (0, workspace_access_helper_1.assertEditorOrAbove)(user, existing.workspaceId);
        const updated = await this.prisma.document.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.folderId !== undefined && { folderId: dto.folderId }),
                ...(dto.status !== undefined && { status: dto.status }),
                ...(dto.expiryDate !== undefined && {
                    expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
                }),
                ...(dto.renewalDueDate !== undefined && {
                    renewalDueDate: dto.renewalDueDate ? new Date(dto.renewalDueDate) : null,
                }),
                ...(dto.isReminderEnabled !== undefined && { isReminderEnabled: dto.isReminderEnabled }),
            },
            include: DOC_LIST_INCLUDE,
        });
        this.audit.log({
            workspaceId: existing.workspaceId,
            userId: user.id,
            action: audit_service_1.AuditAction.DOCUMENT_UPDATED,
            entityType: audit_service_1.AuditEntityType.DOCUMENT,
            entityId: id,
            metadata: { documentName: updated.name },
        });
        return this.toListItemDto(updated);
    }
    async softDelete(id, user) {
        const existing = await this.prisma.document.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException(`Document "${id}" not found`);
        (0, workspace_access_helper_1.assertEditorOrAbove)(user, existing.workspaceId);
        const deleted = await this.prisma.document.update({
            where: { id },
            data: { status: client_1.DocumentStatus.DELETED },
        });
        this.audit.log({
            workspaceId: existing.workspaceId,
            userId: user.id,
            action: audit_service_1.AuditAction.DOCUMENT_DELETED,
            entityType: audit_service_1.AuditEntityType.DOCUMENT,
            entityId: id,
            metadata: { documentName: existing.name },
        });
        return { id: deleted.id, status: deleted.status };
    }
    async shred(id, user) {
        const doc = await this.prisma.document.findUnique({
            where: { id },
            include: { versions: { select: { storageKey: true } } },
        });
        if (!doc)
            throw new common_1.NotFoundException(`Document "${id}" not found`);
        (0, workspace_access_helper_1.assertAdminOrAbove)(user, doc.workspaceId);
        if (doc.status !== client_1.DocumentStatus.DELETED) {
            throw new common_1.BadRequestException('Only soft-deleted documents can be shredded. Delete the document first.');
        }
        for (const version of doc.versions) {
            try {
                await this.storage.delete(version.storageKey);
            }
            catch {
            }
        }
        await this.prisma.document.delete({ where: { id } });
        this.audit.log({
            workspaceId: doc.workspaceId,
            userId: user.id,
            action: audit_service_1.AuditAction.DOCUMENT_SHREDDED,
            entityType: audit_service_1.AuditEntityType.DOCUMENT,
            entityId: id,
            metadata: { documentName: doc.name },
        });
    }
    async deleteVersion(id, versionNumber, user) {
        const doc = await this.prisma.document.findUnique({
            where: { id },
            include: { versions: { orderBy: { versionNumber: 'asc' } } },
        });
        if (!doc)
            throw new common_1.NotFoundException(`Document "${id}" not found`);
        (0, workspace_access_helper_1.assertEditorOrAbove)(user, doc.workspaceId);
        if (doc.versions.length <= 1) {
            throw new common_1.BadRequestException('Cannot delete the only version of a document. Delete the document instead.');
        }
        const version = doc.versions.find((v) => v.versionNumber === versionNumber);
        if (!version) {
            throw new common_1.NotFoundException(`Version ${versionNumber} not found for document "${id}"`);
        }
        let newCurrentVersion = doc.currentVersionNumber;
        if (versionNumber === doc.currentVersionNumber) {
            const remaining = doc.versions
                .filter((v) => v.versionNumber !== versionNumber)
                .map((v) => v.versionNumber);
            newCurrentVersion = Math.max(...remaining);
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.documentVersion.delete({
                where: { documentId_versionNumber: { documentId: id, versionNumber } },
            });
            if (newCurrentVersion !== doc.currentVersionNumber) {
                await tx.document.update({
                    where: { id },
                    data: { currentVersionNumber: newCurrentVersion },
                });
            }
        });
        try {
            await this.storage.delete(version.storageKey);
        }
        catch {
        }
        this.audit.log({
            workspaceId: doc.workspaceId,
            userId: user.id,
            action: audit_service_1.AuditAction.DOCUMENT_VERSION_ADDED,
            entityType: audit_service_1.AuditEntityType.DOCUMENT,
            entityId: id,
            metadata: { documentName: doc.name, deletedVersion: versionNumber, newCurrentVersion },
        });
        return this.findById(id, user);
    }
    async setTags(id, dto, user) {
        const doc = await this.prisma.document.findUnique({ where: { id } });
        if (!doc)
            throw new common_1.NotFoundException(`Document "${id}" not found`);
        (0, workspace_access_helper_1.assertEditorOrAbove)(user, doc.workspaceId);
        await this.prisma.$transaction(async (tx) => {
            await tx.documentTagMapping.deleteMany({ where: { documentId: id } });
            if (dto.tagIds.length > 0) {
                await tx.documentTagMapping.createMany({
                    data: dto.tagIds.map((tagId) => ({ documentId: id, tagId })),
                    skipDuplicates: true,
                });
            }
        });
        const updated = await this.prisma.document.findUnique({
            where: { id },
            include: {
                tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
            },
        });
        return (updated?.tags ?? []).map((t) => t.tag);
    }
    async setMetadata(id, entries, user) {
        const doc = await this.prisma.document.findUnique({ where: { id } });
        if (!doc)
            throw new common_1.NotFoundException(`Document "${id}" not found`);
        (0, workspace_access_helper_1.assertEditorOrAbove)(user, doc.workspaceId);
        await this.prisma.$transaction(async (tx) => {
            const keys = entries.map((e) => e.key);
            await tx.documentMetadata.deleteMany({
                where: { documentId: id, key: { notIn: keys } },
            });
            for (const entry of entries) {
                await tx.documentMetadata.upsert({
                    where: { documentId_key: { documentId: id, key: entry.key } },
                    create: { documentId: id, key: entry.key, value: entry.value },
                    update: { value: entry.value },
                });
            }
        });
        const updated = await this.prisma.documentMetadata.findMany({
            where: { documentId: id },
            orderBy: { key: 'asc' },
        });
        return updated.map((m) => ({ id: m.id, key: m.key, value: m.value }));
    }
    async getReminders(id, user) {
        const doc = await this.prisma.document.findUnique({ where: { id } });
        if (!doc)
            throw new common_1.NotFoundException(`Document "${id}" not found`);
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, doc.workspaceId);
        const reminders = await this.prisma.documentReminder.findMany({
            where: { documentId: id },
            orderBy: { remindAt: 'asc' },
        });
        return reminders.map((r) => ({
            id: r.id,
            documentId: r.documentId,
            remindAt: r.remindAt,
            channel: r.channel,
            status: r.status,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        }));
    }
    async setReminders(id, dto, user) {
        const doc = await this.prisma.document.findUnique({ where: { id } });
        if (!doc)
            throw new common_1.NotFoundException(`Document "${id}" not found`);
        (0, workspace_access_helper_1.assertEditorOrAbove)(user, doc.workspaceId);
        const expiryDate = dto.expiryDate !== undefined
            ? (dto.expiryDate ? new Date(dto.expiryDate) : null)
            : doc.expiryDate;
        await this.prisma.$transaction(async (tx) => {
            await tx.document.update({
                where: { id },
                data: {
                    ...(dto.expiryDate !== undefined && {
                        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
                    }),
                    ...(dto.renewalDueDate !== undefined && {
                        renewalDueDate: dto.renewalDueDate ? new Date(dto.renewalDueDate) : null,
                    }),
                    ...(dto.isReminderEnabled !== undefined && { isReminderEnabled: dto.isReminderEnabled }),
                },
            });
            await tx.documentReminder.updateMany({
                where: { documentId: id, status: 'PENDING' },
                data: { status: 'CANCELLED' },
            });
            if (expiryDate && dto.offsetDays && dto.offsetDays.length > 0) {
                const now = new Date();
                for (const days of dto.offsetDays) {
                    const remindAt = new Date(expiryDate);
                    remindAt.setDate(remindAt.getDate() - days);
                    if (remindAt > now) {
                        await tx.documentReminder.create({
                            data: {
                                documentId: id,
                                remindAt,
                                channel: dto.channel ?? 'IN_APP',
                                status: 'PENDING',
                            },
                        });
                    }
                }
            }
        });
        this.audit.log({
            workspaceId: doc.workspaceId,
            userId: user.id,
            action: audit_service_1.AuditAction.REMINDER_UPDATED,
            entityType: audit_service_1.AuditEntityType.REMINDER,
            entityId: id,
            metadata: {
                documentName: doc.name,
                isReminderEnabled: dto.isReminderEnabled,
                offsetDays: dto.offsetDays,
            },
        });
        return this.getReminders(id, user);
    }
    toDetailDto(doc) {
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
            workspace: doc.workspace,
            tags: doc.tags.map((t) => t.tag),
            versionCount: doc._count.versions,
            expiryDate: doc.expiryDate,
            renewalDueDate: doc.renewalDueDate,
            isReminderEnabled: doc.isReminderEnabled,
            versions: doc.versions.map((v) => ({
                id: v.id,
                versionNumber: v.versionNumber,
                storageKey: v.storageKey,
                fileSizeBytes: v.fileSizeBytes.toString(),
                mimeType: v.mimeType,
                uploadedBy: v.uploadedBy,
                createdAt: v.createdAt,
            })),
            metadata: doc.metadata,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
        };
    }
    toListItemDto(d) {
        return {
            id: d.id,
            workspaceId: d.workspaceId,
            name: d.name,
            fileName: d.fileName,
            fileType: d.fileType,
            status: d.status,
            currentVersionNumber: d.currentVersionNumber,
            folder: d.folder,
            owner: d.owner,
            tags: d.tags.map((t) => t.tag),
            versionCount: d._count.versions,
            expiryDate: d.expiryDate,
            renewalDueDate: d.renewalDueDate,
            isReminderEnabled: d.isReminderEnabled,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
        };
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        local_storage_service_1.LocalStorageService,
        search_indexer_service_1.SearchIndexerService,
        audit_service_1.AuditService,
        ai_service_1.AiService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map