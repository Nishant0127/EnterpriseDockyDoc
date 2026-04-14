import { SharePermission, ShareType } from '@prisma/client';
export declare class CreateInternalShareDto {
    userIds: string[];
    permission: SharePermission;
}
export declare class CreateExternalShareDto {
    expiresAt?: string;
    password?: string;
    allowDownload: boolean;
}
export declare class VerifySharePasswordDto {
    password: string;
}
export declare class ShareUserDto {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}
export declare class InternalShareDto {
    id: string;
    shareId: string;
    sharedWith: ShareUserDto;
    permission: SharePermission;
    createdAt: string;
}
export declare class ExternalShareDto {
    id: string;
    token: string;
    expiresAt: string | null;
    allowDownload: boolean;
    hasPassword: boolean;
    isActive: boolean;
    createdAt: string;
    createdBy: ShareUserDto;
}
export declare class DocumentSharesResponseDto {
    internalShares: InternalShareDto[];
    externalShares: ExternalShareDto[];
}
export declare class PublicShareInfoDto {
    id: string;
    documentId: string;
    documentName: string;
    allowDownload: boolean;
    expiresAt: string | null;
    requiresPassword: boolean;
    shareType: ShareType;
}
export declare class VerifyShareResponseDto {
    accessGrant: string;
    expiresIn: number;
}
export { SharePermission, ShareType };
