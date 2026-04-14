import { WorkspaceType, WorkspaceStatus, WorkspaceUserRole, WorkspaceUserStatus } from '@prisma/client';
export declare class WorkspaceMemberDto {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: WorkspaceUserRole;
    status: WorkspaceUserStatus;
    joinedAt: Date;
}
export declare class WorkspaceResponseDto {
    id: string;
    name: string;
    slug: string;
    type: WorkspaceType;
    status: WorkspaceStatus;
    memberCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare class WorkspaceDetailResponseDto extends WorkspaceResponseDto {
    documentCount: number;
    members: WorkspaceMemberDto[];
}
export declare class WorkspaceSummaryDto {
    totalDocuments: number;
    activeDocuments: number;
    archivedDocuments: number;
    expiringCount: number;
    expiredCount: number;
    activeShares: number;
    memberCount: number;
    recentUploads: number;
}
