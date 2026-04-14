import { PrismaService } from '../../prisma/prisma.service';
import { LocalStorageService } from '../storage/local-storage.service';
import { AuditService } from '../audit/audit.service';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import type { CreateExternalShareDto, CreateInternalShareDto, DocumentSharesResponseDto, ExternalShareDto, InternalShareDto, PublicShareInfoDto, VerifyShareResponseDto } from './dto/share.dto';
export declare class SharesService {
    private readonly prisma;
    private readonly storage;
    private readonly audit;
    private readonly verifyAttempts;
    constructor(prisma: PrismaService, storage: LocalStorageService, audit: AuditService);
    private checkVerifyRateLimit;
    private clearVerifyRateLimit;
    createInternalShare(documentId: string, dto: CreateInternalShareDto, user: DevUserPayload): Promise<InternalShareDto[]>;
    createExternalShare(documentId: string, dto: CreateExternalShareDto, user: DevUserPayload): Promise<ExternalShareDto>;
    getDocumentShares(documentId: string, user: DevUserPayload): Promise<DocumentSharesResponseDto>;
    revokeShare(shareId: string, user: DevUserPayload): Promise<void>;
    getPublicShareInfo(token: string, ipAddress?: string, userAgent?: string): Promise<PublicShareInfoDto>;
    verifySharePassword(token: string, password: string, ip: string): Promise<VerifyShareResponseDto>;
    getPublicShareDownloadInfo(token: string, grant?: string, ipAddress?: string, userAgent?: string): Promise<{
        absolutePath: string;
        fileName: string;
        mimeType: string;
    }>;
    private requireReadableDocument;
    private requireAccessibleDocument;
    private findValidPublicShare;
    private toExternalShareDto;
}
