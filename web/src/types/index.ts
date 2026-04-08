/**
 * Shared TypeScript types used across the web app.
 * Keep in sync with NestJS DTOs in api/src/modules/*/dto/
 */

// ------------------------------------------------------------------ //
// Enums (mirrored from Prisma)
// ------------------------------------------------------------------ //

export type WorkspaceType = 'PERSONAL' | 'FAMILY' | 'ENTERPRISE';
export type WorkspaceUserRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
export type WorkspaceUserStatus = 'ACTIVE' | 'INVITED' | 'REMOVED';
export type WorkspaceStatus = 'ACTIVE' | 'INACTIVE';

// ------------------------------------------------------------------ //
// Auth / Current user  (matches MeResponseDto + WorkspaceMembershipDto)
// ------------------------------------------------------------------ //

export interface WorkspaceMembership {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceType: WorkspaceType;
  role: WorkspaceUserRole;
  status: WorkspaceUserStatus;
}

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  workspaces: WorkspaceMembership[];
  defaultWorkspace: WorkspaceMembership | null;
}

/** Response from POST /api/v1/auth/switch-workspace */
export interface SwitchWorkspaceResponse {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceType: WorkspaceType;
  role: WorkspaceUserRole;
}

// ------------------------------------------------------------------ //
// Workspaces list (matches WorkspaceResponseDto)
// ------------------------------------------------------------------ //

export interface WorkspaceListItem {
  id: string;
  name: string;
  slug: string;
  type: WorkspaceType;
  status: WorkspaceStatus;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------------ //
// Pagination
// ------------------------------------------------------------------ //

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ------------------------------------------------------------------ //
// API error shape (matches NestJS HttpExceptionFilter output)
// ------------------------------------------------------------------ //

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path: string;
}
