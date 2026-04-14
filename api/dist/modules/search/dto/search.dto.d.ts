import { DocumentStatus } from '@prisma/client';
export declare class SearchQueryDto {
    workspaceId: string;
    q: string;
    status?: DocumentStatus;
    folderId?: string;
}
export declare class SearchOwnerDto {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}
export declare class SearchFolderDto {
    id: string;
    name: string;
}
export declare class SearchTagDto {
    id: string;
    name: string;
    color: string | null;
}
export declare class SearchResultDto {
    id: string;
    workspaceId: string;
    name: string;
    description: string | null;
    fileName: string;
    fileType: string;
    status: DocumentStatus;
    currentVersionNumber: number;
    folder: SearchFolderDto | null;
    owner: SearchOwnerDto;
    tags: SearchTagDto[];
    versionCount: number;
    snippet?: string;
    createdAt: Date;
    updatedAt: Date;
}
