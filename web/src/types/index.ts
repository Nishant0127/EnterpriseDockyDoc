/**
 * Shared TypeScript types used across the web app.
 * Keep API response types in sync with the NestJS DTOs.
 */

// ------------------------------------------------------------------ //
// Auth
// ------------------------------------------------------------------ //

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  workspaceId: string;
}

export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

// ------------------------------------------------------------------ //
// Workspace
// ------------------------------------------------------------------ //

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
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
// API error shape (matches NestJS GlobalExceptionFilter output)
// ------------------------------------------------------------------ //

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path: string;
}
