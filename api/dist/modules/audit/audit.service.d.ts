import { AuditAction, AuditEntityType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import type { AuditLogDto, AuditQueryDto } from './dto/audit.dto';
export { AuditAction, AuditEntityType };
interface LogParams {
    workspaceId: string;
    userId?: string | null;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    metadata?: Record<string, unknown>;
}
export declare class AuditService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    log(params: LogParams): void;
    getWorkspaceActivity(query: AuditQueryDto, user: DevUserPayload): Promise<AuditLogDto[]>;
    getDocumentActivity(documentId: string, user: DevUserPayload): Promise<AuditLogDto[]>;
    private toDto;
}
