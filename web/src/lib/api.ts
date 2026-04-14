import type { CurrentUser, SwitchWorkspaceResponse, WorkspaceMembership } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8081';

/**
 * DEV ONLY — the email used to impersonate a user via x-dev-user-email header.
 * Only sent when Clerk is not configured (i.e., NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is absent).
 */
const DEV_USER_EMAIL =
  process.env.NEXT_PUBLIC_DEV_USER_EMAIL ?? 'alice@acmecorp.com';

/** True when Clerk is wired up (production / staging). */
const IS_CLERK_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// ------------------------------------------------------------------ //
// Token helpers
// ------------------------------------------------------------------ //

/**
 * Get the Clerk session token when Clerk is active.
 *
 * Uses `window.Clerk.session.getToken()` — the official Clerk pattern for
 * obtaining tokens outside of React hooks / components.
 * Returns null in SSR, when Clerk is not configured, or when no session exists.
 */
async function getClerkToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    type ClerkGlobal = {
      session?: { getToken: () => Promise<string | null> } | null;
    };
    const clerk = (window as typeof window & { Clerk?: ClerkGlobal }).Clerk;
    return (await clerk?.session?.getToken()) ?? null;
  } catch {
    return null;
  }
}

/**
 * @deprecated No longer backed by localStorage since Clerk manages sessions.
 * Retained as a no-op so callers that were wired to the old JWT flow (e.g.
 * LoginForm) compile without changes.
 */
export function getStoredToken(): string | null {
  return null;
}

/** @deprecated No-op. Tokens are managed by Clerk; nothing to persist. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setStoredToken(_token: string | null): void {
  // intentional no-op
}

// ------------------------------------------------------------------ //
// Internal: attach auth headers
// ------------------------------------------------------------------ //

async function buildAuthHeaders(extra?: HeadersInit): Promise<Headers> {
  const headers = new Headers(extra);
  const token = await getClerkToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else if (!IS_CLERK_CONFIGURED) {
    // DEV ONLY — Clerk is not configured; impersonate via email header
    headers.set('x-dev-user-email', DEV_USER_EMAIL);
  }
  return headers;
}

// ------------------------------------------------------------------ //
// Public fetch helpers
// ------------------------------------------------------------------ //

interface RequestOptions extends RequestInit {
  /** Explicit override token — rarely used; prefer the automatic Clerk token. */
  token?: string;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers = await buildAuthHeaders(fetchOptions.headers);
  headers.set('Content-Type', 'application/json');

  // Allow explicit token override (used in edge-case tests / server-actions)
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
  const headers = await buildAuthHeaders();

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
 */
export async function apiDownload(path: string, fallbackFileName: string): Promise<void> {
  const headers = await buildAuthHeaders();

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
