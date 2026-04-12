'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { fetchFolders, fetchDocuments, uploadDocument, searchDocuments, createFolder, renameFolder, deleteFolder, deleteDocument, updateDocument } from '@/lib/documents';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { DocumentListItem, DocumentStatus, FolderListItem, SearchResult } from '@/types';

interface PendingConfirm {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
}

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

function buildBreadcrumb(folderId: string | null, folders: FolderListItem[]): FolderListItem[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  const crumbs: FolderListItem[] = [];
  let current = byId.get(folderId);
  while (current) {
    crumbs.unshift(current);
    current = current.parentFolderId ? byId.get(current.parentFolderId) : undefined;
  }
  return crumbs;
}

function Breadcrumb({
  crumbs,
  onNavigate,
}: {
  crumbs: FolderListItem[];
  onNavigate: (id: string | null) => void;
}) {
  return (
    <nav className="flex items-center gap-1 text-xs text-gray-500 mb-3 flex-wrap">
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className="hover:text-brand-600 transition-colors"
      >
        All Documents
      </button>
      {crumbs.map((crumb) => (
        <span key={crumb.id} className="flex items-center gap-1">
          <span className="text-gray-300">/</span>
          <button
            type="button"
            onClick={() => onNavigate(crumb.id)}
            className="hover:text-brand-600 transition-colors"
          >
            {crumb.name}
          </button>
        </span>
      ))}
    </nav>
  );
}

// ------------------------------------------------------------------ //
// Page
// ------------------------------------------------------------------ //

