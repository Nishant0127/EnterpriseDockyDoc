'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { fetchFolders, fetchDocuments } from '@/lib/documents';
import { cn } from '@/lib/utils';
import type { DocumentListItem, DocumentStatus, FolderListItem } from '@/types';

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

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {activeWorkspace.workspaceName} &middot; {documents.length} document
            {documents.length !== 1 ? 's' : ''}
          </p>
        </div>
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
            {loading ? (
              <TableSkeleton />
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <span className="text-4xl mb-3">📂</span>
                <p className="text-sm">No documents found</p>
                {selectedFolderId && (
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId(null)}
                    className="mt-2 text-xs text-brand-600 hover:underline"
                  >
                    Clear folder filter
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
                  {documents.map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
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

function DocumentRow({ doc }: { doc: DocumentListItem }) {
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
