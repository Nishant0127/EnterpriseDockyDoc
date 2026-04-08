/**
 * Document, Folder, and Tag API helpers.
 * All calls go through apiFetch / apiUpload / apiDownload which handle auth headers centrally.
 */
import { apiFetch, apiUpload, apiDownload } from './api';
import type {
  DocumentDetail,
  DocumentListItem,
  FolderListItem,
  SearchResult,
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
// Documents — list & detail
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
// Documents — upload
// ------------------------------------------------------------------ //

export interface UploadDocumentParams {
  workspaceId: string;
  name: string;
  file: File;
  description?: string;
  folderId?: string;
  tags?: string[];   // tag IDs
  metadata?: { key: string; value: string }[];
}

/**
 * Upload a new document with file binary.
 * Sends multipart/form-data to POST /api/v1/documents/upload.
 */
export function uploadDocument(params: UploadDocumentParams): Promise<DocumentDetail> {
  const form = new FormData();
  form.append('file', params.file);
  form.append('workspaceId', params.workspaceId);
  form.append('name', params.name);
  if (params.description) form.append('description', params.description);
  if (params.folderId) form.append('folderId', params.folderId);
  if (params.tags?.length) form.append('tags', params.tags.join(','));
  if (params.metadata?.length) form.append('metadata', JSON.stringify(params.metadata));

  return apiUpload<DocumentDetail>('/api/v1/documents/upload', form);
}

/**
 * Upload a new version of an existing document.
 * Sends multipart/form-data to POST /api/v1/documents/:id/versions.
 */
export function uploadDocumentVersion(
  documentId: string,
  file: File,
  notes?: string,
): Promise<DocumentDetail> {
  const form = new FormData();
  form.append('file', file);
  if (notes) form.append('notes', notes);

  return apiUpload<DocumentDetail>(`/api/v1/documents/${documentId}/versions`, form);
}

// ------------------------------------------------------------------ //
// Documents — download
// ------------------------------------------------------------------ //

/**
 * Download the latest version of a document.
 * Triggers a browser file download.
 */
export function downloadDocument(documentId: string, fileName: string): Promise<void> {
  return apiDownload(`/api/v1/documents/${documentId}/download`, fileName);
}

/**
 * Download a specific version of a document.
 * Triggers a browser file download.
 */
export function downloadDocumentVersion(
  documentId: string,
  versionNumber: number,
  fileName: string,
): Promise<void> {
  return apiDownload(
    `/api/v1/documents/${documentId}/versions/${versionNumber}/download`,
    fileName,
  );
}

// ------------------------------------------------------------------ //
// Search
// ------------------------------------------------------------------ //

export interface SearchParams {
  workspaceId: string;
  q: string;
  folderId?: string;
  status?: string;
}

export function searchDocuments(params: SearchParams): Promise<SearchResult[]> {
  const qs = new URLSearchParams({ workspaceId: params.workspaceId, q: params.q });
  if (params.folderId) qs.set('folderId', params.folderId);
  if (params.status) qs.set('status', params.status);
  return apiFetch<SearchResult[]>(`/api/v1/search?${qs.toString()}`);
}

// ------------------------------------------------------------------ //
// Tags
// ------------------------------------------------------------------ //

export function fetchTags(workspaceId: string): Promise<Tag[]> {
  return apiFetch<Tag[]>(
    `/api/v1/tags?workspaceId=${encodeURIComponent(workspaceId)}`,
  );
}
