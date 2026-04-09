import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FoldersService } from './folders.service';
import { CreateFolderDto, FolderDetailResponseDto, FolderQueryDto, FolderResponseDto, UpdateFolderDto } from './dto/folder.dto';
import { DevAuthGuard, type DevUserPayload } from '../../common/guards/dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Folders endpoints.
 * Routes: /api/v1/folders/*
 * All routes require dev user resolution (DevAuthGuard at class level).
 */
@ApiTags('Folders')
@Controller('folders')
@UseGuards(DevAuthGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  /**
   * GET /api/v1/folders?workspaceId=...
   * Returns flat list of all folders in a workspace (client builds tree from parentFolderId).
   */
  @Get()
  @ApiOperation({ summary: 'List all folders in a workspace' })
  @ApiResponse({ status: 200, type: [FolderResponseDto] })
  findAll(
    @Query() query: FolderQueryDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<FolderResponseDto[]> {
    return this.foldersService.findAll(query.workspaceId, user);
  }

  /**
   * GET /api/v1/folders/:id
   * Returns folder details with immediate children listed.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get folder by ID with children' })
  @ApiResponse({ status: 200, type: FolderDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: DevUserPayload,
  ): Promise<FolderDetailResponseDto> {
    return this.foldersService.findById(id, user);
  }

  /**
   * POST /api/v1/folders
   * Create a new folder (optionally nested under a parent).
   */
  @Post()
  @ApiOperation({ summary: 'Create a folder' })
  @ApiResponse({ status: 201, type: FolderResponseDto })
  create(
    @Body() dto: CreateFolderDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<FolderResponseDto> {
    return this.foldersService.create(dto, user);
  }

  /**
   * PATCH /api/v1/folders/:id
   * Rename a folder.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Rename a folder' })
  @ApiResponse({ status: 200, type: FolderResponseDto })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  rename(
    @Param('id') id: string,
    @Body() dto: UpdateFolderDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<FolderResponseDto> {
    return this.foldersService.rename(id, dto, user);
  }

  /**
   * DELETE /api/v1/folders/:id
   * Delete an empty folder.
   */
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an empty folder' })
  @ApiResponse({ status: 204, description: 'Folder deleted' })
  @ApiResponse({ status: 400, description: 'Folder has documents or sub-folders' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: DevUserPayload,
  ): Promise<void> {
    return this.foldersService.delete(id, user);
  }
}
