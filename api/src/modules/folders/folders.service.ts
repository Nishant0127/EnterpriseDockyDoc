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

  async findAll(workspaceId: string, user: DevUserPayload): Promise<FolderResponseDto[]> {
    assertWorkspaceMembership(user, workspaceId);

    const folders = await this.prisma.folder.findMany({
      where: { workspaceId, deletedAt: null },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { documents: { where: { status: { not: DocumentStatus.DELETED } } }, children: { where: { deletedAt: null } } } },
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
      deletedAt: null,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));
  }

  async findDeleted(workspaceId: string, user: DevUserPayload): Promise<FolderResponseDto[]> {
    assertWorkspaceMembership(user, workspaceId);

    const folders = await this.prisma.folder.findMany({
      where: { workspaceId, deletedAt: { not: null } },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { documents: { where: { status: DocumentStatus.DELETED } }, children: true } },
      },
      orderBy: [{ deletedAt: 'desc' }],
    });

    return folders.map((f) => ({
      id: f.id,
      workspaceId: f.workspaceId,
      name: f.name,
      parentFolderId: f.parentFolderId,
      createdBy: f.createdBy,
      documentCount: f._count.documents,
      childCount: f._count.children,
      deletedAt: f.deletedAt,
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
        _count: { select: { documents: { where: { status: { not: DocumentStatus.DELETED } } }, children: { where: { deletedAt: null } } } },
        children: { where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } },
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
      deletedAt: folder.deletedAt,
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
        _count: { select: { documents: { where: { status: { not: DocumentStatus.DELETED } } }, children: { where: { deletedAt: null } } } },
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
      deletedAt: null,
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
        _count: { select: { documents: { where: { status: { not: DocumentStatus.DELETED } } }, children: { where: { deletedAt: null } } } },
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
      deletedAt: folder.deletedAt,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  }

  /**
   * Soft-delete a folder and all its descendants + mark their documents as DELETED.
   */
  async delete(id: string, user: DevUserPayload): Promise<void> {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      select: { workspaceId: true, name: true, deletedAt: true },
    });
    if (!folder) throw new NotFoundException(`Folder "${id}" not found`);
    if (folder.deletedAt) throw new BadRequestException(`Folder is already in trash`);
    assertEditorOrAbove(user, folder.workspaceId);

    const allFolderIds = await this.collectDescendants(id);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.folder.updateMany({
        where: { id: { in: allFolderIds } },
        data: { deletedAt: now },
      }),
      this.prisma.document.updateMany({
        where: {
          folderId: { in: allFolderIds },
          status: { not: DocumentStatus.DELETED },
        },
        data: { status: DocumentStatus.DELETED },
      }),
    ]);
  }

  /**
   * Restore a soft-deleted folder and all its descendants + restore their documents to ACTIVE.
   */
  async restore(id: string, user: DevUserPayload): Promise<void> {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      select: { workspaceId: true, name: true, deletedAt: true },
    });
    if (!folder) throw new NotFoundException(`Folder "${id}" not found`);
    if (!folder.deletedAt) throw new BadRequestException(`Folder is not in trash`);
    assertEditorOrAbove(user, folder.workspaceId);

    const allFolderIds = await this.collectDeletedDescendants(id);

    await this.prisma.$transaction([
      this.prisma.folder.updateMany({
        where: { id: { in: allFolderIds } },
        data: { deletedAt: null },
      }),
      this.prisma.document.updateMany({
        where: {
          folderId: { in: allFolderIds },
          status: DocumentStatus.DELETED,
        },
        data: { status: DocumentStatus.ACTIVE },
      }),
    ]);
  }

  /** BFS to collect a folder and all its non-deleted descendants. */
  private async collectDescendants(rootId: string): Promise<string[]> {
    const ids: string[] = [rootId];
    const queue: string[] = [rootId];
    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = await this.prisma.folder.findMany({
        where: { parentFolderId: parentId, deletedAt: null },
        select: { id: true },
      });
      for (const child of children) {
        ids.push(child.id);
        queue.push(child.id);
      }
    }
    return ids;
  }

  /** BFS to collect a deleted folder and all its deleted descendants. */
  private async collectDeletedDescendants(rootId: string): Promise<string[]> {
    const ids: string[] = [rootId];
    const queue: string[] = [rootId];
    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = await this.prisma.folder.findMany({
        where: { parentFolderId: parentId, deletedAt: { not: null } },
        select: { id: true },
      });
      for (const child of children) {
        ids.push(child.id);
        queue.push(child.id);
      }
    }
    return ids;
  }
}
