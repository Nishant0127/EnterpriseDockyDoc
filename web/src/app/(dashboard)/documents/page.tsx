'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { fetchFolders, fetchDocuments, uploadDocument, searchDocuments } from '@/lib/documents';
import { cn } from '@/lib/utils';
import type { DocumentListItem, DocumentStatus, FolderListItem, SearchResult } from '@/types';

// ------------------------------------------------------------------ //
// Status helpers
// ------------------------------------------------------------------ //

const STATUS_BADGE: Record<DocumentStatus, { label: string; class: string }> = {
  ACTIVE: { label: 'Active', class: 'bg-green-100 text-green-700' },
  ARCHIVED: { label: 'Archived', class: 'bg-yellow-100 text-yellow-700' },
  DELETED: { label: 'Deleted', class: 'bg-red-100 text-red-700' },
};

const FILE_ICON: Record<string, string> = {
  pdf: '📄',
  docx: '📝',
  doc: '📝',
  xlsx: '📊',
  xls: '📊',
  pptx: '📊',
  png: '🖼',
  jpg: '🖼',
  jpeg: '🖼',
  webp: '🖼',
  gif: '🖼',
};

function fileIcon(fileType: string) {
  return FILE_ICON[fileType.toLowerCase()] ?? '📁';
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

// ------------------------------------------------------------------ //
// Folder sidebar helpers
// ------------------------------------------------------------------ //

function buildTree(folders: FolderListItem[]) {
  const roots = folders.filter((f) => !f.parentFolderId);
  const childMap = new Map<string, FolderListItem[]>();
  for (const f of folders) {
    if (f.parentFolderId) {
      if (!childMap.has(f.parentFolderId)) childMap.set(f.parentFolderId, []);
      childMap.get(f.parentFolderId)!.push(f);
    }
  }
  return { roots, childMap };
}

// ------------------------------------------------------------------ //
// Page
// ------------------------------------------------------------------ //

export default function DocumentsPage() {
  const { activeWorkspace, isLoading: userLoading } = useUser();

  const [folders, setFolders] = useState<FolderListItem[]>([]);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch folders + documents whenever the active workspace changes
  useEffect(() => {
    if (!activeWorkspace || userLoading) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedFolderId(null);

    Promise.all([
      fetchFolders(activeWorkspace.workspaceId),
      fetchDocuments({ workspaceId: activeWorkspace.workspaceId }),
    ])
      .then(([f, d]) => {
        if (cancelled) return;
        setFolders(f);
        setDocuments(d);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load documents. Is the API running?');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeWorkspace?.workspaceId, userLoading]);

  // Refetch documents when folder selection changes
  useEffect(() => {
    if (!activeWorkspace || loading) return;

    fetchDocuments({
      workspaceId: activeWorkspace.workspaceId,
      folderId: selectedFolderId ?? undefined,
    })
      .then(setDocuments)
      .catch(() => {}); // silent on filter change errors
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolderId]);

  // Debounced search — fires 350 ms after the user stops typing
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!searchQuery.trim() || !activeWorkspace) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimerRef.current = setTimeout(() => {
      searchDocuments({
        workspaceId: activeWorkspace.workspaceId,
        q: searchQuery.trim(),
      })
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 350);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, activeWorkspace?.workspaceId]);

  function refreshDocuments() {
    if (!activeWorkspace) return;
    fetchDocuments({
      workspaceId: activeWorkspace.workspaceId,
      folderId: selectedFolderId ?? undefined,
    })
      .then(setDocuments)
      .catch(() => {});
  }

  if (userLoading || (!activeWorkspace && !error)) {
    return <PageSkeleton />;
  }

  if (!activeWorkspace) {
    return (
      <div className="text-sm text-gray-500 p-4">
        No active workspace selected.
      </div>
    );
  }

  const { roots, childMap } = buildTree(folders);
  const isSearching = searchQuery.trim().length > 0;
  const displayDocs = isSearching ? searchResults : documents;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {activeWorkspace.workspaceName} &middot;{' '}
            {isSearching
              ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchQuery}"`
              : `${documents.length} document${documents.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Upload Document
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, tags, content…"
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
        />
        {searching && (
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" width="14" height="14" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {!searching && searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-5">
        {/* --------------------------------------------------------- */}
        {/* Folder sidebar                                             */}
        {/* --------------------------------------------------------- */}
        <aside className="w-52 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Folders
              </p>
            </div>
            <nav className="p-1.5 space-y-0.5">
              {/* All documents */}
              <FolderRow
                label="All documents"
                count={documents.length}
                active={selectedFolderId === null}
                onClick={() => setSelectedFolderId(null)}
                icon="🗂"
              />
              {/* Folder tree */}
              {loading ? (
                <div className="px-3 py-2 text-xs text-gray-400">Loading…</div>
              ) : roots.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-400">No folders yet</div>
              ) : (
                roots.map((folder) => (
                  <FolderTreeNode
                    key={folder.id}
                    folder={folder}
                    childMap={childMap}
                    selectedId={selectedFolderId}
                    onSelect={setSelectedFolderId}
                    depth={0}
                  />
                ))
              )}
            </nav>
          </div>
        </aside>

        {/* --------------------------------------------------------- */}
        {/* Document table                                             */}
        {/* --------------------------------------------------------- */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading || searching ? (
              <TableSkeleton />
            ) : displayDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <span className="text-4xl mb-3">{isSearching ? '🔍' : '📂'}</span>
                <p className="text-sm">
                  {isSearching
                    ? `No results for "${searchQuery}"`
                    : 'No documents found'}
                </p>
                {isSearching && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-xs text-brand-600 hover:underline"
                  >
                    Clear search
                  </button>
                )}
                {!isSearching && selectedFolderId && (
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId(null)}
                    className="mt-2 text-xs text-brand-600 hover:underline"
                  >
                    Clear folder filter
                  </button>
                )}
                {!isSearching && (
                  <button
                    type="button"
                    onClick={() => setShowUpload(true)}
                    className="mt-3 text-xs text-brand-600 hover:underline"
                  >
                    Upload your first document →
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                      Folder
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                      Owner
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                      Versions
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">
                      Tags
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayDocs.map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} snippet={(doc as SearchResult).snippet} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Upload modal */}
      {showUpload && activeWorkspace && (
        <UploadModal
          workspaceId={activeWorkspace.workspaceId}
          folders={folders}
          defaultFolderId={selectedFolderId ?? undefined}
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            refreshDocuments();
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Upload modal
// ------------------------------------------------------------------ //

function UploadModal({
  workspaceId,
  folders,
  defaultFolderId,
  onClose,
  onSuccess,
}: {
  workspaceId: string;
  folders: FolderListItem[];
  defaultFolderId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState(defaultFolderId ?? '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !name) {
      // Auto-fill name from filename (strip extension)
      setName(f.name.replace(/\.[^.]+$/, ''));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Please select a file.'); return; }
    if (!name.trim()) { setError('Document name is required.'); return; }

    setUploading(true);
    setError(null);

    try {
      await uploadDocument({
        workspaceId,
        name: name.trim(),
        file,
        description: description.trim() || undefined,
        folderId: folderId || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Upload Document</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* File picker */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              File <span className="text-red-500">*</span>
            </label>
            <div
              className={cn(
                'relative border-2 border-dashed rounded-lg px-4 py-5 text-center cursor-pointer transition-colors',
                file ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:border-gray-300',
              )}
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">{fileIcon(file.name.split('.').pop() ?? '')}</span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-800 truncate max-w-xs">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto mb-2 text-gray-300" width="28" height="28" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path d="M4 16.004V17a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M16 8l-4-4-4 4M12 4v12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-sm text-gray-500">Click to choose a file</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, images, text — up to 50 MB</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                className="sr-only"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv,.zip,.json"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Document name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 Budget Report"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description…"
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Folder */}
          {folders.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Folder
              </label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
              >
                <option value="">No folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading…
                </>
              ) : (
                'Upload'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Sub-components
// ------------------------------------------------------------------ //

function FolderRow({
  label,
  count,
  active,
  onClick,
  icon = '📁',
  indent = 0,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  icon?: string;
  indent?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors text-sm',
        active
          ? 'bg-brand-50 text-brand-700 font-medium'
          : 'text-gray-600 hover:bg-gray-100',
      )}
      style={{ paddingLeft: `${12 + indent * 14}px` }}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className="text-xs text-gray-400 tabular-nums">{count}</span>
      )}
    </button>
  );
}

function FolderTreeNode({
  folder,
  childMap,
  selectedId,
  onSelect,
  depth,
}: {
  folder: FolderListItem;
  childMap: Map<string, FolderListItem[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const children = childMap.get(folder.id) ?? [];
  return (
    <>
      <FolderRow
        label={folder.name}
        count={folder.documentCount || undefined}
        active={selectedId === folder.id}
        onClick={() => onSelect(folder.id)}
        indent={depth}
      />
      {children.map((child) => (
        <FolderTreeNode
          key={child.id}
          folder={child}
          childMap={childMap}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

function DocumentRow({ doc, snippet }: { doc: DocumentListItem; snippet?: string }) {
  const badge = STATUS_BADGE[doc.status];
  const date = new Date(doc.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Name */}
      <td className="px-4 py-3">
        <Link
          href={`/documents/${doc.id}`}
          className="flex items-center gap-2.5 group"
        >
          <span className="text-lg leading-none">{fileIcon(doc.fileType)}</span>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 group-hover:text-brand-600 transition-colors truncate">
              {doc.name}
            </p>
            <p className="text-xs text-gray-400 truncate">{doc.fileName}</p>
            {snippet && (
              <p className="text-xs text-gray-500 mt-0.5 italic truncate max-w-xs">
                {snippet}
              </p>
            )}
          </div>
        </Link>
      </td>

      {/* Folder */}
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-gray-500 text-xs">
          {doc.folder ? doc.folder.name : <span className="text-gray-300">—</span>}
        </span>
      </td>

      {/* Owner */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-semibold text-brand-700 flex-shrink-0">
            {initials(doc.owner.firstName, doc.owner.lastName)}
          </div>
          <span className="text-xs text-gray-600 truncate">
            {doc.owner.firstName} {doc.owner.lastName}
          </span>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            badge.class,
          )}
        >
          {badge.label}
        </span>
      </td>

      {/* Versions */}
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="text-xs text-gray-500 tabular-nums">
          v{doc.currentVersionNumber}
          {doc.versionCount > 1 && (
            <span className="text-gray-400"> ({doc.versionCount})</span>
          )}
        </span>
      </td>

      {/* Tags */}
      <td className="px-4 py-3 hidden xl:table-cell">
        <div className="flex flex-wrap gap-1">
          {doc.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={
                tag.color
                  ? { backgroundColor: `${tag.color}18`, color: tag.color }
                  : { backgroundColor: '#f3f4f6', color: '#6b7280' }
              }
            >
              {tag.name}
            </span>
          ))}
          {doc.tags.length > 3 && (
            <span className="text-[10px] text-gray-400">+{doc.tags.length - 3}</span>
          )}
        </div>
      </td>

      {/* Created */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-xs text-gray-400 whitespace-nowrap">{date}</span>
      </td>
    </tr>
  );
}

// ------------------------------------------------------------------ //
// Skeletons
// ------------------------------------------------------------------ //

function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-56 bg-gray-100 rounded mb-6" />
      <div className="flex gap-5">
        <div className="w-52 h-64 bg-gray-100 rounded-xl" />
        <div className="flex-1 h-64 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="h-8 w-8 bg-gray-100 rounded" />
          <div className="flex-1 h-8 bg-gray-100 rounded" />
          <div className="w-20 h-8 bg-gray-100 rounded" />
          <div className="w-16 h-8 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}
