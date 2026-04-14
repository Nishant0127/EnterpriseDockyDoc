export declare class UploadDocumentDto {
    workspaceId: string;
    name: string;
    description?: string;
    folderId?: string;
    tags?: string;
    metadata?: string;
}
export declare class UploadVersionDto {
    notes?: string;
}
export declare class UploadResponseDto {
    id: string;
    name: string;
    currentVersionNumber: number;
}
