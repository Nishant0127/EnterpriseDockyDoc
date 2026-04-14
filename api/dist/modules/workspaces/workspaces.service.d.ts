import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import { WorkspaceMemberDto, WorkspaceResponseDto, WorkspaceDetailResponseDto, WorkspaceSummaryDto } from './dto/workspace-response.dto';
import type { AddWorkspaceMemberDto, UpdateWorkspaceMemberDto, UpdateWorkspaceDto } from './dto/add-member.dto';
import { EncryptionService } from '../../common/services/encryption.service';
import type { UpdateAiSettingsDto, AiSettingsResponseDto } from './dto/ai-settings.dto';
export declare class WorkspacesService {
    private readonly prisma;
    private readonly audit;
    private readonly encryption;
    constructor(prisma: PrismaService, audit: AuditService, encryption: EncryptionService);
    findAll(user: DevUserPayload): Promise<WorkspaceResponseDto[]>;
    findById(id: string, user: DevUserPayload): Promise<WorkspaceDetailResponseDto>;
    getSummary(workspaceId: string, user: DevUserPayload): Promise<WorkspaceSummaryDto>;
    update(workspaceId: string, dto: UpdateWorkspaceDto, currentUser: DevUserPayload): Promise<WorkspaceResponseDto>;
    addMember(workspaceId: string, dto: AddWorkspaceMemberDto, currentUser: DevUserPayload): Promise<WorkspaceMemberDto>;
    updateMember(workspaceId: string, memberId: string, dto: UpdateWorkspaceMemberDto, currentUser: DevUserPayload): Promise<WorkspaceMemberDto>;
    getAiSettings(workspaceId: string, user: DevUserPayload): Promise<AiSettingsResponseDto>;
    updateAiSettings(workspaceId: string, dto: UpdateAiSettingsDto, user: DevUserPayload): Promise<AiSettingsResponseDto>;
    private assertManagerRole;
    private toMemberDto;
}
