import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * WorkspacesService — CRUD for workspaces.
 *
 * Stubs until Workspace model is added to schema.prisma.
 *
 * Multi-tenancy pattern:
 *   - Every query filters by workspaceId
 *   - workspaceId comes from the authenticated user's JWT payload
 *   - No cross-workspace data leakage is possible by design
 */
@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<unknown[]> {
    // TODO: this.prisma.workspace.findMany()
    return [];
  }

  async findById(_id: string): Promise<unknown | null> {
    // TODO: this.prisma.workspace.findUnique({ where: { id } })
    return null;
  }
}
