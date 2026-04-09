import type { CurrentUser, SwitchWorkspaceResponse, WorkspaceMembership } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8081';

/**
 * DEV ONLY — the email used to impersonate a user via x-dev-user-email header.
 *
 * Replacement path (when real auth is ready):
 *   1. Remove DEV_USER_EMAIL and the header set below.
 *   2. Read the access token from the session/cookie.
 *   3. Set: headers.set('Authorization', `Bearer ${token}`)
 *   All other code (apiFetch calls, context, components) stays unchanged.
 */
const DEV_USER_EMAIL =
  process.env.NEXT_PUBLIC_DEV_USER_EMAIL ?? 'alice@acmecorp.com';

interface RequestOptions extends RequestInit {
  token?: string;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);
  headers.set('Content-Type', 'application/json');

  // DEV ONLY — replace with Bearer token when auth is implemented
  headers.set('x-dev-user-email', DEV_USER_EMAIL);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.message ?? res.statusText);
  }

  // 204 No Content — no body to parse
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

/**
 * Send multipart/form-data to the API (for file uploads).
 * Do NOT set Content-Type manually — the browser sets it with the boundary.
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const headers = new Headers();
  // DEV ONLY — replace with Bearer token when auth is implemented
  headers.set('x-dev-user-email', DEV_USER_EMAIL);

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.message ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

/**
 * Download a file from the API as a Blob and trigger a browser download.
 * Uses the x-dev-user-email header so auth is applied.
 */
export async function apiDownload(path: string, fallbackFileName: string): Promise<void> {
  const headers = new Headers();
  headers.set('x-dev-user-email', DEV_USER_EMAIL);

  const res = await fetch(`${API_URL}${path}`, { headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.message ?? res.statusText);
  }

  const blob = await res.blob();

  // Extract filename from Content-Disposition if present
  const disposition = res.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="([^"]+)"/);
  const fileName = match ? decodeURIComponent(match[1]) : fallbackFileName;

  // Trigger browser download
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

// ------------------------------------------------------------------ //
// Auth API calls — used by UserContext
// ------------------------------------------------------------------ //

/** Fetch the current user and all workspace memberships. */
export function fetchCurrentUser(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>('/api/v1/auth/me');
}

/** Fetch only the workspace memberships of the current user. */
export function fetchMyWorkspaces(): Promise<WorkspaceMembership[]> {
  return apiFetch<WorkspaceMembership[]>('/api/v1/auth/workspaces');
}

/** Switch the active workspace and return the workspace + role context. */
export function switchWorkspaceApi(
  workspaceId: string,
): Promise<SwitchWorkspaceResponse> {
  return apiFetch<SwitchWorkspaceResponse>('/api/v1/auth/switch-workspace', {
    method: 'POST',
    body: JSON.stringify({ workspaceId }),
  });
}

// ------------------------------------------------------------------ //
// Error class
// ------------------------------------------------------------------ //

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
