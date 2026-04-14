import { WorkspaceType, WorkspaceUserRole, WorkspaceUserStatus } from '@prisma/client';
export declare class SwitchWorkspaceDto {
    workspaceId: string;
}
export declare class WorkspaceMembershipDto {
    workspaceId: string;
    workspaceName: string;
    workspaceSlug: string;
    workspaceType: WorkspaceType;
    role: WorkspaceUserRole;
    status: WorkspaceUserStatus;
}
export declare class MeResponseDto {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    workspaces: WorkspaceMembershipDto[];
    defaultWorkspace: WorkspaceMembershipDto | null;
}
export declare class SwitchWorkspaceResponseDto {
    workspaceId: string;
    workspaceName: string;
    workspaceSlug: string;
    workspaceType: WorkspaceType;
    role: WorkspaceUserRole;
}
