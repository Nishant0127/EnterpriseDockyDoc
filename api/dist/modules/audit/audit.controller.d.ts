import { type DevUserPayload } from '../../common/guards/dev-auth.guard';
import { AuditService } from './audit.service';
import { AuditLogDto, AuditQueryDto } from './dto/audit.dto';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getWorkspaceActivity(query: AuditQueryDto, user: DevUserPayload): Promise<AuditLogDto[]>;
}
