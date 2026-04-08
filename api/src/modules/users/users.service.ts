import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Return all active users with their workspace memberships.
   */
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      include: {
        workspaces: {
          where: { status: 'ACTIVE' },
          include: { workspace: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      isActive: u.isActive,
      workspaces: u.workspaces.map((m) => ({
        workspaceId: m.workspaceId,
        workspaceName: m.workspace.name,
        workspaceSlug: m.workspace.slug,
        role: m.role,
        status: m.status,
      })),
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  /**
   * Return a single user by ID with workspace memberships.
   * Throws 404 if not found.
   */
  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        workspaces: {
          include: { workspace: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      workspaces: user.workspaces.map((m) => ({
        workspaceId: m.workspaceId,
        workspaceName: m.workspace.name,
        workspaceSlug: m.workspace.slug,
        role: m.role,
        status: m.status,
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
