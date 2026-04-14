import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceMemberDto, WorkspaceResponseDto, WorkspaceDetailResponseDto, WorkspaceSummaryDto } from './dto/workspace-response.dto';
import { AddWorkspaceMemberDto, UpdateWorkspaceMemberDto, UpdateWorkspaceDto } from './dto/add-member.dto';
import { UpdateAiSettingsDto, AiSettingsResponseDto } from './dto/ai-settings.dto';
export declare class WorkspacesController {
    private readonly workspacesService;
    constructor(workspacesService: WorkspacesService);
    findAll(user: DevUserPayload): Promise<WorkspaceResponseDto[]>;
    findOne(id: string, user: DevUserPayload): Promise<WorkspaceDetailResponseDto>;
    updateWorkspace(id: string, dto: UpdateWorkspaceDto, user: DevUserPayload): Promise<WorkspaceResponseDto>;
    getSummary(id: string, user: DevUserPayload): Promise<WorkspaceSummaryDto>;
    addMember(id: string, dto: AddWorkspaceMemberDto, user: DevUserPayload): Promise<WorkspaceMemberDto>;
    updateMember(id: string, memberId: string, dto: UpdateWorkspaceMemberDto, user: DevUserPayload): Promise<WorkspaceMemberDto>;
    removeMember(id: string, memberId: string, user: DevUserPayload): Promise<void>;
    getAiSettings(id: string, user: DevUserPayload): Promise<AiSettingsResponseDto>;
    updateAiSettings(id: string, dto: UpdateAiSettingsDto, user: DevUserPayload): Promise<AiSettingsResponseDto>;
}
