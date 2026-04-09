import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceUserRole, WorkspaceUserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService, AuditAction, AuditEntityType } from '../audit/audit.service';
import {
  assertWorkspaceMembership,
  assertAdminOrAbove,
} from '../../common/helpers/workspace-access.helper';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import {
  WorkspaceMemberDto,
  WorkspaceResponseDto,
  WorkspaceDetailResponseDto,
  WorkspaceSummaryDto,
} from './dto/workspace-response.dto';
import type {
  AddWorkspaceMemberDto,
  UpdateWorkspaceMemberDto,
  UpdateWorkspaceDto,
} from './dto/add-member.dto';

// Roles that can manage members
const MANAGER_ROLES = new Set<WorkspaceUserRole>([
  WorkspaceUserRole.OWNER,
  WorkspaceUserRole.ADMIN,
]);

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ------------------------------------------------------------------ //
  // Read
  // ------------------------------------------------------------------ //

  async findAll(user: DevUserPayload): Promise<WorkspaceResponseDto[]> {
    // Only return workspaces the caller is an active member of
    const memberWorkspaceIds = user.workspaces
      .filter((w) => w.status === 'ACTIVE')
      .map((w) => w.workspaceId);

    if (memberWorkspaceIds.length === 0) return [];

    const workspaces = await this.prisma.workspace.findMany({
      where: {
        id: { in: memberWorkspaceIds },
        status: 'ACTIVE',
      },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return workspaces.map((ws) => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      type: ws.type,
      status: ws.status,
      memberCount: ws._count.members,
      createdAt: ws.createdAt,
      updatedAt: ws.updatedAt,
    }));
  }

  async findById(id: string, user: DevUserPayload): Promise<WorkspaceDetailResponseDto> {
    // Verify caller is an active member before revealing any workspace data
    assertWorkspaceMembership(user, id);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: { user: true },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { documents: true } },
      },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${id}" not found`);
    }

    const members: WorkspaceMemberDto[] = workspace.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      email: m.user.email,
      role: m.role,
      status: m.status,
      joinedAt: m.createdAt,
    }));

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      type: workspace.type,
      status: workspace.status,
      memberCount: members.length,
      documentCount: workspace._count.documents,
      members,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }

  // ------------------------------------------------------------------ //
  // Dashboard summary
  // ------------------------------------------------------------------ //

  async getSummary(workspaceId: string, user: DevUserPayload): Promise<WorkspaceSummaryDto> {
    assertWorkspaceMembership(user, workspaceId);

    const now = new Date();
    const ninetyDaysOut = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalDocuments,
      activeDocuments,
      archivedDocuments,
      expiringCount,
      expiredCount,
      activeShares,
      memberCount,
      recentUploads,
    ] = await Promise.all([
      this.prisma.document.count({ where: { workspaceId, status: { not: 'DELETED' } } }),
      this.prisma.document.count({ where: { workspaceId, status: 'ACTIVE' } }),
      this.prisma.document.count({ where: { workspaceId, status: 'ARCHIVED' } }),
      this.prisma.document.count({
        where: {
          workspaceId,
          status: 'ACTIVE',
          expiryDate: { gte: now, lte: ninetyDaysOut },
        },
      }),
      this.prisma.document.count({
        where: { workspaceId, status: 'ACTIVE', expiryDate: { lt: now } },
      }),
      this.prisma.documentShare.count({
        where: {
          document: { workspaceId },
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      this.prisma.workspaceUser.count({ where: { workspaceId, status: 'ACTIVE' } }),
      this.prisma.document.count({
        where: { workspaceId, status: 'ACTIVE', createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    return {
      totalDocuments,
      activeDocuments,
      archivedDocuments,
      expiringCount,
      expiredCount,
      activeShares,
      memberCount,
      recentUploads,
    };
  }

  // ------------------------------------------------------------------ //
  // Update workspace (rename, etc.) — ADMIN/OWNER only
  // ------------------------------------------------------------------ //

  async update(
    workspaceId: string,
    dto: UpdateWorkspaceDto,
    currentUser: DevUserPayload,
  ): Promise<WorkspaceResponseDto> {
    assertAdminOrAbove(currentUser, workspaceId);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { _count: { select: { members: true } } },
    });
    if (!workspace) throw new NotFoundException(`Workspace "${workspaceId}" not found`);

    const updated = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
      },
      include: { _count: { select: { members: true } } },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      type: updated.type,
      status: updated.status,
      memberCount: updated._count.members,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  // ------------------------------------------------------------------ //
  // Add member
  // ------------------------------------------------------------------ //

  async addMember(
    workspaceId: string,
    dto: AddWorkspaceMemberDto,
    currentUser: DevUserPayload,
  ): Promise<WorkspaceMemberDto> {
    this.assertManagerRole(currentUser, workspaceId);

    // Ensure workspace exists
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException(`Workspace "${workspaceId}" not found`);

    // Find or create the user by email
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          isActive: true,
        },
      });
    }

    // Check for existing membership
    const existing = await this.prisma.workspaceUser.findUnique({
      where: {
        userId_workspaceId: { userId: user.id, workspaceId },
      },
    });

    if (existing?.status === WorkspaceUserStatus.ACTIVE) {
      throw new ConflictException(
        `${dto.email} is already an active member of this workspace`,
      );
    }

    // Create or reactivate
    const membership = existing
      ? await this.prisma.workspaceUser.update({
          where: { id: existing.id },
          data: { role: dto.role, status: WorkspaceUserStatus.ACTIVE },
          include: { user: true },
        })
      : await this.prisma.workspaceUser.create({
          data: {
            workspaceId,
            userId: user.id,
            role: dto.role,
            status: WorkspaceUserStatus.ACTIVE,
          },
          include: { user: true },
        });

    this.audit.log({
      workspaceId,
      userId: currentUser.id,
      action: AuditAction.MEMBER_ADDED,
      entityType: AuditEntityType.USER,
      entityId: user.id,
      metadata: { email: dto.email, role: dto.role },
    });

    return this.toMemberDto(membership);
  }

  // ------------------------------------------------------------------ //
  // Update member role / status
  // ------------------------------------------------------------------ //

  async updateMember(
    workspaceId: string,
    memberId: string,
    dto: UpdateWorkspaceMemberDto,
    currentUser: DevUserPayload,
  ): Promise<WorkspaceMemberDto> {
    this.assertManagerRole(currentUser, workspaceId);

    const membership = await this.prisma.workspaceUser.findFirst({
      where: { id: memberId, workspaceId },
      include: { user: true },
    });
    if (!membership) throw new NotFoundException('Member not found');

    // Guard: cannot modify your own membership via this endpoint
    if (membership.userId === currentUser.id) {
      throw new ForbiddenException(
        'You cannot modify your own workspace membership.',
      );
    }

    // Guard: only OWNERs may grant the OWNER role
    if (dto.role === WorkspaceUserRole.OWNER) {
      const callerMembership = currentUser.workspaces.find(
        (w) => w.workspaceId === workspaceId,
      );
      if (callerMembership?.role !== WorkspaceUserRole.OWNER) {
        throw new ForbiddenException(
          'Only an existing Owner can grant the Owner role.',
        );
      }
    }

    // Guard: cannot demote or remove the last OWNER
    if (
      membership.role === WorkspaceUserRole.OWNER &&
      (dto.role !== WorkspaceUserRole.OWNER ||
        dto.status === WorkspaceUserStatus.REMOVED)
    ) {
      const ownerCount = await this.prisma.workspaceUser.count({
        where: {
          workspaceId,
          role: WorkspaceUserRole.OWNER,
          status: WorkspaceUserStatus.ACTIVE,
        },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Cannot change or remove the only owner of this workspace',
        );
      }
    }

    const updated = await this.prisma.workspaceUser.update({
      where: { id: memberId },
      data: {
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: { user: true },
    });

    this.audit.log({
      workspaceId,
      userId: currentUser.id,
      action: AuditAction.MEMBER_ROLE_UPDATED,
      entityType: AuditEntityType.USER,
      entityId: membership.userId,
      metadata: {
        email: membership.user.email,
        ...(dto.role && { newRole: dto.role }),
        ...(dto.status && { newStatus: dto.status }),
      },
    });

    return this.toMemberDto(updated);
  }

  // ------------------------------------------------------------------ //
  // Private helpers
  // ------------------------------------------------------------------ //

  private assertManagerRole(user: DevUserPayload, workspaceId: string): void {
    const membership = user.workspaces.find(
      (w) => w.workspaceId === workspaceId,
    );
    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
    if (!MANAGER_ROLES.has(membership.role as WorkspaceUserRole)) {
      throw new ForbiddenException(
        'Only OWNER or ADMIN can manage workspace members',
      );
    }
  }

  private toMemberDto(m: {
    id: string;
    userId: string;
    role: WorkspaceUserRole;
    status: WorkspaceUserStatus;
    createdAt: Date;
    user: { firstName: string; lastName: string; email: string };
  }): WorkspaceMemberDto {
    return {
      id: m.id,
      userId: m.userId,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      email: m.user.email,
      role: m.role,
      status: m.status,
      joinedAt: m.createdAt,
    };
  }
}
