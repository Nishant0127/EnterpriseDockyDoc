import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LocalStorageService } from '../storage/local-storage.service';
import { SearchIndexerService } from '../search/search-indexer.service';
import { AuditService } from '../audit/audit.service';
import { AiService } from '../ai/ai.service';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import { CreateDocumentDto, DocumentDetailDto, DocumentListItemDto, DocumentReminderDto, SetDocumentRemindersDto, SetDocumentTagsDto, UpdateDocumentDto, DocumentQueryDto } from './dto/document.dto';
import type { UploadDocumentDto, UploadVersionDto } from './dto/upload-document.dto';
export declare class DocumentsService {
    private readonly prisma;
    private readonly storage;
    private readonly indexer;
    private readonly audit;
    private readonly aiService;
    constructor(prisma: PrismaService, storage: LocalStorageService, indexer: SearchIndexerService, audit: AuditService, aiService: AiService);
    findAll(query: DocumentQueryDto, user: DevUserPayload): Promise<DocumentListItemDto[]>;
    findById(id: string, user: DevUserPayload): Promise<DocumentDetailDto>;
    create(dto: CreateDocumentDto, user: DevUserPayload): Promise<DocumentDetailDto>;
    upload(dto: UploadDocumentDto, file: Express.Multer.File, user: DevUserPayload): Promise<DocumentDetailDto>;
    uploadVersion(id: string, file: Express.Multer.File, _dto: UploadVersionDto, user: DevUserPayload): Promise<DocumentDetailDto>;
    getDownloadInfo(id: string, user: DevUserPayload): Promise<{
        absolutePath: string;
        fileName: string;
        mimeType: string;
    }>;
    getVersionDownloadInfo(id: string, versionNumber: number, user: DevUserPayload): Promise<{
        absolutePath: string;
        fileName: string;
        mimeType: string;
    }>;
    update(id: string, dto: UpdateDocumentDto, user: DevUserPayload): Promise<DocumentListItemDto>;
    softDelete(id: string, user: DevUserPayload): Promise<{
        id: string;
        status: DocumentStatus;
    }>;
    shred(id: string, user: DevUserPayload): Promise<void>;
    deleteVersion(id: string, versionNumber: number, user: DevUserPayload): Promise<DocumentDetailDto>;
    setTags(id: string, dto: SetDocumentTagsDto, user: DevUserPayload): Promise<{
        id: string;
        name: string;
        color: string | null;
    }[]>;
    setMetadata(id: string, entries: {
        key: string;
        value: string;
    }[], user: DevUserPayload): Promise<{
        id: string;
        key: string;
        value: string;
    }[]>;
    getReminders(id: string, user: DevUserPayload): Promise<DocumentReminderDto[]>;
    setReminders(id: string, dto: SetDocumentRemindersDto, user: DevUserPayload): Promise<DocumentReminderDto[]>;
    private toDetailDto;
    private toListItemDto;
}
