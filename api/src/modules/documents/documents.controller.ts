import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import {
  CreateDocumentDto,
  DocumentDetailDto,
  DocumentListItemDto,
  DocumentQueryDto,
  DocumentReminderDto,
  SetDocumentRemindersDto,
  UpdateDocumentDto,
} from './dto/document.dto';
import { UploadDocumentDto, UploadVersionDto } from './dto/upload-document.dto';
import { DevAuthGuard, type DevUserPayload } from '../../common/guards/dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { AuditLogDto } from '../audit/dto/audit.dto';

// ------------------------------------------------------------------ //
// File upload configuration
// ------------------------------------------------------------------ //

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/json',
  'application/octet-stream',
]);

function uploadFileInterceptor() {
  return FileInterceptor('file', {
    storage: undefined, // use default memoryStorage
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, callback) => {
      if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
        callback(null, true);
      } else {
        callback(
          new BadRequestException(
            `File type "${file.mimetype}" is not allowed. ` +
              `Accepted: PDF, Word, Excel, PowerPoint, images, text, CSV, ZIP, JSON.`,
          ),
          false,
        );
      }
    },
  });
}

/**
 * Documents endpoints.
 * Routes: /api/v1/documents/*
 */
@ApiTags('Documents')
@Controller('documents')
@UseGuards(DevAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly auditService: AuditService,
  ) {}

  // ------------------------------------------------------------------ //
  // List
  // ------------------------------------------------------------------ //

  @Get()
  @ApiOperation({ summary: 'List documents in a workspace' })
  @ApiResponse({ status: 200, type: [DocumentListItemDto] })
  findAll(
    @Query() query: DocumentQueryDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<DocumentListItemDto[]> {
    return this.documentsService.findAll(query, user);
  }

  // ------------------------------------------------------------------ //
  // Upload — POST /documents/upload  (must be before :id routes)
  // ------------------------------------------------------------------ //

  @Post('upload')
  @UseInterceptors(uploadFileInterceptor())
  @ApiOperation({ summary: 'Upload a new document with file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'workspaceId', 'name'],
      properties: {
        file: { type: 'string', format: 'binary' },
        workspaceId: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        folderId: { type: 'string' },
        tags: { type: 'string', description: 'Comma-separated tag IDs' },
        metadata: { type: 'string', description: 'JSON array of {key, value} objects' },
      },
    },
  })
  @ApiResponse({ status: 201, type: DocumentDetailDto })
  uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<DocumentDetailDto> {
    if (!file) throw new BadRequestException('No file provided');
    return this.documentsService.upload(dto, file, user);
  }

  // ------------------------------------------------------------------ //
  // Detail
  // ------------------------------------------------------------------ //

  @Get(':id')
  @ApiOperation({ summary: 'Get document detail by ID' })
  @ApiParam({ name: 'id', description: 'Document cuid' })
  @ApiResponse({ status: 200, type: DocumentDetailDto })
  @ApiResponse({ status: 404, description: 'Document not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: DevUserPayload,
  ): Promise<DocumentDetailDto> {
    return this.documentsService.findById(id, user);
  }

  // ------------------------------------------------------------------ //
  // Download latest version
  // ------------------------------------------------------------------ //

  @Get(':id/download')
  @ApiOperation({ summary: 'Download the latest version of a document' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'File stream' })
  @ApiResponse({ status: 404, description: 'Document or file not found' })
  async downloadLatest(
    @Param('id') id: string,
    @CurrentUser() user: DevUserPayload,
    @Res() res: Response,
  ): Promise<void> {
    const { absolutePath, fileName, mimeType } =
      await this.documentsService.getDownloadInfo(id, user);

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );
    res.sendFile(absolutePath, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ message: 'Failed to stream file' });
      }
    });
  }

  // ------------------------------------------------------------------ //
  // Download specific version
  // ------------------------------------------------------------------ //

  @Get(':id/versions/:versionNumber/download')
  @ApiOperation({ summary: 'Download a specific version of a document' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'versionNumber', type: Number })
  @ApiResponse({ status: 200, description: 'File stream' })
  @ApiResponse({ status: 404, description: 'Version or file not found' })
  async downloadVersion(
    @Param('id') id: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
    @CurrentUser() user: DevUserPayload,
    @Res() res: Response,
  ): Promise<void> {
    const { absolutePath, fileName, mimeType } =
      await this.documentsService.getVersionDownloadInfo(id, versionNumber, user);

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );
    res.sendFile(absolutePath, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ message: 'Failed to stream file' });
      }
    });
  }

  // ------------------------------------------------------------------ //
  // Create (metadata-only, no file — legacy endpoint)
  // ------------------------------------------------------------------ //

  @Post()
  @ApiOperation({ summary: 'Create a document record with placeholder version (no file)' })
  @ApiResponse({ status: 201, type: DocumentDetailDto })
  create(
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<DocumentDetailDto> {
    return this.documentsService.create(dto, user);
  }

  // ------------------------------------------------------------------ //
  // Upload new version
  // ------------------------------------------------------------------ //

  @Post(':id/versions')
  @UseInterceptors(uploadFileInterceptor())
  @ApiOperation({ summary: 'Upload a new version of an existing document' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        notes: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, type: DocumentDetailDto })
  @ApiResponse({ status: 404, description: 'Document not found' })
  uploadVersion(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadVersionDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<DocumentDetailDto> {
    if (!file) throw new BadRequestException('No file provided');
    return this.documentsService.uploadVersion(id, file, dto, user);
  }

  // ------------------------------------------------------------------ //
  // Update
  // ------------------------------------------------------------------ //

  @Patch(':id')
  @ApiOperation({ summary: 'Update document fields' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: DocumentListItemDto })
  @ApiResponse({ status: 404, description: 'Document not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<DocumentListItemDto> {
    return this.documentsService.update(id, dto, user);
  }

  // ------------------------------------------------------------------ //
  // Reminders
  // ------------------------------------------------------------------ //

  @Get(':id/reminders')
  @ApiOperation({ summary: 'Get reminders for a document' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: [DocumentReminderDto] })
  @ApiResponse({ status: 404, description: 'Document not found' })
  getReminders(
    @Param('id') id: string,
    @CurrentUser() user: DevUserPayload,
  ): Promise<DocumentReminderDto[]> {
    return this.documentsService.getReminders(id, user);
  }

  @Put(':id/reminders')
  @ApiOperation({ summary: 'Set reminders for a document (replaces existing PENDING reminders)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: [DocumentReminderDto] })
  @ApiResponse({ status: 404, description: 'Document not found' })
  setReminders(
    @Param('id') id: string,
    @Body() dto: SetDocumentRemindersDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<DocumentReminderDto[]> {
    return this.documentsService.setReminders(id, dto, user);
  }

  // ------------------------------------------------------------------ //
  // Activity
  // ------------------------------------------------------------------ //

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get audit activity for a document' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: [AuditLogDto] })
  getActivity(
    @Param('id') id: string,
    @CurrentUser() user: DevUserPayload,
  ): Promise<AuditLogDto[]> {
    return this.auditService.getDocumentActivity(id, user);
  }

  // ------------------------------------------------------------------ //
  // Soft delete
  // ------------------------------------------------------------------ //

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a document (status → DELETED)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Document not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: DevUserPayload,
  ) {
    return this.documentsService.softDelete(id, user);
  }
}
