import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { assertWorkspaceMembership } from '../../common/helpers/workspace-access.helper';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import {
  CreateDocumentDto,
  DocumentDetailDto,
  DocumentListItemDto,
  UpdateDocumentDto,
  DocumentQueryDto,
} from './dto/document.dto';

// Prisma include shape reused by findAll and findById
const DOC_LIST_INCLUDE = {
  folder: { select: { id: true, name: true } },
  owner: { select: { id: true, firstName: true, lastName: true, email: true } },
  tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
  _count: { select: { versions: true } },
} as const;

const DOC_DETAIL_INCLUDE = {
  folder: { select: { id: true, name: true } },
  owner: { select: { id: true, firstName: true, lastName: true, email: true } },
  workspace: { select: { id: true, name: true } },
  tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
  versions: {
    include: {
      uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { versionNumber: 'desc' as const },
  },
  metadata: { orderBy: { key: 'asc' as const } },
  _count: { select: { versions: true } },
} as const;

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------ //
  // List
  // ------------------------------------------------------------------ //

  async findAll(query: DocumentQueryDto, user: DevUserPayload): Promise<DocumentListItemDto[]> {
    assertWorkspaceMembership(user, query.workspaceId);

    const docs = await this.prisma.document.findMany({
      where: {
        workspaceId: query.workspaceId,
        // Default: hide DELETED unless explicitly requested
        status: query.status ?? { not: DocumentStatus.DELETED },
        ...(query.folderId && { folderId: query.folderId }),
        ...(query.ownerUserId && { ownerUserId: query.ownerUserId }),
      },
      include: DOC_LIST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d) => this.toListItemDto(d));
  }

  // ------------------------------------------------------------------ //
  // Detail
  // ------------------------------------------------------------------ //

  async findById(id: string, user: DevUserPayload): Promise<DocumentDetailDto> {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: DOC_DETAIL_INCLUDE,
    });

    if (!doc) throw new NotFoundException(`Document "${id}" not found`);
    assertWorkspaceMembership(user, doc.workspaceId);

    return {
      id: doc.id,
      workspaceId: doc.workspaceId,
      name: doc.name,
      description: doc.description,
      fileName: doc.fileName,
      fileType: doc.fileType,
      status: doc.status,
      currentVersionNumber: doc.currentVersionNumber,
      folder: doc.folder,
      owner: doc.owner,
      workspace: doc.workspace,
      tags: doc.tags.map((t) => t.tag),
      versionCount: doc._count.versions,
      versions: doc.versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        storageKey: v.storageKey,
        fileSizeBytes: v.fileSizeBytes.toString(),
        mimeType: v.mimeType,
        uploadedBy: v.uploadedBy,
        createdAt: v.createdAt,
      })),
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  // ------------------------------------------------------------------ //
  // Create
  // ------------------------------------------------------------------ //

  /**
   * Creates a Document record and its initial DocumentVersion (v1) in a transaction.
   * No file binary yet — storageKey is a placeholder path for future upload integration.
   */
  async create(dto: CreateDocumentDto, user: DevUserPayload): Promise<DocumentDetailDto> {
    assertWorkspaceMembership(user, dto.workspaceId);

    const created = await this.prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          workspaceId: dto.workspaceId,
          folderId: dto.folderId ?? null,
          ownerUserId: dto.ownerUserId,
          name: dto.name,
          description: dto.description ?? null,
          fileName: dto.fileName,
          fileType: dto.fileType,
          status: DocumentStatus.ACTIVE,
          currentVersionNumber: 1,
        },
      });

      await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: 1,
          storageKey: `pending/${dto.workspaceId}/${doc.id}/v1/${dto.fileName}`,
          fileSizeBytes: BigInt(0), // replaced on actual upload
          mimeType: dto.mimeType,
          uploadedById: dto.ownerUserId,
        },
      });

      return doc;
    });

    return this.findById(created.id, user);
  }

  // ------------------------------------------------------------------ //
  // Update
  // ------------------------------------------------------------------ //

  async update(
    id: string,
    dto: UpdateDocumentDto,
    user: DevUserPayload,
  ): Promise<DocumentListItemDto> {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Document "${id}" not found`);
    assertWorkspaceMembership(user, existing.workspaceId);

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.folderId !== undefined && { folderId: dto.folderId }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: DOC_LIST_INCLUDE,
    });

    return this.toListItemDto(updated);
  }

  // ------------------------------------------------------------------ //
  // Soft delete
  // ------------------------------------------------------------------ //

  async softDelete(id: string, user: DevUserPayload): Promise<{ id: string; status: DocumentStatus }> {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Document "${id}" not found`);
    assertWorkspaceMembership(user, existing.workspaceId);

    const deleted = await this.prisma.document.update({
      where: { id },
      data: { status: DocumentStatus.DELETED },
    });

    return { id: deleted.id, status: deleted.status };
  }

  // ------------------------------------------------------------------ //
  // Private helpers
  // ------------------------------------------------------------------ //

  private toListItemDto(
    d: Awaited<ReturnType<typeof this.prisma.document.findMany>>[number] & {
      folder: { id: string; name: string } | null;
      owner: { id: string; firstName: string; lastName: string; email: string };
      tags: { tag: { id: string; name: string; color: string | null } }[];
      _count: { versions: number };
    },
  ): DocumentListItemDto {
    return {
      id: d.id,
      workspaceId: d.workspaceId,
      name: d.name,
      fileName: d.fileName,
      fileType: d.fileType,
      status: d.status,
      currentVersionNumber: d.currentVersionNumber,
      folder: d.folder,
      owner: d.owner,
      tags: d.tags.map((t) => t.tag),
      versionCount: d._count.versions,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }
}
