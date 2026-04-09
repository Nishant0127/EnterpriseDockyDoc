import { ForbiddenException } from '@nestjs/common';
import type { DevUserPayload } from '../guards/dev-auth.guard';

type WorkspaceRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

const ROLE_RANK: Record<WorkspaceRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  EDITOR: 2,
  VIEWER: 1,
};

function getMembership(user: DevUserPayload, workspaceId: string) {
  return user.workspaces.find(
    (m) => m.workspaceId === workspaceId && m.status === 'ACTIVE',
  );
}

/**
 * assertWorkspaceMembership
 *
 * Throws ForbiddenException if the resolved dev user is not an active
 * member of the given workspace.
 */
export function assertWorkspaceMembership(
  user: DevUserPayload,
  workspaceId: string,
): void {
  if (!getMembership(user, workspaceId)) {
    throw new ForbiddenException(
      `You do not have access to workspace "${workspaceId}"`,
    );
  }
}

/**
 * assertEditorOrAbove
 *
 * Throws ForbiddenException if the user's role is VIEWER.
 * Editors, Admins, and Owners can create/edit documents, folders, tags, and shares.
 */
export function assertEditorOrAbove(
  user: DevUserPayload,
  workspaceId: string,
): void {
  const membership = getMembership(user, workspaceId);
  if (!membership) {
    throw new ForbiddenException(
      `You do not have access to workspace "${workspaceId}"`,
    );
  }
  if (ROLE_RANK[membership.role as WorkspaceRole] < ROLE_RANK.EDITOR) {
    throw new ForbiddenException(
      'Viewers cannot perform write operations. Contact an Admin or Owner to change your role.',
    );
  }
}

/**
 * assertAdminOrAbove
 *
 * Throws ForbiddenException if the user's role is EDITOR or VIEWER.
 * Admins and Owners can shred documents, manage members, rename workspaces.
 */
export function assertAdminOrAbove(
  user: DevUserPayload,
  workspaceId: string,
): void {
  const membership = getMembership(user, workspaceId);
  if (!membership) {
    throw new ForbiddenException(
      `You do not have access to workspace "${workspaceId}"`,
    );
  }
  if (ROLE_RANK[membership.role as WorkspaceRole] < ROLE_RANK.ADMIN) {
    throw new ForbiddenException(
      'Only Admins and Owners can perform this action.',
    );
  }
}
