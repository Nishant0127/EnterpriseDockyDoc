import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * UsersService — CRUD for user accounts.
 *
 * All DB calls go through PrismaService.
 * Methods are stubs until the User model is defined in schema.prisma.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all users in a workspace.
   * Will be: this.prisma.user.findMany({ where: { workspaceId } })
   */
  async findAll(): Promise<unknown[]> {
    // TODO: implement after User model is added to schema
    return [];
  }

  /**
   * Find one user by ID.
   */
  async findById(_id: string): Promise<unknown | null> {
    // TODO: implement after User model is added to schema
    return null;
  }
}
