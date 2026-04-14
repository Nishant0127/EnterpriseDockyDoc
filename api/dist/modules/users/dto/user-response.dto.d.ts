import { WorkspaceUserRole, WorkspaceUserStatus } from '@prisma/client';
export declare class UserWorkspaceDto {
    workspaceId: string;
    workspaceName: string;
    workspaceSlug: string;
    role: WorkspaceUserRole;
    status: WorkspaceUserStatus;
}
export declare class UserResponseDto {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    workspaces: UserWorkspaceDto[];
    createdAt: Date;
    updatedAt: Date;
}
