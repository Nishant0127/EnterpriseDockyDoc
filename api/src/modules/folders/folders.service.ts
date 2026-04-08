import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { assertWorkspaceMembership } from '../../common/helpers/workspace-access.helper';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import {
  CreateFolderDto,
  FolderDetailResponseDto,
  FolderResponseDto,
} from './dto/folder.dto';

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all folders in a workspace (flat list — client builds tree from parentFolderId).
   * Ordered: root folders first, then children, alphabetically within each level.
   */
  async findAll(workspaceId: string, user: DevUserPayload): Promise<FolderResponseDto[]> {
    assertWorkspaceMembership(user, workspaceId);

    const folders = await this.prisma.folder.findMany({
      where: { workspaceId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { documents: true, children: true } },
      },
      orderBy: [{ parentFolderId: 'asc' }, { name: 'asc' }],
    });

    return folders.map((f) => ({
      id: f.id,
      workspaceId: f.workspaceId,
      name: f.name,
      parentFolderId: f.parentFolderId,
      createdBy: f.createdBy,
      documentCount: f._count.documents,
      childCount: f._count.children,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));
  }

  /**
   * Get a single folder with its immediate children listed.
   */
  async findById(id: string, user: DevUserPayload): Promise<FolderDetailResponseDto> {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { documents: true, children: true } },
        children: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
      },
    });

    if (!folder) throw new NotFoundException(`Folder "${id}" not found`);
    assertWorkspaceMembership(user, folder.workspaceId);

    return {
      id: folder.id,
      workspaceId: folder.workspaceId,
      name: folder.name,
      parentFolderId: folder.parentFolderId,
      createdBy: folder.createdBy,
      documentCount: folder._count.documents,
      childCount: folder._count.children,
      children: folder.children,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  }

  /**
   * Create a new folder in a workspace.
   * If parentFolderId is given, validates it belongs to the same workspace.
   */
  async create(dto: CreateFolderDto, user: DevUserPayload): Promise<FolderResponseDto> {
    assertWorkspaceMembership(user, dto.workspaceId);

    if (dto.parentFolderId) {
      const parent = await this.prisma.folder.findUnique({
        where: { id: dto.parentFolderId },
      });
      if (!parent || parent.workspaceId !== dto.workspaceId) {
        throw new NotFoundException(`Parent folder "${dto.parentFolderId}" not found in workspace`);
      }
    }

    const folder = await this.prisma.folder.create({
      data: {
        workspaceId: dto.workspaceId,
        name: dto.name,
        parentFolderId: dto.parentFolderId ?? null,
        createdById: user.id,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { documents: true, children: true } },
      },
    });

    return {
      id: folder.id,
      workspaceId: folder.workspaceId,
      name: folder.name,
      parentFolderId: folder.parentFolderId,
      createdBy: folder.createdBy,
      documentCount: folder._count.documents,
      childCount: folder._count.children,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  }
}
