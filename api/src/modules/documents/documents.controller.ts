import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import {
  CreateDocumentDto,
  DocumentDetailDto,
  DocumentListItemDto,
  DocumentQueryDto,
  UpdateDocumentDto,
} from './dto/document.dto';
import { DevAuthGuard, type DevUserPayload } from '../../common/guards/dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Documents endpoints.
 * Routes: /api/v1/documents/*
 */
@ApiTags('Documents')
@Controller('documents')
@UseGuards(DevAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * GET /api/v1/documents?workspaceId=...
   * List documents. Optional filters: folderId, status, ownerUserId.
   * DELETED documents are excluded by default unless status=DELETED is passed.
   */
  @Get()
  @ApiOperation({ summary: 'List documents in a workspace' })
  @ApiResponse({ status: 200, type: [DocumentListItemDto] })
  findAll(
    @Query() query: DocumentQueryDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<DocumentListItemDto[]> {
    return this.documentsService.findAll(query, user);
  }

  /**
   * GET /api/v1/documents/:id
   * Full document detail: versions, tags, metadata, folder, owner.
   */
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

  /**
   * POST /api/v1/documents
   * Create a document record + initial version (v1). No file binary yet.
   */
  @Post()
  @ApiOperation({ summary: 'Create a document record with initial version' })
  @ApiResponse({ status: 201, type: DocumentDetailDto })
  create(
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<DocumentDetailDto> {
    return this.documentsService.create(dto, user);
  }

  /**
   * PATCH /api/v1/documents/:id
   * Update document name, description, folder, or status.
   */
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

  /**
   * DELETE /api/v1/documents/:id
   * Soft delete — sets status to DELETED. Document record is preserved.
   */
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
