import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertMember(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceUser.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) throw new ForbiddenException('Not a member of this workspace');
  }

  async getExpiredDocuments(workspaceId: string, user: DevUserPayload) {
    await this.assertMember(workspaceId, user.id);
    const now = new Date();

    const docs = await this.prisma.document.findMany({
      where: {
        workspaceId,
        status: { not: 'DELETED' },
        expiryDate: { lt: now },
      },
      include: { owner: { select: { firstName: true, lastName: true, email: true } }, folder: { select: { name: true } } },
      orderBy: { expiryDate: 'desc' },
    });

    return {
      reportType: 'expired_documents',
      generatedAt: new Date().toISOString(),
      total: docs.length,
      items: docs.map((d) => ({
        id: d.id,
        name: d.name,
        fileType: d.fileType,
        expiryDate: d.expiryDate,
        daysSinceExpiry: d.expiryDate
          ? Math.floor((Date.now() - d.expiryDate.getTime()) / 86_400_000)
          : null,
        owner: `${d.owner.firstName} ${d.owner.lastName}`,
        folder: d.folder?.name ?? null,
        status: d.status,
      })),
    };
  }

  async getExpiringDocuments(workspaceId: string, user: DevUserPayload, days = 30) {
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

  async getDocumentActivity(workspaceId: string, user: DevUserPayload, days = 30) {
    await this.assertMember(workspaceId, user.id);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await this.prisma.auditLog.findMany({
      where: { workspaceId, createdAt: { gte: since }, entityType: 'DOCUMENT' },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const actionCounts: Record<string, number> = {};
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

  async getStorageUsage(workspaceId: string, user: DevUserPayload) {
    await this.assertMember(workspaceId, user.id);

    const versions = await this.prisma.documentVersion.findMany({
      where: { document: { workspaceId } },
      select: { fileSizeBytes: true, mimeType: true },
    });

    const totalBytes = versions.reduce((sum, v) => sum + Number(v.fileSizeBytes), 0);

    const byMimeType: Record<string, { count: number; bytes: number }> = {};
    for (const v of versions) {
      const key = v.mimeType.split('/')[0] ?? 'other';
      if (!byMimeType[key]) byMimeType[key] = { count: 0, bytes: 0 };
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

  async getMemberActivity(workspaceId: string, user: DevUserPayload, days = 30) {
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

  async getTagCoverage(workspaceId: string, user: DevUserPayload) {
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

  async getComplianceExposure(workspaceId: string, user: DevUserPayload) {
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
}
