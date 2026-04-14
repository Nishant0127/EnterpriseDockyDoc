export declare class FolderQueryDto {
    workspaceId: string;
}
export declare class CreateFolderDto {
    workspaceId: string;
    name: string;
    parentFolderId?: string;
}
export declare class UpdateFolderDto {
    name: string;
}
export declare class FolderCreatedByDto {
    id: string;
    firstName: string;
    lastName: string;
}
export declare class FolderChildDto {
    id: string;
    name: string;
}
export declare class FolderResponseDto {
    id: string;
    workspaceId: string;
    name: string;
    parentFolderId: string | null;
    createdBy: FolderCreatedByDto;
    documentCount: number;
    childCount: number;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare class FolderDetailResponseDto extends FolderResponseDto {
    children: FolderChildDto[];
}
