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
exports.SharesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const local_storage_service_1 = require("../storage/local-storage.service");
const audit_service_1 = require("../audit/audit.service");
const workspace_access_helper_1 = require("../../common/helpers/workspace-access.helper");
const share_crypto_util_1 = require("./share-crypto.util");
const USER_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
};
const MAX_VERIFY_ATTEMPTS = 10;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;
let SharesService = class SharesService {
    constructor(prisma, storage, audit) {
        this.prisma = prisma;
        this.storage = storage;
        this.audit = audit;
        this.verifyAttempts = new Map();
        if (!process.env.SHARE_GRANT_SECRET) {
            throw new Error('SHARE_GRANT_SECRET environment variable is not set. ' +
                'Set a strong random secret (≥32 chars) before starting the server. ' +
                'Example: openssl rand -hex 32');
        }
    }
    checkVerifyRateLimit(token, ip) {
        const key = `${token}:${ip}`;
        const now = Date.now();
        const entry = this.verifyAttempts.get(key);
        if (!entry || now - entry.firstAt > VERIFY_WINDOW_MS) {
            this.verifyAttempts.set(key, { count: 1, firstAt: now });
            return;
        }
        if (entry.count >= MAX_VERIFY_ATTEMPTS) {
            const retryAfterSec = Math.ceil((VERIFY_WINDOW_MS - (now - entry.firstAt)) / 1000);
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                message: `Too many verification attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
                retryAfter: retryAfterSec,
            }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        entry.count++;
    }
    clearVerifyRateLimit(token, ip) {
        this.verifyAttempts.delete(`${token}:${ip}`);
    }
    async createInternalShare(documentId, dto, user) {
        const doc = await this.requireAccessibleDocument(documentId, user);
        const workspaceMembers = await this.prisma.workspaceUser.findMany({
            where: {
                workspaceId: doc.workspaceId,
                userId: { in: dto.userIds },
                status: 'ACTIVE',
            },
            select: { userId: true },
        });
        const validUserIds = new Set(workspaceMembers.map((m) => m.userId));
        const invalidIds = dto.userIds.filter((id) => !validUserIds.has(id));
        if (invalidIds.length > 0) {
            throw new common_1.BadRequestException(`User(s) not found in this workspace: ${invalidIds.join(', ')}`);
        }
        let share = await this.prisma.documentShare.findFirst({
            where: { documentId, shareType: 'INTERNAL', isActive: true, createdById: user.id },
        });
        if (!share) {
            share = await this.prisma.documentShare.create({
                data: {
                    documentId,
                    createdById: user.id,
                    shareType: 'INTERNAL',
                    allowDownload: dto.permission === 'DOWNLOAD',
                    isActive: true,
                },
            });
        }
        const results = [];
        for (const userId of dto.userIds) {
            const internal = await this.prisma.internalDocumentShare.upsert({
                where: {
                    documentShareId_sharedWithUserId: {
                        documentShareId: share.id,
                        sharedWithUserId: userId,
                    },
                },
                update: { permission: dto.permission },
                create: {
                    documentShareId: share.id,
                    sharedWithUserId: userId,
                    permission: dto.permission,
                },
                include: { sharedWithUser: { select: USER_SELECT } },
            });
            results.push({
                id: internal.id,
                shareId: share.id,
                sharedWith: internal.sharedWithUser,
                permission: internal.permission,
                createdAt: internal.createdAt.toISOString(),
            });
        }
        if (results.length > 0) {
            this.audit.log({
                workspaceId: doc.workspaceId,
                userId: user.id,
                action: audit_service_1.AuditAction.DOCUMENT_SHARED_INTERNAL,
                entityType: audit_service_1.AuditEntityType.SHARE,
                entityId: share.id,
                metadata: { documentName: doc.name, sharedWithCount: results.length },
            });
        }
        return results;
    }
    async createExternalShare(documentId, dto, user) {
        const doc = await this.requireAccessibleDocument(documentId, user);
        const token = (0, share_crypto_util_1.generateShareToken)();
        const passwordHash = dto.password ? (0, share_crypto_util_1.hashPassword)(dto.password) : null;
        const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
        const share = await this.prisma.documentShare.create({
            data: {
                documentId,
                createdById: user.id,
                shareType: 'EXTERNAL_LINK',
                token,
                passwordHash,
                expiresAt,
                allowDownload: dto.allowDownload,
                isActive: true,
            },
            include: { createdBy: { select: USER_SELECT } },
        });
        this.audit.log({
            workspaceId: doc.workspaceId,
            userId: user.id,
            action: audit_service_1.AuditAction.DOCUMENT_SHARED_EXTERNAL,
            entityType: audit_service_1.AuditEntityType.SHARE,
            entityId: share.id,
            metadata: {
                documentName: doc.name,
                hasPassword: !!dto.password,
                allowDownload: dto.allowDownload,
            },
        });
        return this.toExternalShareDto(share);
    }
    async getDocumentShares(documentId, user) {
        const doc = await this.requireReadableDocument(documentId, user);
        const shares = await this.prisma.documentShare.findMany({
            where: { documentId, isActive: true },
            include: {
                createdBy: { select: USER_SELECT },
                internalShares: {
                    include: { sharedWithUser: { select: USER_SELECT } },
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const internalShares = [];
        const externalShares = [];
        for (const share of shares) {
            if (share.shareType === 'INTERNAL') {
                for (const is of share.internalShares) {
                    internalShares.push({
                        id: is.id,
                        shareId: share.id,
                        sharedWith: is.sharedWithUser,
                        permission: is.permission,
                        createdAt: is.createdAt.toISOString(),
                    });
                }
            }
            else {
                externalShares.push(this.toExternalShareDto(share));
            }
        }
        return { internalShares, externalShares };
    }
    async revokeShare(shareId, user) {
        const share = await this.prisma.documentShare.findUnique({
            where: { id: shareId },
            include: { document: { select: { workspaceId: true } } },
        });
        if (!share)
            throw new common_1.NotFoundException(`Share "${shareId}" not found`);
        const membership = user.workspaces.find((w) => w.workspaceId === share.document.workspaceId && w.status === 'ACTIVE');
        if (!membership) {
            throw new common_1.ForbiddenException('You are not a member of this workspace.');
        }
        const isCreator = share.createdById === user.id;
        const isAdminOrOwner = ['ADMIN', 'OWNER'].includes(membership.role);
        if (!isCreator && !isAdminOrOwner) {
            throw new common_1.ForbiddenException('Only the share creator or an Admin/Owner can revoke this share.');
        }
        if (!share.isActive) {
            throw new common_1.ConflictException('Share is already revoked');
        }
        await this.prisma.documentShare.update({
            where: { id: shareId },
            data: { isActive: false },
        });
        this.audit.log({
            workspaceId: share.document.workspaceId,
            userId: user.id,
            action: audit_service_1.AuditAction.SHARE_REVOKED,
            entityType: audit_service_1.AuditEntityType.SHARE,
            entityId: shareId,
            metadata: { shareType: share.shareType },
        });
    }
    async getPublicShareInfo(token, ipAddress, userAgent) {
        const share = await this.findValidPublicShare(token);
        await this.prisma.shareAccessLog.create({
            data: {
                documentShareId: share.id,
                accessType: 'VIEW',
                ipAddress: ipAddress ?? null,
                userAgent: userAgent ?? null,
            },
        });
        return {
            id: share.id,
            documentId: share.documentId,
            documentName: share.document.name,
            allowDownload: share.allowDownload,
            expiresAt: share.expiresAt?.toISOString() ?? null,
            requiresPassword: !!share.passwordHash,
            shareType: share.shareType,
        };
    }
    async verifySharePassword(token, password, ip) {
        this.checkVerifyRateLimit(token, ip);
        const share = await this.findValidPublicShare(token);
        if (!share.passwordHash) {
            throw new common_1.BadRequestException('This share is not password protected');
        }
        if (!(0, share_crypto_util_1.verifyPassword)(password, share.passwordHash)) {
            throw new common_1.UnauthorizedException('Incorrect password');
        }
        this.clearVerifyRateLimit(token, ip);
        const { grant, expiresIn } = (0, share_crypto_util_1.createAccessGrant)(share.id);
        return { accessGrant: grant, expiresIn };
    }
    async getPublicShareDownloadInfo(token, grant, ipAddress, userAgent) {
        const share = await this.findValidPublicShare(token);
        if (!share.allowDownload) {
            throw new common_1.ForbiddenException('Download is not allowed for this share');
        }
        if (share.passwordHash) {
            const grantShareId = grant ? (0, share_crypto_util_1.verifyAccessGrant)(grant) : null;
            if (grantShareId !== share.id) {
                throw new common_1.UnauthorizedException('A valid access grant is required. Verify the password via POST /verify first.');
            }
        }
        const version = await this.prisma.documentVersion.findFirst({
            where: { documentId: share.documentId },
            orderBy: { versionNumber: 'desc' },
        });
        if (!version)
            throw new common_1.NotFoundException('No file version found');
        if (!this.storage.exists(version.storageKey)) {
            throw new common_1.NotFoundException('File not found in storage');
        }
        await this.prisma.shareAccessLog.create({
            data: {
                documentShareId: share.id,
                accessType: 'DOWNLOAD',
                ipAddress: ipAddress ?? null,
                userAgent: userAgent ?? null,
            },
        });
        this.audit.log({
            workspaceId: share.document.workspaceId,
            userId: null,
            action: audit_service_1.AuditAction.DOCUMENT_DOWNLOADED,
            entityType: audit_service_1.AuditEntityType.DOCUMENT,
            entityId: share.documentId,
            metadata: { documentName: share.document.name, external: true, shareId: share.id },
        });
        return {
            absolutePath: this.storage.getAbsolutePath(version.storageKey),
            fileName: share.document.fileName,
            mimeType: version.mimeType,
        };
    }
    async requireReadableDocument(documentId, user) {
        const doc = await this.prisma.document.findUnique({
            where: { id: documentId },
            select: { id: true, workspaceId: true, status: true, name: true, fileName: true },
        });
        if (!doc)
            throw new common_1.NotFoundException(`Document "${documentId}" not found`);
        if (doc.status === client_1.DocumentStatus.DELETED) {
            throw new common_1.BadRequestException('Document has been deleted');
        }
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, doc.workspaceId);
        return doc;
    }
    async requireAccessibleDocument(documentId, user) {
        const doc = await this.prisma.document.findUnique({
            where: { id: documentId },
            select: { id: true, workspaceId: true, status: true, name: true, fileName: true },
        });
        if (!doc)
            throw new common_1.NotFoundException(`Document "${documentId}" not found`);
        if (doc.status === client_1.DocumentStatus.DELETED) {
            throw new common_1.BadRequestException('Cannot share a deleted document');
        }
        (0, workspace_access_helper_1.assertEditorOrAbove)(user, doc.workspaceId);
        return doc;
    }
    async findValidPublicShare(token) {
        const share = await this.prisma.documentShare.findUnique({
            where: { token },
            include: {
                document: {
                    select: { id: true, name: true, fileName: true, status: true, workspaceId: true },
                },
            },
        });
        if (!share)
            throw new common_1.NotFoundException('Share not found');
        if (!share.isActive)
            throw new common_1.ForbiddenException('This share has been revoked');
        if (share.expiresAt && share.expiresAt < new Date()) {
            throw new common_1.ForbiddenException('This share link has expired');
        }
        if (share.document.status === client_1.DocumentStatus.DELETED) {
            throw new common_1.ForbiddenException('The document associated with this share no longer exists');
        }
        return share;
    }
    toExternalShareDto(share) {
        return {
            id: share.id,
            token: share.token ?? '',
            expiresAt: share.expiresAt?.toISOString() ?? null,
            allowDownload: share.allowDownload,
            hasPassword: !!share.passwordHash,
            isActive: share.isActive,
            createdAt: share.createdAt.toISOString(),
            createdBy: share.createdBy,
        };
    }
};
exports.SharesService = SharesService;
exports.SharesService = SharesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        local_storage_service_1.LocalStorageService,
        audit_service_1.AuditService])
], SharesService);
//# sourceMappingURL=shares.service.js.map