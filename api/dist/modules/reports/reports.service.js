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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ReportsService = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assertMember(workspaceId, userId) {
        const membership = await this.prisma.workspaceUser.findUnique({
            where: { userId_workspaceId: { userId, workspaceId } },
        });
        if (!membership)
            throw new common_1.ForbiddenException('Not a member of this workspace');
    }
    async getExpiringDocuments(workspaceId, user, days = 30) {
        await this.assertMember(workspaceId, user.id);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + days);
        const docs = await this.prisma.document.findMany({
            where: {
                workspaceId,
                status: 'ACTIVE',
                expiryDate: { lte: cutoff, gte: new Date() },
            },
            include: { owner: { select: { firstName: true, lastName: true, email: true } }, folder: { select: { name: true } } },
            orderBy: { expiryDate: 'asc' },
        });
        return {
            reportType: 'expiring_documents',
            generatedAt: new Date().toISOString(),
            parameters: { days },
            total: docs.length,
            items: docs.map((d) => ({
                id: d.id,
                name: d.name,
                fileType: d.fileType,
                expiryDate: d.expiryDate,
                daysUntilExpiry: d.expiryDate
                    ? Math.ceil((d.expiryDate.getTime() - Date.now()) / 86_400_000)
                    : null,
                owner: `${d.owner.firstName} ${d.owner.lastName}`,
                folder: d.folder?.name ?? null,
            })),
        };
    }
    async getDocumentActivity(workspaceId, user, days = 30) {
        await this.assertMember(workspaceId, user.id);
        const since = new Date();
        since.setDate(since.getDate() - days);
        const logs = await this.prisma.auditLog.findMany({
            where: { workspaceId, createdAt: { gte: since }, entityType: 'DOCUMENT' },
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        const actionCounts = {};
        for (const log of logs) {
            actionCounts[log.action] = (actionCounts[log.action] ?? 0) + 1;
        }
        return {
            reportType: 'document_activity',
            generatedAt: new Date().toISOString(),
            parameters: { days },
            total: logs.length,
            actionCounts,
            items: logs.map((l) => ({
                id: l.id,
                action: l.action,
                entityId: l.entityId,
                actor: l.user ? `${l.user.firstName} ${l.user.lastName}` : 'System',
                createdAt: l.createdAt,
            })),
        };
    }
    async getStorageUsage(workspaceId, user) {
        await this.assertMember(workspaceId, user.id);
        const versions = await this.prisma.documentVersion.findMany({
            where: { document: { workspaceId } },
            select: { fileSizeBytes: true, mimeType: true },
        });
        const totalBytes = versions.reduce((sum, v) => sum + Number(v.fileSizeBytes), 0);
        const byMimeType = {};
        for (const v of versions) {
            const key = v.mimeType.split('/')[0] ?? 'other';
            if (!byMimeType[key])
                byMimeType[key] = { count: 0, bytes: 0 };
            byMimeType[key].count++;
            byMimeType[key].bytes += Number(v.fileSizeBytes);
        }
        const docCount = await this.prisma.document.count({
            where: { workspaceId, status: 'ACTIVE' },
        });
        return {
            reportType: 'storage_usage',
            generatedAt: new Date().toISOString(),
            totalVersions: versions.length,
            totalDocuments: docCount,
            totalBytes,
            totalMB: Math.round(totalBytes / 1_048_576 * 100) / 100,
            byMimeType,
        };
    }
    async getMemberActivity(workspaceId, user, days = 30) {
        await this.assertMember(workspaceId, user.id);
        const since = new Date();
        since.setDate(since.getDate() - days);
        const members = await this.prisma.workspaceUser.findMany({
            where: { workspaceId, status: 'ACTIVE' },
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        });
        const activityCounts = await this.prisma.auditLog.groupBy({
            by: ['userId'],
            where: { workspaceId, createdAt: { gte: since } },
            _count: { id: true },
        });
        const countMap = new Map(activityCounts.map((a) => [a.userId, a._count.id]));
        return {
            reportType: 'member_activity',
            generatedAt: new Date().toISOString(),
            parameters: { days },
            total: members.length,
            items: members.map((m) => ({
                userId: m.userId,
                name: `${m.user.firstName} ${m.user.lastName}`,
                email: m.user.email,
                role: m.role,
                actions: countMap.get(m.userId) ?? 0,
            })).sort((a, b) => b.actions - a.actions),
        };
    }
    async getTagCoverage(workspaceId, user) {
        await this.assertMember(workspaceId, user.id);
        const [totalDocs, taggedDocs, tags] = await Promise.all([
            this.prisma.document.count({ where: { workspaceId, status: 'ACTIVE' } }),
            this.prisma.document.count({
                where: {
                    workspaceId,
                    status: 'ACTIVE',
                    tags: { some: {} },
                },
            }),
            this.prisma.documentTag.findMany({
                where: { workspaceId },
                include: { documents: true },
                orderBy: { name: 'asc' },
            }),
        ]);
        return {
            reportType: 'tag_coverage',
            generatedAt: new Date().toISOString(),
            totalDocuments: totalDocs,
            taggedDocuments: taggedDocs,
            untaggedDocuments: totalDocs - taggedDocs,
            coveragePercent: totalDocs > 0 ? Math.round((taggedDocs / totalDocs) * 100) : 0,
            tags: tags.map((t) => ({
                id: t.id,
                name: t.name,
                color: t.color,
                documentCount: t.documents.length,
            })),
        };
    }
    async getComplianceExposure(workspaceId, user) {
        await this.assertMember(workspaceId, user.id);
        const now = new Date();
        const thirtyDays = new Date();
        thirtyDays.setDate(thirtyDays.getDate() + 30);
        const [expired, expiringSoon, noExpiry, total] = await Promise.all([
            this.prisma.document.count({
                where: { workspaceId, status: 'ACTIVE', expiryDate: { lt: now } },
            }),
            this.prisma.document.count({
                where: {
                    workspaceId,
                    status: 'ACTIVE',
                    expiryDate: { gte: now, lte: thirtyDays },
                },
            }),
            this.prisma.document.count({
                where: { workspaceId, status: 'ACTIVE', expiryDate: null },
            }),
            this.prisma.document.count({ where: { workspaceId, status: 'ACTIVE' } }),
        ]);
        const externalShares = await this.prisma.documentShare.count({
            where: {
                document: { workspaceId },
                shareType: 'EXTERNAL_LINK',
                isActive: true,
            },
        });
        const expiredShares = await this.prisma.documentShare.count({
            where: {
                document: { workspaceId },
                isActive: true,
                expiresAt: { lt: now },
            },
        });
        return {
            reportType: 'compliance_exposure',
            generatedAt: new Date().toISOString(),
            documents: {
                total,
                expired,
                expiringSoon,
                noExpiry,
                compliant: total - expired - expiringSoon,
            },
            shares: {
                externalActive: externalShares,
                expiredButActive: expiredShares,
            },
            riskScore: Math.min(100, expired * 10 + expiringSoon * 3 + expiredShares),
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map