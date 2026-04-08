/**
 * Document, Folder, and Tag API helpers.
 * All calls go through apiFetch which handles auth headers centrally.
 */
import { apiFetch } from './api';
import type {
  DocumentDetail,
  DocumentListItem,
  FolderListItem,
  Tag,
} from '@/types';

// ------------------------------------------------------------------ //
// Folders
// ------------------------------------------------------------------ //

export function fetchFolders(workspaceId: string): Promise<FolderListItem[]> {
  return apiFetch<FolderListItem[]>(
    `/api/v1/folders?workspaceId=${encodeURIComponent(workspaceId)}`,
  );
}

export function fetchFolder(id: string): Promise<FolderListItem> {
  return apiFetch<FolderListItem>(`/api/v1/folders/${id}`);
}

export function createFolder(params: {
  workspaceId: string;
  name: string;
  parentFolderId?: string;
}): Promise<FolderListItem> {
  return apiFetch<FolderListItem>('/api/v1/folders', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ------------------------------------------------------------------ //
// Documents
// ------------------------------------------------------------------ //

export interface FetchDocumentsParams {
  workspaceId: string;
  folderId?: string;
  status?: string;
  ownerUserId?: string;
}

export function fetchDocuments(params: FetchDocumentsParams): Promise<DocumentListItem[]> {
  const qs = new URLSearchParams({ workspaceId: params.workspaceId });
  if (params.folderId) qs.set('folderId', params.folderId);
  if (params.status) qs.set('status', params.status);
  if (params.ownerUserId) qs.set('ownerUserId', params.ownerUserId);
  return apiFetch<DocumentListItem[]>(`/api/v1/documents?${qs.toString()}`);
}

export function fetchDocument(id: string): Promise<DocumentDetail> {
  return apiFetch<DocumentDetail>(`/api/v1/documents/${id}`);
}

// ------------------------------------------------------------------ //
// Tags
// ------------------------------------------------------------------ //

export function fetchTags(workspaceId: string): Promise<Tag[]> {
  return apiFetch<Tag[]>(
    `/api/v1/tags?workspaceId=${encodeURIComponent(workspaceId)}`,
  );
}
