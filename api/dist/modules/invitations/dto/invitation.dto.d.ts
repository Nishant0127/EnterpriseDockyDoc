import { WorkspaceUserRole } from '@prisma/client';
export declare class CreateInvitationDto {
    email: string;
    role?: WorkspaceUserRole;
}
export declare class InvitationCreatedByDto {
    firstName: string;
    lastName: string;
}
export declare class InvitationWorkspaceDto {
    id: string;
    name: string;
    type: string;
}
export declare class InvitationResponseDto {
    id: string;
    email: string;
    role: WorkspaceUserRole;
    token: string;
    expiresAt: Date;
    status: string;
    createdBy: InvitationCreatedByDto;
    createdAt: Date;
}
export declare class PublicInvitationDto {
    id: string;
    email: string;
    role: WorkspaceUserRole;
    expiresAt: Date;
    workspace: InvitationWorkspaceDto;
    invitedBy: InvitationCreatedByDto;
}
export declare class AcceptInvitationResponseDto {
    workspaceId: string;
    workspaceName: string;
    role: WorkspaceUserRole;
}
