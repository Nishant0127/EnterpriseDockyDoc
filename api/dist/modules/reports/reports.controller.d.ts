import { ReportsService } from './reports.service';
import { type DevUserPayload } from '../../common/guards/dev-auth.guard';
declare class ReportQueryDto {
    workspaceId: string;
    days?: number;
}
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    expiringDocuments(q: ReportQueryDto, user: DevUserPayload): Promise<{
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
    documentActivity(q: ReportQueryDto, user: DevUserPayload): Promise<{
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
    storageUsage(q: ReportQueryDto, user: DevUserPayload): Promise<{
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
    memberActivity(q: ReportQueryDto, user: DevUserPayload): Promise<{
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
    tagCoverage(q: ReportQueryDto, user: DevUserPayload): Promise<{
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
    complianceExposure(q: ReportQueryDto, user: DevUserPayload): Promise<{
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
export {};
