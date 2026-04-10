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
 * Defined here and re-exported via dev-auth.guard.ts for zero-change backward compat.
 * Every controller / service that imports `DevUserPayload` from dev-auth.guard.ts
 * continues to work without modification.
 */
export type DevUserPayload = User & {
  workspaces: (WorkspaceUser & {
    workspace: Workspace;
  })[];
};

/**
 * ClerkAuthGuard — dual-mode authentication guard.
 *
 * Mode 1 — Clerk (CLERK_SECRET_KEY is set):
 *   Verifies the Clerk JWT from `Authorization: Bearer <token>`.
 *   On first login, links the Clerk user to an existing DB user by email and
 *   persists the clerkId for fast lookup on subsequent requests.
 *
 * Mode 2 — Dev fallback (CLERK_SECRET_KEY is NOT set):
 *   Reads the `x-dev-user-email` header (default: alice@acmecorp.com) and
 *   resolves the user from the database — identical to the original DevAuthGuard.
 *
 * Exported as `DevAuthGuard` from dev-auth.guard.ts so that every existing
 * @UseGuards(DevAuthGuard) and providers: [DevAuthGuard] continues to work
 * unchanged.
 */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const secretKey = process.env.CLERK_SECRET_KEY;

    if (secretKey) {
      return this.verifyClerkToken(request, secretKey);
    }

    return this.verifyDevHeader(request);
  }

  // ------------------------------------------------------------------ //
  // Clerk JWT path
  // ------------------------------------------------------------------ //

  private async verifyClerkToken(
    request: Request,
    secretKey: string,
  ): Promise<boolean> {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }
    const token = authHeader.slice(7);

    let clerkUserId: string;
    try {
      // @clerk/backend is an optional peer dependency — required only in production.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { verifyToken } = require('@clerk/backend') as typeof import('@clerk/backend');
      const payload = await verifyToken(token, { secretKey });
      clerkUserId = payload.sub;
    } catch (err) {
      throw new UnauthorizedException(
        err instanceof Error ? err.message : 'Invalid or expired Clerk token',
      );
    }

    // Fast path: user already linked by Clerk ID
    let user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      include: {
        workspaces: {
          where: { status: 'ACTIVE' },
          include: { workspace: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user) {
      // Slow path: first login — look up by email and link Clerk ID
      user = await this.linkClerkUser(clerkUserId, secretKey);
    }

    (request as Request & { devUser: DevUserPayload }).devUser = user;
    return true;
  }

  /**
   * On first login, fetch the Clerk user's primary email from Clerk API,
   * find the matching DB user (provisioned by an admin), write back the clerkId,
   * and return the fully hydrated DevUserPayload for this request.
   */
  private async linkClerkUser(
    clerkUserId: string,
    secretKey: string,
  ): Promise<DevUserPayload> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClerkClient } = require('@clerk/backend') as typeof import('@clerk/backend');
    const clerk = createClerkClient({ secretKey });
    const clerkUser = await clerk.users.getUser(clerkUserId);

    const email =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      throw new UnauthorizedException('Clerk user has no email address');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (!existing) {
      throw new UnauthorizedException(
        `User "${email}" has not been provisioned in this workspace. Ask an admin to add you first.`,
      );
    }

    return this.prisma.user.update({
      where: { id: existing.id },
      data: { clerkId: clerkUserId },
      include: {
        workspaces: {
          where: { status: 'ACTIVE' },
          include: { workspace: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  // ------------------------------------------------------------------ //
  // Dev-header fallback (no CLERK_SECRET_KEY)
  // ------------------------------------------------------------------ //

  private async verifyDevHeader(request: Request): Promise<boolean> {
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

    (request as Request & { devUser: DevUserPayload }).devUser = user;
    return true;
  }
}
