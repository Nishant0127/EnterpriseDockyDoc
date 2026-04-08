import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  WorkspaceResponseDto,
  WorkspaceDetailResponseDto,
  WorkspaceMemberDto,
} from './dto/workspace-response.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Return all ACTIVE workspaces with member count.
   */
  async findAll(): Promise<WorkspaceResponseDto[]> {
    const workspaces = await this.prisma.workspace.findMany({
      where: { status: 'ACTIVE' },
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

  /**
   * Return a single workspace with full member list.
   * Throws 404 if not found.
   */
  async findById(id: string): Promise<WorkspaceDetailResponseDto> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: { user: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with id "${id}" not found`);
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
      members,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }
}
