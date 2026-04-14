import { PrismaService } from '../../prisma/prisma.service';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
export declare class ReportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private assertMember;
    getExpiringDocuments(workspaceId: string, user: DevUserPayload, days?: number): Promise<{
        reportType: string;
        generatedAt: string;
        parameters: {
            days: number;
        };
        total: number;
        items: {
            id: string;
            name: string;
            fileType: string;
            expiryDate: Date | null;
            daysUntilExpiry: number | null;
            owner: string;
            folder: string | null;
        }[];
    }>;
    getDocumentActivity(workspaceId: string, user: DevUserPayload, days?: number): Promise<{
        reportType: string;
        generatedAt: string;
        parameters: {
            days: number;
        };
        total: number;
        actionCounts: Record<string, number>;
        items: {
            id: string;
            action: import(".prisma/client").$Enums.AuditAction;
            entityId: string;
            actor: string;
            createdAt: Date;
        }[];
    }>;
    getStorageUsage(workspaceId: string, user: DevUserPayload): Promise<{
        reportType: string;
        generatedAt: string;
        totalVersions: number;
        totalDocuments: number;
        totalBytes: number;
        totalMB: number;
        byMimeType: Record<string, {
            count: number;
            bytes: number;
        }>;
    }>;
    getMemberActivity(workspaceId: string, user: DevUserPayload, days?: number): Promise<{
        reportType: string;
        generatedAt: string;
        parameters: {
            days: number;
        };
        total: number;
        items: {
            userId: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.WorkspaceUserRole;
            actions: number;
        }[];
    }>;
    getTagCoverage(workspaceId: string, user: DevUserPayload): Promise<{
        reportType: string;
        generatedAt: string;
        totalDocuments: number;
        taggedDocuments: number;
        untaggedDocuments: number;
        coveragePercent: number;
        tags: {
            id: string;
            name: string;
            color: string | null;
            documentCount: number;
        }[];
    }>;
    getComplianceExposure(workspaceId: string, user: DevUserPayload): Promise<{
        reportType: string;
        generatedAt: string;
        documents: {
            total: number;
            expired: number;
            expiringSoon: number;
            noExpiry: number;
            compliant: number;
        };
        shares: {
            externalActive: number;
            expiredButActive: number;
        };
        riskScore: number;
    }>;
}
