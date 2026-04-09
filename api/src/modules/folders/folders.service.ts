import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  assertWorkspaceMembership,
  assertEditorOrAbove,
} from '../../common/helpers/workspace-access.helper';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import {
  CreateFolderDto,
  FolderDetailResponseDto,
  FolderResponseDto,
  UpdateFolderDto,
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
        _count: { select: { documents: { where: { status: { not: DocumentStatus.DELETED } } }, children: true } },
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
        _count: { select: { documents: { where: { status: { not: DocumentStatus.DELETED } } }, children: true } },
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
    assertEditorOrAbove(user, dto.workspaceId);

    if (dto.parentFolderId) {
      const parent = await this.prisma.folder.findUnique({
        where: { id: dto.parentFolderId },
      });
      if (!parent || parent.workspaceId !== dto.workspaceId) {
        throw new NotFoundException(`Parent folder "${dto.parentFolderId}" not found in workspace`);
      }
      // Enforce max nesting depth of 5 levels
      let depth = 1;
      let current = parent;
      while (current.parentFolderId) {
        depth++;
        if (depth >= 5) {
          throw new BadRequestException('Maximum folder nesting depth of 5 levels reached');
        }
        const next = await this.prisma.folder.findUnique({ where: { id: current.parentFolderId } });
        if (!next) break;
        current = next;
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
        _count: { select: { documents: { where: { status: { not: DocumentStatus.DELETED } } }, children: true } },
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

  /**
   * Rename a folder.
   */
  async rename(id: string, dto: UpdateFolderDto, user: DevUserPayload): Promise<FolderResponseDto> {
    const existing = await this.prisma.folder.findUnique({
      where: { id },
      select: { workspaceId: true },
    });
    if (!existing) throw new NotFoundException(`Folder "${id}" not found`);
    assertEditorOrAbove(user, existing.workspaceId);

    const folder = await this.prisma.folder.update({
      where: { id },
      data: { name: dto.name },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { documents: { where: { status: { not: DocumentStatus.DELETED } } }, children: true } },
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

  /**
   * Delete a folder. Fails if the folder has documents or sub-folders.
   */
  async delete(id: string, user: DevUserPayload): Promise<void> {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            documents: { where: { status: { not: DocumentStatus.DELETED } } },
            children: true,
          },
        },
      },
    });
    if (!folder) throw new NotFoundException(`Folder "${id}" not found`);
    assertEditorOrAbove(user, folder.workspaceId);

    if (folder._count.documents > 0) {
      throw new BadRequestException(
        `Cannot delete folder "${folder.name}" — it contains ${folder._count.documents} active document(s). Move or delete them first.`,
      );
    }
    if (folder._count.children > 0) {
      throw new BadRequestException(
        `Cannot delete folder "${folder.name}" — it has ${folder._count.children} sub-folder(s). Remove them first.`,
      );
    }

    await this.prisma.folder.delete({ where: { id } });
  }
}