export default function DocumentsPage() {
  const { activeWorkspace, isLoading: userLoading } = useUser();
  const searchParams = useSearchParams();
  const toast = useToast();
  const role = activeWorkspace?.role ?? 'VIEWER';
  const canEdit = role !== 'VIEWER';

  const [folders, setFolders] = useState<FolderListItem[]>([]);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [dropFile, setDropFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState<string | undefined>(undefined);
  const [renamingFolder, setRenamingFolder] = useState<FolderListItem | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Internal document-to-folder drag state
  const [dragDocId, setDragDocId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const dragLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      fetchDocuments({ workspaceId: activeWorkspace.workspaceId, status: showTrash ? 'DELETED' : undefined }),
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

  // Refetch documents when folder selection or trash view changes
  useEffect(() => {
    if (!activeWorkspace || loading) return;

    fetchDocuments({
      workspaceId: activeWorkspace.workspaceId,
      folderId: showTrash ? undefined : (selectedFolderId ?? undefined),
      status: showTrash ? 'DELETED' : undefined,
    })
      .then(setDocuments)
      .catch(() => {}); // silent on filter change errors
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolderId, showTrash]);

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

  // Open upload modal automatically when arriving via ?upload=1 (e.g. dashboard Quick Action)
  // Also restore trash/folder context when returning from document detail (?view=trash, ?folder=ID)
  useEffect(() => {
    if (loading) return;
    if (searchParams.get('upload') === '1' && canEdit) {
      setShowUpload(true);
    }
    if (searchParams.get('view') === 'trash') {
      setShowTrash(true);
      setSelectedFolderId(null);
    } else if (searchParams.get('folder')) {
      setShowTrash(false);
      setSelectedFolderId(searchParams.get('folder'));
    }
  // Only run once after initial load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Drag-and-drop handlers
  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    // Only show file-upload overlay for OS file drops, not internal document moves
    if (!e.dataTransfer.types.includes('Files')) return;
    if (!canEdit) return;
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    // Only clear when leaving the container entirely (not when moving between children)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (!canEdit) return;
    const file = e.dataTransfer.files[0];
    if (file) {
      setDropFile(file);
      setShowUpload(true);
    }
    // Clean up internal doc drag state if dropped on table area (not a folder)
    setDragDocId(null);
    setDragOverFolderId(null);
  }

  // Folder drag-enter/leave with debounce to prevent flash when moving between folder rows
  function handleFolderDragEnter(folderId: string) {
    if (dragLeaveTimer.current) clearTimeout(dragLeaveTimer.current);
    setDragOverFolderId(folderId);
  }

  function handleFolderDragLeave() {
    dragLeaveTimer.current = setTimeout(() => setDragOverFolderId(null), 60);
  }

  async function handleMoveDoc(docId: string, targetFolderId: string | null) {
    // Find current folder to avoid no-op moves
    const doc = documents.find((d) => d.id === docId);
    const currentFolderId = (doc as DocumentListItem | undefined)?.folder?.id ?? null;
    if (currentFolderId === targetFolderId) {
      setDragDocId(null);
      setDragOverFolderId(null);
      return;
    }
    try {
      await updateDocument(docId, { folderId: targetFolderId });
      setDragDocId(null);
      setDragOverFolderId(null);
      refreshDocuments();
      refreshFolders();
      const folder = folders.find((f) => f.id === targetFolderId);
      toast.success(folder ? `Moved to "${folder.name}".` : 'Removed from folder.');
    } catch (err) {
      setDragDocId(null);
      setDragOverFolderId(null);
      toast.error(err instanceof Error ? err.message : 'Move failed.');
    }
  }

  function refreshDocuments() {
    if (!activeWorkspace) return;
    fetchDocuments({
      workspaceId: activeWorkspace.workspaceId,
      folderId: showTrash ? undefined : (selectedFolderId ?? undefined),
      status: showTrash ? 'DELETED' : undefined,
    })
      .then(setDocuments)
      .catch(() => {});
  }

  function refreshFolders() {
    if (!activeWorkspace) return;
    fetchFolders(activeWorkspace.workspaceId).then(setFolders).catch(() => {});
  }

  function handleSelectFolder(id: string | null) {
    setShowTrash(false);
    setSelectedFolderId(id);
  }

  function handleSelectTrash() {
    setShowTrash(true);
    setSelectedFolderId(null);
  }

  async function handleRestoreDoc(doc: DocumentListItem) {
    try {
      await updateDocument(doc.id, { status: 'ACTIVE' });
      refreshDocuments();
      toast.success(`"${doc.name}" restored.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Restore failed.');
    }
  }

  function handleDeleteFolder(folder: FolderListItem) {
    setPendingConfirm({
      title: 'Delete folder',
      body: `"${folder.name}" must be empty to delete. Documents inside must be moved or deleted first.`,
      confirmLabel: 'Delete Folder',
      danger: true,
      onConfirm: async () => {
        await deleteFolder(folder.id);
        if (selectedFolderId === folder.id) setSelectedFolderId(null);
        refreshFolders();
        toast.success(`Folder "${folder.name}" deleted.`);
      },
    });
  }

  function handleDeleteDoc(doc: DocumentListItem) {
    setPendingConfirm({
      title: 'Delete document',
      body: `"${doc.name}" will be soft-deleted. You can restore it from the document detail page.`,
      confirmLabel: 'Delete Document',
      danger: true,
      onConfirm: async () => {
        setDeletingDocId(doc.id);
        try {
          await deleteDocument(doc.id);
          refreshDocuments();
          toast.success(`"${doc.name}" deleted.`);
        } finally {
          setDeletingDocId(null);
        }
      },
    });
  }

  async function executeConfirm() {
    if (!pendingConfirm) return;
    setConfirmLoading(true);
    try {
      await pendingConfirm.onConfirm();
      setPendingConfirm(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed.');
    } finally {
      setConfirmLoading(false);
    }
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
          <h1 className="page-title">
            {showTrash ? 'Trash' : 'Documents'}
          </h1>
          <p className="page-subtitle">
            {activeWorkspace.workspaceName} &middot;{' '}
            {isSearching
              ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchQuery}"`
              : `${documents.length} document${documents.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {!showTrash && canEdit && (
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 active:scale-[0.97] transition-all duration-150"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Upload Document
          </button>
        )}
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
            <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Folders
              </p>
              {canEdit && (
                <button
                  onClick={() => { setNewFolderParentId(undefined); setShowNewFolder(true); }}
                  title="New folder"
                  className="text-gray-400 hover:text-brand-600 transition-colors"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
            <nav className="p-1.5 space-y-0.5">
              {/* All documents — also accepts doc drops to remove from folder */}
              <FolderRow
                label="All documents"
                count={!showTrash ? documents.length : undefined}
                active={selectedFolderId === null && !showTrash}
                onClick={() => handleSelectFolder(null)}
                icon="🗂"
                dragHighlight={dragOverFolderId === '__root__' && dragDocId !== null}
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes('application/dockydoc-docid')) return;
                  e.preventDefault();
                  handleFolderDragEnter('__root__');
                }}
                onDragLeave={handleFolderDragLeave}
                onDrop={(e) => {
                  e.preventDefault();
                  const docId = e.dataTransfer.getData('application/dockydoc-docid');
                  if (docId) void handleMoveDoc(docId, null);
                  else { setDragDocId(null); setDragOverFolderId(null); }
                }}
              />
              {/* Folder tree */}
              {loading ? (
                <div className="px-3 py-2 text-xs text-gray-400">Loading…</div>
              ) : roots.length === 0 ? null : (
                roots.map((folder) => (
                  <FolderTreeNode
                    key={folder.id}
                    folder={folder}
                    childMap={childMap}
                    selectedId={showTrash ? null : selectedFolderId}
                    onSelect={handleSelectFolder}
                    onRename={setRenamingFolder}
                    onDelete={handleDeleteFolder}
                    onCreateSubfolder={(parentId) => { setNewFolderParentId(parentId); setShowNewFolder(true); }}
                    depth={0}
                    dragOverFolderId={dragOverFolderId}
                    onDropDoc={handleMoveDoc}
                    onDragFolderEnter={handleFolderDragEnter}
                    onDragFolderLeave={handleFolderDragLeave}
                  />
                ))
              )}
              {/* Divider + Trash */}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <FolderRow
                  label="Trash"
                  count={showTrash ? documents.length : undefined}
                  active={showTrash}
                  onClick={handleSelectTrash}
                  icon="🗑"
                />
              </div>
            </nav>
          </div>
        </aside>

        {/* --------------------------------------------------------- */}
        {/* Document table                                             */}
        {/* --------------------------------------------------------- */}
        <div
          className="flex-1 min-w-0 relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag-over overlay */}
          {dragOver && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-400 bg-brand-50/80 pointer-events-none">
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" className="text-brand-500 mb-2">
                <path d="M4 16.004V17a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M16 8l-4-4-4 4M12 4v12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm font-semibold text-brand-600">Drop file to upload</p>
            </div>
          )}
          {selectedFolderId !== null && !showTrash && !isSearching && (
            <Breadcrumb
              crumbs={buildBreadcrumb(selectedFolderId, folders)}
              onNavigate={handleSelectFolder}
            />
          )}
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
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayDocs.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc as DocumentListItem}
                      snippet={(doc as SearchResult).snippet}
                      deleting={deletingDocId === doc.id}
                      canEdit={canEdit}
                      onDelete={() => handleDeleteDoc(doc as DocumentListItem)}
                      onRestore={showTrash ? () => { void handleRestoreDoc(doc as DocumentListItem); } : undefined}
                      dragging={dragDocId === doc.id}
                      onDragStart={!showTrash && !isSearching && canEdit ? setDragDocId : undefined}
                      onDragEnd={!showTrash && !isSearching && canEdit ? () => {
                        setDragDocId(null);
                        setDragOverFolderId(null);
                      } : undefined}
                      fromParam={
                        showTrash
                          ? 'trash'
                          : selectedFolderId
                          ? `folder:${selectedFolderId}`
                          : 'all'
                      }
                    />
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
          initialFile={dropFile ?? undefined}
          onClose={() => { setShowUpload(false); setDropFile(null); }}
          onSuccess={() => {
            setShowUpload(false);
            setDropFile(null);
            refreshDocuments();
            toast.success('Document uploaded successfully.');
          }}
        />
      )}

      {/* New folder modal */}
      {showNewFolder && activeWorkspace && (
        <FolderModal
          workspaceId={activeWorkspace.workspaceId}
          folders={folders}
          defaultParentId={newFolderParentId}
          onClose={() => setShowNewFolder(false)}
          onSaved={() => {
            setShowNewFolder(false);
            refreshFolders();
            toast.success('Folder created.');
          }}
        />
      )}

      {/* Rename folder modal */}
      {renamingFolder && (
        <FolderModal
          workspaceId={renamingFolder.workspaceId}
          folder={renamingFolder}
          onClose={() => setRenamingFolder(null)}
          onSaved={() => {
            setRenamingFolder(null);
            refreshFolders();
            toast.success('Folder renamed.');
          }}
        />
      )}

      {/* Confirm modal for destructive actions */}
      {pendingConfirm && (
        <ConfirmModal
          title={pendingConfirm.title}
          body={pendingConfirm.body}
          confirmLabel={pendingConfirm.confirmLabel}
          danger={pendingConfirm.danger}
          loading={confirmLoading}
          onConfirm={executeConfirm}
          onClose={() => { if (!confirmLoading) setPendingConfirm(null); }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Folder modal (create or rename)
// ------------------------------------------------------------------ //

function FolderModal({
  workspaceId,
  folder,
  folders = [],
  defaultParentId,
  onClose,
  onSaved,
}: {
  workspaceId: string;
  folder?: FolderListItem;
  folders?: FolderListItem[];
  defaultParentId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(folder?.name ?? '');
  const [parentFolderId, setParentFolderId] = useState(defaultParentId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When renaming, don't show parent picker (parent doesn't change on rename)
  const isRename = !!folder;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      if (isRename) {
        await renameFolder(folder!.id, name.trim());
      } else {
        await createFolder({
          workspaceId,
          name: name.trim(),
          parentFolderId: parentFolderId || undefined,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  // Exclude self (and descendants) from parent options — for rename this is moot since we hide it
  const parentOptions = folders.filter((f) => !isRename || f.id !== folder?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 animate-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            {isRename ? 'Rename Folder' : 'New Folder'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Folder name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Contracts"
            />
          </div>

          {!isRename && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Parent folder <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={parentFolderId}
                onChange={(e) => setParentFolderId(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="">— Root level —</option>
                {parentOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.parentFolderId ? '  └ ' : ''}{f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">
              {saving ? 'Saving…' : isRename ? 'Rename' : 'Create'}
            </button>
          </div>
        </form>
      </div>
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
  initialFile,
  onClose,
  onSuccess,
}: {
  workspaceId: string;
  folders: FolderListItem[];
  defaultFolderId?: string;
  initialFile?: File;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [name, setName] = useState(initialFile ? initialFile.name.replace(/\.[^.]+$/, '') : '');
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in">
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
  onDragOver,
  onDragLeave,
  onDrop,
  dragHighlight = false,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  icon?: string;
  indent?: number;
  onDragOver?: (e: React.DragEvent<HTMLButtonElement>) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent<HTMLButtonElement>) => void;
  dragHighlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors text-sm',
        dragHighlight
          ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-400 ring-inset'
          : active
          ? 'bg-brand-50 text-brand-700 font-medium'
          : 'text-gray-600 hover:bg-gray-100',
      )}
      style={{ paddingLeft: `${12 + indent * 14}px` }}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {dragHighlight && (
        <span className="text-[10px] font-semibold text-brand-500">Drop</span>
      )}
      {!dragHighlight && count !== undefined && (
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
  onRename,
  onDelete,
  onCreateSubfolder,
  depth,
  dragOverFolderId,
  onDropDoc,
  onDragFolderEnter,
  onDragFolderLeave,
}: {
  folder: FolderListItem;
  childMap: Map<string, FolderListItem[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRename: (f: FolderListItem) => void;
  onDelete: (f: FolderListItem) => void;
  onCreateSubfolder: (parentId: string) => void;
  depth: number;
  dragOverFolderId: string | null;
  onDropDoc: (docId: string, folderId: string) => void;
  onDragFolderEnter: (folderId: string) => void;
  onDragFolderLeave: () => void;
}) {
  const children = childMap.get(folder.id) ?? [];
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <div
        className="relative group"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <FolderRow
          label={folder.name}
          count={folder.documentCount || undefined}
          active={selectedId === folder.id}
          onClick={() => onSelect(folder.id)}
          indent={depth}
          dragHighlight={dragOverFolderId === folder.id}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes('application/dockydoc-docid')) return;
            e.preventDefault();
            onDragFolderEnter(folder.id);
          }}
          onDragLeave={onDragFolderLeave}
          onDrop={(e) => {
            e.preventDefault();
            const docId = e.dataTransfer.getData('application/dockydoc-docid');
            if (docId) onDropDoc(docId, folder.id);
          }}
        />
        {hovered && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-white rounded shadow-sm border border-gray-100 px-1 py-0.5 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); onRename(folder); }}
              title="Rename"
              className="p-0.5 text-gray-400 hover:text-brand-600 transition-colors"
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onCreateSubfolder(folder.id); }}
              title="New subfolder"
              className="p-0.5 text-gray-400 hover:text-brand-600 transition-colors"
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <path d="M12 11v6M9 14h6" strokeLinecap="round" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(folder); }}
              title="Delete"
              className="p-0.5 text-gray-400 hover:text-red-600 transition-colors"
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        )}
      </div>
      {children.map((child) => (
        <FolderTreeNode
          key={child.id}
          folder={child}
          childMap={childMap}
          selectedId={selectedId}
          onSelect={onSelect}
          onRename={onRename}
          onDelete={onDelete}
          onCreateSubfolder={onCreateSubfolder}
          depth={depth + 1}
          dragOverFolderId={dragOverFolderId}
          onDropDoc={onDropDoc}
          onDragFolderEnter={onDragFolderEnter}
          onDragFolderLeave={onDragFolderLeave}
        />
      ))}
    </>
  );
}

function expiryBadge(expiryDate: string | null | undefined): {
  label: string;
  class: string;
} | null {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysLeft = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: 'Expired', class: 'bg-red-100 text-red-700' };
  if (daysLeft <= 30) return { label: `Exp. ${daysLeft}d`, class: 'bg-orange-100 text-orange-700' };
  return null;
}

function DocumentRow({
  doc,
  snippet,
  deleting,
  canEdit,
  onDelete,
  onRestore,
  dragging,
  onDragStart,
  onDragEnd,
  fromParam,
}: {
  doc: DocumentListItem;
  snippet?: string;
  deleting?: boolean;
  canEdit?: boolean;
  onDelete: () => void;
  onRestore?: () => void;
  dragging?: boolean;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  fromParam?: string;
}) {
  const badge = STATUS_BADGE[doc.status];
  const expiry = expiryBadge(doc.expiryDate);
  const date = new Date(doc.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <tr
      className={cn('hover:bg-gray-50 transition-all duration-100 group cursor-default', dragging && 'opacity-40 bg-gray-50')}
      draggable={!!onDragStart}
      onDragStart={onDragStart ? (e) => {
        e.dataTransfer.setData('application/dockydoc-docid', doc.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(doc.id);
      } : undefined}
      onDragEnd={onDragEnd}
    >
      {/* Name */}
      <td className="px-4 py-3">
        <Link
          href={`/documents/${doc.id}${fromParam ? `?from=${fromParam}` : ''}`}
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
        <div className="flex flex-wrap items-center gap-1">
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              badge.class,
            )}
          >
            {badge.label}
          </span>
          {expiry && (
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                expiry.class,
              )}
            >
              {expiry.label}
            </span>
          )}
        </div>
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

      {/* Row actions */}
      <td className="px-2 py-3 w-16">
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          {onRestore && (
            <button
              onClick={(e) => { e.stopPropagation(); onRestore(); }}
              title="Restore document"
              className="p-1.5 rounded text-gray-300 hover:text-green-600 hover:bg-green-50 transition-colors"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M1 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.51 15a9 9 0 1 0 .49-5.1L1 10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {canEdit && doc.status !== 'DELETED' && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              disabled={deleting}
              title="Delete document"
              className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <svg className="animate-spin" width="13" height="13" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              )}
            </button>
          )}
        </div>
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
