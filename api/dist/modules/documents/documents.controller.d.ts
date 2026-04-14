import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, DocumentDetailDto, DocumentListItemDto, DocumentQueryDto, DocumentReminderDto, SetDocumentMetadataDto, SetDocumentRemindersDto, SetDocumentTagsDto, UpdateDocumentDto } from './dto/document.dto';
import { UploadDocumentDto, UploadVersionDto } from './dto/upload-document.dto';
import { type DevUserPayload } from '../../common/guards/dev-auth.guard';
import { AuditService } from '../audit/audit.service';
import { AuditLogDto } from '../audit/dto/audit.dto';
export declare class DocumentsController {
    private readonly documentsService;
    private readonly auditService;
    constructor(documentsService: DocumentsService, auditService: AuditService);
    findAll(query: DocumentQueryDto, user: DevUserPayload): Promise<DocumentListItemDto[]>;
    uploadDocument(file: Express.Multer.File, dto: UploadDocumentDto, user: DevUserPayload): Promise<DocumentDetailDto>;
    findOne(id: string, user: DevUserPayload): Promise<DocumentDetailDto>;
    downloadLatest(id: string, user: DevUserPayload, res: Response): Promise<void>;
    downloadVersion(id: string, versionNumber: number, user: DevUserPayload, res: Response): Promise<void>;
    create(dto: CreateDocumentDto, user: DevUserPayload): Promise<DocumentDetailDto>;
    uploadVersion(id: string, file: Express.Multer.File, dto: UploadVersionDto, user: DevUserPayload): Promise<DocumentDetailDto>;
    update(id: string, dto: UpdateDocumentDto, user: DevUserPayload): Promise<DocumentListItemDto>;
    deleteVersion(id: string, versionNumber: number, user: DevUserPayload): Promise<DocumentDetailDto>;
    setTags(id: string, dto: SetDocumentTagsDto, user: DevUserPayload): Promise<{
        id: string;
        name: string;
        color: string | null;
    }[]>;
    setMetadata(id: string, dto: SetDocumentMetadataDto, user: DevUserPayload): Promise<{
        id: string;
        key: string;
        value: string;
    }[]>;
    getReminders(id: string, user: DevUserPayload): Promise<DocumentReminderDto[]>;
    setReminders(id: string, dto: SetDocumentRemindersDto, user: DevUserPayload): Promise<DocumentReminderDto[]>;
    getActivity(id: string, user: DevUserPayload): Promise<AuditLogDto[]>;
    remove(id: string, user: DevUserPayload): Promise<{
        id: string;
        status: import(".prisma/client").DocumentStatus;
    }>;
    shred(id: string, user: DevUserPayload): Promise<void>;
}
