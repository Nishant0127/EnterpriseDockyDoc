import { AuditAction, AuditEntityType } from '@prisma/client';
export { AuditAction, AuditEntityType };
export declare class AuditQueryDto {
    workspaceId: string;
    entityType?: AuditEntityType;
    action?: AuditAction;
    limit?: number;
    offset?: number;
    dateFrom?: string;
    dateTo?: string;
}
export declare class AuditUserDto {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}
export declare class AuditLogDto {
    id: string;
    workspaceId: string;
    userId: string | null;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    user: AuditUserDto | null;
}
