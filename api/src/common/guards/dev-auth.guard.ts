import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { User, WorkspaceUser, Workspace } from '@prisma/client';
import type { Request } from 'express';

/**
 * DevUserPayload — the resolved user object attached to request.devUser.
 *
 * This type mirrors what Prisma returns for:
 *   prisma.user.findUnique({ include: { workspaces: { include: { workspace: true } } } })
 *
 * When real JWT auth is implemented, replace this type with a JWT payload type
 * and swap this guard for a JwtAuthGuard that validates the Bearer token.
 */
export type DevUserPayload = User & {
  workspaces: (WorkspaceUser & {
    workspace: Workspace;
  })[];
};

/**
 * DEV-ONLY auth guard.
 *
 * Reads the `x-dev-user-email` request header (defaults to alice@acmecorp.com),
 * looks up the user in the database, and attaches it to `request.devUser`.
 *
 * Replacement path (when real auth is ready):
 *   1. Remove this guard.
 *   2. Add JwtAuthGuard that validates Bearer token from Authorization header.
 *   3. Replace @CurrentUser() extraction from request.devUser → request.user (JWT payload).
 *   4. All controller code remains unchanged.
 */
@Injectable()
export class DevAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const email =
      (request.headers['x-dev-user-email'] as string | undefined)?.trim() ??
      'alice@acmecorp.com';

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        workspaces: {
          where: { status: 'ACTIVE' },
          include: { workspace: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        `Dev user "${email}" not found. Check that the database is seeded and the email matches a user record.`,
      );
    }

    // Attach to request — extracted by @CurrentUser() decorator
    (request as Request & { devUser: DevUserPayload }).devUser = user;
    return true;
  }
}
