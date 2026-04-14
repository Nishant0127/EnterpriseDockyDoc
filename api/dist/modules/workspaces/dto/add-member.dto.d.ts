import { WorkspaceUserRole, WorkspaceUserStatus } from '@prisma/client';
export declare class UpdateWorkspaceDto {
    name?: string;
}
export declare class AddWorkspaceMemberDto {
    email: string;
    firstName: string;
    lastName: string;
    role: WorkspaceUserRole;
}
export declare class UpdateWorkspaceMemberDto {
    role?: WorkspaceUserRole;
    status?: WorkspaceUserStatus;
    firstName?: string;
    lastName?: string;
    email?: string;
}
