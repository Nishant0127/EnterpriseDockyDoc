import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LocalStorageService } from '../storage/local-storage.service';
import { assertWorkspaceMembership } from '../../common/helpers/workspace-access.helper';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import {
  createAccessGrant,
  generateShareToken,
  hashPassword,
  verifyAccessGrant,
  verifyPassword,
} from './share-crypto.util';
import type {
  CreateExternalShareDto,
  CreateInternalShareDto,
  DocumentSharesResponseDto,
  ExternalShareDto,
  InternalShareDto,
  PublicShareInfoDto,
  VerifyShareResponseDto,
} from './dto/share.dto';

// ------------------------------------------------------------------ //
// Helpers
// ------------------------------------------------------------------ //

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

@Injectable()
export class SharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageService,
  ) {}

  // ------------------------------------------------------------------ //
  // POST /documents/:id/share/internal
  // ------------------------------------------------------------------ //

  async createInternalShare(
    documentId: string,
    dto: CreateInternalShareDto,
    user: DevUserPayload,
  ): Promise<InternalShareDto[]> {
    const doc = await this.requireAccessibleDocument(documentId, user);

    // Validate that all target users are active workspace members
    const workspaceMembers = await this.prisma.workspaceUser.findMany({
      where: {
        workspaceId: doc.workspaceId,
        userId: { in: dto.userIds },
        status: 'ACTIVE',
      },
      select: { userId: true },
    });

    const validUserIds = new Set(workspaceMembers.map((m) => m.userId));
    const invalidIds = dto.userIds.filter((id) => !validUserIds.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `User(s) not found in this workspace: ${invalidIds.join(', ')}`,
      );
    }

    // Find or create the single INTERNAL share record for this document+creator
    let share = await this.prisma.documentShare.findFirst({
      where: { documentId, shareType: 'INTERNAL', isActive: true, createdById: user.id },
    });
    if (!share) {
      share = await this.prisma.documentShare.create({
        data: {
          documentId,
          createdById: user.id,
          shareType: 'INTERNAL',
          allowDownload: dto.permission === 'DOWNLOAD',
          isActive: true,
        },
      });
    }

    // Upsert InternalDocumentShare rows — update permission if already shared
    const results: InternalShareDto[] = [];
    for (const userId of dto.userIds) {
      const internal = await this.prisma.internalDocumentShare.upsert({
        where: {
          documentShareId_sharedWithUserId: {
            documentShareId: share.id,
            sharedWithUserId: userId,
          },
        },
        update: { permission: dto.permission },
        create: {
          documentShareId: share.id,
          sharedWithUserId: userId,
          permission: dto.permission,
        },
        include: { sharedWithUser: { select: USER_SELECT } },
      });

      results.push({
        id: internal.id,
        shareId: share.id,
        sharedWith: internal.sharedWithUser,
        permission: internal.permission,
        createdAt: internal.createdAt.toISOString(),
      });
    }

    return results;
  }

  // ------------------------------------------------------------------ //
  // POST /documents/:id/share/external
  // ------------------------------------------------------------------ //

  async createExternalShare(
    documentId: string,
    dto: CreateExternalShareDto,
    user: DevUserPayload,
  ): Promise<ExternalShareDto> {
    const doc = await this.requireAccessibleDocument(documentId, user);

    const token = generateShareToken();
    const passwordHash = dto.password ? hashPassword(dto.password) : null;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const share = await this.prisma.documentShare.create({
      data: {
        documentId,
        createdById: user.id,
        shareType: 'EXTERNAL_LINK',
        token,
        passwordHash,
        expiresAt,
        allowDownload: dto.allowDownload,
        isActive: true,
      },
      include: { createdBy: { select: USER_SELECT } },
    });

    return this.toExternalShareDto(share);
  }

  // ------------------------------------------------------------------ //
  // GET /documents/:id/shares
  // ------------------------------------------------------------------ //

  async getDocumentShares(
    documentId: string,
    user: DevUserPayload,
  ): Promise<DocumentSharesResponseDto> {
    const doc = await this.requireAccessibleDocument(documentId, user);

    const shares = await this.prisma.documentShare.findMany({
      where: { documentId, isActive: true },
      include: {
        createdBy: { select: USER_SELECT },
        internalShares: {
          include: { sharedWithUser: { select: USER_SELECT } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const internalShares: InternalShareDto[] = [];
    const externalShares: ExternalShareDto[] = [];

    for (const share of shares) {
      if (share.shareType === 'INTERNAL') {
        for (const is of share.internalShares) {
          internalShares.push({
            id: is.id,
            shareId: share.id,
            sharedWith: is.sharedWithUser,
            permission: is.permission,
            createdAt: is.createdAt.toISOString(),
          });
        }
      } else {
        externalShares.push(this.toExternalShareDto(share));
      }
    }

    return { internalShares, externalShares };
  }

  // ------------------------------------------------------------------ //
  // POST /shares/:shareId/revoke
  // ------------------------------------------------------------------ //

  async revokeShare(shareId: string, user: DevUserPayload): Promise<void> {
    const share = await this.prisma.documentShare.findUnique({
      where: { id: shareId },
      include: { document: { select: { workspaceId: true } } },
    });

    if (!share) throw new NotFoundException(`Share "${shareId}" not found`);

    // Must be a workspace member to revoke
    assertWorkspaceMembership(user, share.document.workspaceId);

    if (!share.isActive) {
      throw new ConflictException('Share is already revoked');
    }

    await this.prisma.documentShare.update({
      where: { id: shareId },
      data: { isActive: false },
    });
  }

  // ------------------------------------------------------------------ //
  // GET /public/shares/:token — unauthenticated
  // ------------------------------------------------------------------ //

  async getPublicShareInfo(
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PublicShareInfoDto> {
    const share = await this.findValidPublicShare(token);

    // Log the view access
    await this.prisma.shareAccessLog.create({
      data: {
        documentShareId: share.id,
        accessType: 'VIEW',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });

    return {
      id: share.id,
      documentId: share.documentId,
      documentName: share.document.name,
      allowDownload: share.allowDownload,
      expiresAt: share.expiresAt?.toISOString() ?? null,
      requiresPassword: !!share.passwordHash,
      shareType: share.shareType,
    };
  }

  // ------------------------------------------------------------------ //
  // POST /public/shares/:token/verify — unauthenticated
  // ------------------------------------------------------------------ //

  async verifySharePassword(
    token: string,
    password: string,
  ): Promise<VerifyShareResponseDto> {
    const share = await this.findValidPublicShare(token);

    if (!share.passwordHash) {
      throw new BadRequestException('This share is not password protected');
    }

    if (!verifyPassword(password, share.passwordHash)) {
      throw new UnauthorizedException('Incorrect password');
    }

    const { grant, expiresIn } = createAccessGrant(share.id);
    return { accessGrant: grant, expiresIn };
  }

  // ------------------------------------------------------------------ //
  // GET /public/shares/:token/download — unauthenticated
  // ------------------------------------------------------------------ //

  async getPublicShareDownloadInfo(
    token: string,
    grant?: string,
    password?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ absolutePath: string; fileName: string; mimeType: string }> {
    const share = await this.findValidPublicShare(token);

    if (!share.allowDownload) {
      throw new ForbiddenException('Download is not allowed for this share');
    }

    // Verify access: grant token OR password
    if (share.passwordHash) {
      let authorized = false;

      if (grant) {
        const grantShareId = verifyAccessGrant(grant);
        authorized = grantShareId === share.id;
      } else if (password) {
        authorized = verifyPassword(password, share.passwordHash);
      }

      if (!authorized) {
        throw new UnauthorizedException(
          'Password verification required. Use POST /verify first.',
        );
      }
    }

    // Get the latest version for download
    const version = await this.prisma.documentVersion.findFirst({
      where: { documentId: share.documentId },
      orderBy: { versionNumber: 'desc' },
    });

    if (!version) throw new NotFoundException('No file version found');

    if (!this.storage.exists(version.storageKey)) {
      throw new NotFoundException('File not found in storage');
    }

    // Log download access
    await this.prisma.shareAccessLog.create({
      data: {
        documentShareId: share.id,
        accessType: 'DOWNLOAD',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });

    return {
      absolutePath: this.storage.getAbsolutePath(version.storageKey),
      fileName: share.document.fileName,
      mimeType: version.mimeType,
    };
  }

  // ------------------------------------------------------------------ //
  // Private helpers
  // ------------------------------------------------------------------ //

  private async requireAccessibleDocument(documentId: string, user: DevUserPayload) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, workspaceId: true, status: true, name: true, fileName: true },
    });

    if (!doc) throw new NotFoundException(`Document "${documentId}" not found`);
    if (doc.status === DocumentStatus.DELETED) {
      throw new BadRequestException('Cannot share a deleted document');
    }

    assertWorkspaceMembership(user, doc.workspaceId);
    return doc;
  }

  private async findValidPublicShare(token: string) {
    const share = await this.prisma.documentShare.findUnique({
      where: { token },
      include: {
        document: {
          select: { id: true, name: true, fileName: true, status: true },
        },
      },
    });

    if (!share) throw new NotFoundException('Share not found');
    if (!share.isActive) throw new ForbiddenException('This share has been revoked');
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new ForbiddenException('This share link has expired');
    }
    if (share.document.status === DocumentStatus.DELETED) {
      throw new ForbiddenException('The document associated with this share no longer exists');
    }

    return share;
  }

  private toExternalShareDto(share: {
    id: string;
    token: string | null;
    expiresAt: Date | null;
    allowDownload: boolean;
    passwordHash: string | null;
    isActive: boolean;
    createdAt: Date;
    createdBy: { id: string; firstName: string; lastName: string; email: string };
  }): ExternalShareDto {
    return {
      id: share.id,
      token: share.token ?? '',
      expiresAt: share.expiresAt?.toISOString() ?? null,
      allowDownload: share.allowDownload,
      hasPassword: !!share.passwordHash,
      isActive: share.isActive,
      createdAt: share.createdAt.toISOString(),
      createdBy: share.createdBy,
    };
  }
}
