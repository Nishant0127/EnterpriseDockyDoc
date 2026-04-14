import { DocumentStatus, ReminderChannel, ReminderStatus } from '@prisma/client';
export declare class DocumentQueryDto {
    workspaceId: string;
    folderId?: string;
    status?: DocumentStatus;
    ownerUserId?: string;
}
export declare class CreateDocumentDto {
    workspaceId: string;
    name: string;
    fileName: string;
    fileType: string;
    mimeType: string;
    ownerUserId: string;
    description?: string;
    folderId?: string;
}
export declare class UpdateDocumentDto {
    name?: string;
    description?: string;
    folderId?: string | null;
    status?: DocumentStatus;
    expiryDate?: string | null;
    renewalDueDate?: string | null;
    isReminderEnabled?: boolean;
}
export declare class MetadataEntryDto {
    key: string;
    value: string;
}
export declare class SetDocumentMetadataDto {
    entries: MetadataEntryDto[];
}
export declare class DocumentReminderDto {
    id: string;
    documentId: string;
    remindAt: Date;
    channel: ReminderChannel;
    status: ReminderStatus;
    createdAt: Date;
    updatedAt: Date;
}
export declare class SetDocumentRemindersDto {
    expiryDate?: string | null;
    renewalDueDate?: string | null;
    isReminderEnabled?: boolean;
    offsetDays?: number[];
    channel?: ReminderChannel;
}
export declare class DocOwnerDto {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}
export declare class DocFolderRefDto {
    id: string;
    name: string;
}
export declare class DocTagRefDto {
    id: string;
    name: string;
    color: string | null;
}
export declare class DocumentVersionDto {
    id: string;
    versionNumber: number;
    storageKey: string;
    fileSizeBytes: string;
    mimeType: string;
    uploadedBy: DocOwnerDto;
    createdAt: Date;
}
export declare class DocumentMetadataDto {
    id: string;
    key: string;
    value: string;
}
export declare class DocumentListItemDto {
    id: string;
    workspaceId: string;
    name: string;
    fileName: string;
    fileType: string;
    status: DocumentStatus;
    currentVersionNumber: number;
    folder: DocFolderRefDto | null;
    owner: DocOwnerDto;
    tags: DocTagRefDto[];
    versionCount: number;
    expiryDate: Date | null;
    renewalDueDate: Date | null;
    isReminderEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare class DocumentDetailDto extends DocumentListItemDto {
    description: string | null;
    workspace: {
        id: string;
        name: string;
    };
    versions: DocumentVersionDto[];
    metadata: DocumentMetadataDto[];
}
export declare class SetDocumentTagsDto {
    tagIds: string[];
}
export { ReminderChannel, ReminderStatus };
