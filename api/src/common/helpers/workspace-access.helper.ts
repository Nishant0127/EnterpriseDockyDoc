import { ForbiddenException } from '@nestjs/common';
import type { DevUserPayload } from '../guards/dev-auth.guard';

/**
 * assertWorkspaceMembership
 *
 * Throws ForbiddenException if the resolved dev user is not an active
 * member of the given workspace.
 *
 * Because DevUserPayload already includes the user's workspaces (loaded
 * by DevAuthGuard), this check is in-memory — no extra DB query needed.
 *
 * Replacement path (real JWT auth):
 *   - Same function signature; just change DevUserPayload to your JwtPayload type.
 *   - The guard will still attach workspaces to request.user.
 */
export function assertWorkspaceMembership(
  user: DevUserPayload,
  workspaceId: string,
): void {
  const isMember = user.workspaces.some(
    (m) => m.workspaceId === workspaceId && m.status === 'ACTIVE',
  );

  if (!isMember) {
    throw new ForbiddenException(
      `You do not have access to workspace "${workspaceId}"`,
    );
  }
}
