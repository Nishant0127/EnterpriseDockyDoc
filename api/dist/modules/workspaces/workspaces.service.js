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
exports.WorkspacesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const workspace_access_helper_1 = require("../../common/helpers/workspace-access.helper");
const encryption_service_1 = require("../../common/services/encryption.service");
const ai_settings_dto_1 = require("./dto/ai-settings.dto");
const MANAGER_ROLES = new Set([
    client_1.WorkspaceUserRole.OWNER,
    client_1.WorkspaceUserRole.ADMIN,
]);
let WorkspacesService = class WorkspacesService {
    constructor(prisma, audit, encryption) {
        this.prisma = prisma;
        this.audit = audit;
        this.encryption = encryption;
    }
    async findAll(user) {
        const memberWorkspaceIds = user.workspaces
            .filter((w) => w.status === 'ACTIVE')
            .map((w) => w.workspaceId);
        if (memberWorkspaceIds.length === 0)
            return [];
        const workspaces = await this.prisma.workspace.findMany({
            where: {
                id: { in: memberWorkspaceIds },
                status: 'ACTIVE',
            },
            include: {
                _count: { select: { members: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return workspaces.map((ws) => ({
            id: ws.id,
            name: ws.name,
            slug: ws.slug,
            type: ws.type,
            status: ws.status,
            memberCount: ws._count.members,
            createdAt: ws.createdAt,
            updatedAt: ws.updatedAt,
        }));
    }
    async findById(id, user) {
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, id);
        const workspace = await this.prisma.workspace.findUnique({
            where: { id },
            include: {
                members: {
                    where: { status: 'ACTIVE' },
                    include: { user: true },
                    orderBy: { createdAt: 'asc' },
                },
                _count: { select: { documents: true } },
            },
        });
        if (!workspace) {
            throw new common_1.NotFoundException(`Workspace "${id}" not found`);
        }
        const members = workspace.members.map((m) => ({
            id: m.id,
            userId: m.userId,
            firstName: m.user.firstName,
            lastName: m.user.lastName,
            email: m.user.email,
            role: m.role,
            status: m.status,
            joinedAt: m.createdAt,
        }));
        return {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            type: workspace.type,
            status: workspace.status,
            memberCount: members.length,
            documentCount: workspace._count.documents,
            members,
            createdAt: workspace.createdAt,
            updatedAt: workspace.updatedAt,
        };
    }
    async getSummary(workspaceId, user) {
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, workspaceId);
        const now = new Date();
        const ninetyDaysOut = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const [totalDocuments, activeDocuments, archivedDocuments, expiringCount, expiredCount, activeShares, memberCount, recentUploads,] = await Promise.all([
            this.prisma.document.count({ where: { workspaceId, status: { not: 'DELETED' } } }),
            this.prisma.document.count({ where: { workspaceId, status: 'ACTIVE' } }),
            this.prisma.document.count({ where: { workspaceId, status: 'ARCHIVED' } }),
            this.prisma.document.count({
                where: {
                    workspaceId,
                    status: 'ACTIVE',
                    expiryDate: { gte: now, lte: ninetyDaysOut },
                },
            }),
            this.prisma.document.count({
                where: { workspaceId, status: 'ACTIVE', expiryDate: { lt: now } },
            }),
            this.prisma.documentShare.count({
                where: {
                    document: { workspaceId },
                    isActive: true,
                    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
            }),
            this.prisma.workspaceUser.count({ where: { workspaceId, status: 'ACTIVE' } }),
            this.prisma.document.count({
                where: { workspaceId, status: 'ACTIVE', createdAt: { gte: sevenDaysAgo } },
            }),
        ]);
        return {
            totalDocuments,
            activeDocuments,
            archivedDocuments,
            expiringCount,
            expiredCount,
            activeShares,
            memberCount,
            recentUploads,
        };
    }
    async update(workspaceId, dto, currentUser) {
        (0, workspace_access_helper_1.assertAdminOrAbove)(currentUser, workspaceId);
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { _count: { select: { members: true } } },
        });
        if (!workspace)
            throw new common_1.NotFoundException(`Workspace "${workspaceId}" not found`);
        const updated = await this.prisma.workspace.update({
            where: { id: workspaceId },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
            },
            include: { _count: { select: { members: true } } },
        });
        return {
            id: updated.id,
            name: updated.name,
            slug: updated.slug,
            type: updated.type,
            status: updated.status,
            memberCount: updated._count.members,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
    }
    async addMember(workspaceId, dto, currentUser) {
        this.assertManagerRole(currentUser, workspaceId);
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
        });
        if (!workspace)
            throw new common_1.NotFoundException(`Workspace "${workspaceId}" not found`);
        let user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    email: dto.email,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    isActive: true,
                },
            });
        }
        const existing = await this.prisma.workspaceUser.findUnique({
            where: {
                userId_workspaceId: { userId: user.id, workspaceId },
            },
        });
        if (existing?.status === client_1.WorkspaceUserStatus.ACTIVE) {
            throw new common_1.ConflictException(`${dto.email} is already an active member of this workspace`);
        }
        const membership = existing
            ? await this.prisma.workspaceUser.update({
                where: { id: existing.id },
                data: { role: dto.role, status: client_1.WorkspaceUserStatus.ACTIVE },
                include: { user: true },
            })
            : await this.prisma.workspaceUser.create({
                data: {
                    workspaceId,
                    userId: user.id,
                    role: dto.role,
                    status: client_1.WorkspaceUserStatus.ACTIVE,
                },
                include: { user: true },
            });
        this.audit.log({
            workspaceId,
            userId: currentUser.id,
            action: audit_service_1.AuditAction.MEMBER_ADDED,
            entityType: audit_service_1.AuditEntityType.USER,
            entityId: user.id,
            metadata: { email: dto.email, role: dto.role },
        });
        return this.toMemberDto(membership);
    }
    async updateMember(workspaceId, memberId, dto, currentUser) {
        this.assertManagerRole(currentUser, workspaceId);
        const membership = await this.prisma.workspaceUser.findFirst({
            where: { id: memberId, workspaceId },
            include: { user: true },
        });
        if (!membership)
            throw new common_1.NotFoundException('Member not found');
        if (membership.userId === currentUser.id) {
            throw new common_1.ForbiddenException('You cannot modify your own workspace membership.');
        }
        if (dto.role === client_1.WorkspaceUserRole.OWNER) {
            const callerMembership = currentUser.workspaces.find((w) => w.workspaceId === workspaceId);
            if (callerMembership?.role !== client_1.WorkspaceUserRole.OWNER) {
                throw new common_1.ForbiddenException('Only an existing Owner can grant the Owner role.');
            }
        }
        if (membership.role === client_1.WorkspaceUserRole.OWNER &&
            (dto.role !== client_1.WorkspaceUserRole.OWNER ||
                dto.status === client_1.WorkspaceUserStatus.REMOVED)) {
            const ownerCount = await this.prisma.workspaceUser.count({
                where: {
                    workspaceId,
                    role: client_1.WorkspaceUserRole.OWNER,
                    status: client_1.WorkspaceUserStatus.ACTIVE,
                },
            });
            if (ownerCount <= 1) {
                throw new common_1.BadRequestException('Cannot change or remove the only owner of this workspace');
            }
        }
        const updated = await this.prisma.workspaceUser.update({
            where: { id: memberId },
            data: {
                ...(dto.role !== undefined && { role: dto.role }),
                ...(dto.status !== undefined && { status: dto.status }),
            },
            include: { user: true },
        });
        if (dto.firstName !== undefined || dto.lastName !== undefined || dto.email !== undefined) {
            await this.prisma.user.update({
                where: { id: membership.userId },
                data: {
                    ...(dto.firstName !== undefined && { firstName: dto.firstName }),
                    ...(dto.lastName !== undefined && { lastName: dto.lastName }),
                    ...(dto.email !== undefined && { email: dto.email }),
                },
            });
        }
        this.audit.log({
            workspaceId,
            userId: currentUser.id,
            action: audit_service_1.AuditAction.MEMBER_ROLE_UPDATED,
            entityType: audit_service_1.AuditEntityType.USER,
            entityId: membership.userId,
            metadata: {
                email: membership.user.email,
                ...(dto.role && { newRole: dto.role }),
                ...(dto.status && { newStatus: dto.status }),
            },
        });
        return this.toMemberDto(updated);
    }
    async getAiSettings(workspaceId, user) {
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, workspaceId);
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                plan: true,
                aiProvider: true,
                aiProviderType: true,
                aiApiKeyEncrypted: true,
                aiUsageTokens: true,
            },
        });
        if (!workspace)
            throw new common_1.NotFoundException(`Workspace "${workspaceId}" not found`);
        const limit = ai_settings_dto_1.PLAN_TOKEN_LIMITS[workspace.plan] ?? ai_settings_dto_1.PLAN_TOKEN_LIMITS['FREE'];
        const used = workspace.aiUsageTokens;
        return {
            plan: workspace.plan,
            aiProvider: workspace.aiProvider,
            aiProviderType: workspace.aiProviderType,
            hasApiKey: !!workspace.aiApiKeyEncrypted,
            aiUsageTokens: used,
            aiUsageLimit: limit,
            aiUsagePercent: limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0,
        };
    }
    async updateAiSettings(workspaceId, dto, user) {
        (0, workspace_access_helper_1.assertAdminOrAbove)(user, workspaceId);
        const updateData = {};
        if (dto.aiProvider !== undefined)
            updateData.aiProvider = dto.aiProvider;
        if (dto.aiProviderType !== undefined)
            updateData.aiProviderType = dto.aiProviderType;
        if (dto.apiKey !== undefined) {
            updateData.aiApiKeyEncrypted = this.encryption.encrypt(dto.apiKey);
        }
        await this.prisma.workspace.update({
            where: { id: workspaceId },
            data: updateData,
        });
        return this.getAiSettings(workspaceId, user);
    }
    assertManagerRole(user, workspaceId) {
        const membership = user.workspaces.find((w) => w.workspaceId === workspaceId);
        if (!membership) {
            throw new common_1.ForbiddenException('You are not a member of this workspace');
        }
        if (!MANAGER_ROLES.has(membership.role)) {
            throw new common_1.ForbiddenException('Only OWNER or ADMIN can manage workspace members');
        }
    }
    toMemberDto(m) {
        return {
            id: m.id,
            userId: m.userId,
            firstName: m.user.firstName,
            lastName: m.user.lastName,
            email: m.user.email,
            role: m.role,
            status: m.status,
            joinedAt: m.createdAt,
        };
    }
};
exports.WorkspacesService = WorkspacesService;
exports.WorkspacesService = WorkspacesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        encryption_service_1.EncryptionService])
], WorkspacesService);
//# sourceMappingURL=workspaces.service.js.map