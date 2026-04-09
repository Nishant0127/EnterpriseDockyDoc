'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchDocument, downloadDocument, downloadDocumentVersion, uploadDocumentVersion, setDocumentReminders, updateDocument, deleteDocument, shredDocument, fetchFolders, fetchTags, setDocumentTags } from '@/lib/documents';
import { fetchDocumentActivity, describeAuditLog, auditActionCategory, formatAuditAction } from '@/lib/audit';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useUser } from '@/context/UserContext';
import type { AuditLog, DocumentDetail, DocumentStatus, FolderListItem, Tag } from '@/types';
import ShareSection from './ShareSection';

// ------------------------------------------------------------------ //
// Status config
// ------------------------------------------------------------------ //

const STATUS_BADGE: Record<DocumentStatus, { label: string; dot: string; bg: string }> = {
  ACTIVE: { label: 'Active', dot: 'bg-green-500', bg: 'bg-green-50 text-green-700 border-green-200' },
  ARCHIVED: { label: 'Archived', dot: 'bg-yellow-500', bg: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  DELETED: { label: 'Deleted', dot: 'bg-red-400', bg: 'bg-red-50 text-red-700 border-red-200' },
};

function formatBytes(bytes: string): string {
  const n = parseInt(bytes, 10);
  if (n === 0) return 'Pending upload';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

// ------------------------------------------------------------------ //
// Page
// ------------------------------------------------------------------ //

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const { activeWorkspace } = useUser();
  const role = activeWorkspace?.role ?? 'VIEWER';
  const canEdit = role !== 'VIEWER';
  const canAdminOrOwner = role === 'ADMIN' || role === 'OWNER';
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null); // 'latest' | versionNumber string
  const [showVersionUpload, setShowVersionUpload] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const [restoringDoc, setRestoringDoc] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [shredding, setShredding] = useState(false);
  const [showShredConfirm, setShowShredConfirm] = useState(false);

  function reload() {
    if (!params.id) return;
    fetchDocument(params.id)
      .then(setDoc)
      .catch(() => setError('Document not found or API unavailable.'));
  }

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    fetchDocument(params.id)
      .then(setDoc)
      .catch(() => setError('Document not found or API unavailable.'))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleDelete() {
    if (!doc) return;
    setShowDeleteConfirm(false);
    setDeletingDoc(true);
    try {
      await deleteDocument(doc.id);
      toast.success(`"${doc.name}" has been deleted.`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeletingDoc(false);
    }
  }

  async function handleShred() {
    if (!doc) return;
    setShowShredConfirm(false);
    setShredding(true);
    try {
      await shredDocument(doc.id);
      toast.success(`"${doc.name}" has been permanently deleted.`);
      window.location.href = '/documents';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Shred failed.');
      setShredding(false);
    }
  }

  async function handleRestore() {
    if (!doc) return;
    setRestoringDoc(true);
    try {
      await updateDocument(doc.id, { status: 'ACTIVE' });
      toast.success(`"${doc.name}" has been restored.`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Restore failed.');
    } finally {
      setRestoringDoc(false);
    }
  }

  async function handleDownloadLatest() {
    if (!doc) return;
    setDownloading('latest');
    try {
      await downloadDocument(doc.id, doc.fileName);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloading(null);
    }
  }

  async function handleDownloadVersion(versionNumber: number) {
    if (!doc) return;
    setDownloading(String(versionNumber));
    try {
      await downloadDocumentVersion(doc.id, versionNumber, doc.fileName);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloading(null);
    }
  }

  if (loading) return <DetailSkeleton />;

  if (error || !doc) {
    return (
      <div>
        <Link href="/documents" className="text-sm text-brand-600 hover:underline mb-4 inline-block">
          ← Back to Documents
        </Link>
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
          {error ?? 'Document not found.'}
        </div>
      </div>
    );
  }

  const badge = STATUS_BADGE[doc.status];

  return (
    <div className="max-w-5xl">
      {/* Back navigation */}
      <Link
        href="/documents"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-5"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Documents
      </Link>

      {/* Document header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-gray-900 leading-tight">
            {doc.name}
          </h1>
          <p className="mt-1 text-sm text-gray-400">{doc.fileName}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border',
              badge.bg,
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', badge.dot)} />
            {badge.label}
          </span>
          {/* Download latest button */}
          <button
            type="button"
            onClick={handleDownloadLatest}
            disabled={downloading === 'latest'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {downloading === 'latest' ? (
              <svg className="animate-spin" width="12" height="12" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            Download
          </button>
          {/* Upload version button — editor+ only */}
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowVersionUpload(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M4 16.004V17a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M16 8l-4-4-4 4M12 4v12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Upload new version
            </button>
          )}
          {/* Edit button — editor+ only */}
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
          )}
          {/* Delete / Restore / Shred */}
          {doc.status === 'DELETED' ? (
            <>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={restoringDoc || shredding}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-200 text-xs font-medium text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
                >
                  {restoringDoc ? (
                    <>
                      <svg className="animate-spin" width="11" height="11" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Restoring…
                    </>
                  ) : 'Restore'}
                </button>
              )}
              {canAdminOrOwner && (
                <button
                  type="button"
                  onClick={() => setShowShredConfirm(true)}
                  disabled={shredding || restoringDoc}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                  title="Permanently delete all files and records (Admin/Owner only)"
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="10" y1="11" x2="10" y2="17" strokeLinecap="round" />
                    <line x1="14" y1="11" x2="14" y2="17" strokeLinecap="round" />
                  </svg>
                  {shredding ? 'Shredding…' : 'Shred'}
                </button>
              )}
            </>
          ) : (
            canEdit && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deletingDoc}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                {deletingDoc ? 'Deleting…' : 'Delete'}
              </button>
            )
          )}
        </div>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ---- Overview ------------------------------------------- */}
        <Section title="Overview">
          <InfoRow label="Workspace" value={doc.workspace.name} />
          <InfoRow
            label="Folder"
            value={doc.folder ? doc.folder.name : '—'}
          />
          <InfoRow
            label="Owner"
            value={
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-[9px] font-semibold text-brand-700">
                  {initials(doc.owner.firstName, doc.owner.lastName)}
                </div>
                <span>
                  {doc.owner.firstName} {doc.owner.lastName}
                </span>
              </div>
            }
          />
          <InfoRow label="File type" value={doc.fileType.toUpperCase()} />
          <InfoRow label="Version" value={`v${doc.currentVersionNumber}`} />
          <InfoRow label="Created" value={formatDate(doc.createdAt)} />
          <InfoRow label="Last updated" value={formatDate(doc.updatedAt)} />
          {doc.description && (
            <div className="pt-3 mt-1 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed">{doc.description}</p>
            </div>
          )}
        </Section>

        {/* ---- Versions ------------------------------------------- */}
        <Section title={`Versions (${doc.versionCount})`}>
          {doc.versions.length === 0 ? (
            <p className="text-sm text-gray-400">No versions yet.</p>
          ) : (
            <div className="space-y-2">
              {doc.versions.map((v) => (
                <div
                  key={v.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2.5 border',
                    v.versionNumber === doc.currentVersionNumber
                      ? 'border-brand-200 bg-brand-50'
                      : 'border-gray-100 bg-gray-50',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        'text-xs font-bold tabular-nums px-2 py-0.5 rounded',
                        v.versionNumber === doc.currentVersionNumber
                          ? 'bg-brand-600 text-white'
                          : 'bg-gray-200 text-gray-600',
                      )}
                    >
                      v{v.versionNumber}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {v.uploadedBy.firstName} {v.uploadedBy.lastName}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {formatDateTime(v.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{formatBytes(v.fileSizeBytes)}</p>
                      <p className="text-[10px] text-gray-400 truncate max-w-28">{v.mimeType}</p>
                    </div>
                    {/* Per-version download */}
                    {parseInt(v.fileSizeBytes, 10) > 0 && (
                      <button
                        type="button"
                        onClick={() => handleDownloadVersion(v.versionNumber)}
                        disabled={downloading === String(v.versionNumber)}
                        title={`Download v${v.versionNumber}`}
                        className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-50"
                      >
                        {downloading === String(v.versionNumber) ? (
                          <svg className="animate-spin" width="13" height="13" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ---- Tags ----------------------------------------------- */}
        <TagsSection
          doc={doc}
          canEdit={canEdit}
          workspaceId={doc.workspace.id}
          onSaved={reload}
        />

        {/* ---- Metadata ------------------------------------------- */}
        <Section title="Metadata">
          {doc.metadata.length === 0 ? (
            <p className="text-sm text-gray-400">No metadata entries.</p>
          ) : (
            <dl className="space-y-2">
              {doc.metadata.map((m) => (
                <div key={m.id} className="flex gap-3">
                  <dt className="w-32 flex-shrink-0 text-xs text-gray-400 font-medium pt-0.5 truncate">
                    {m.key}
                  </dt>
                  <dd className="flex-1 text-sm text-gray-700 break-all">{m.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </Section>

        {/* ---- Expiry & Reminders (full width) -------------------- */}
        <div className="lg:col-span-2">
          <ExpiryReminderSection doc={doc} onSaved={reload} />
        </div>

        {/* ---- Sharing (full width) -------------------------------- */}
        <div className="lg:col-span-2">
          <ShareSection documentId={doc.id} />
        </div>

        {/* ---- Activity (full width) ------------------------------- */}
        <div className="lg:col-span-2">
          <DocumentActivitySection documentId={doc.id} />
        </div>
      </div>

      {/* Version upload modal */}
      {showVersionUpload && (
        <VersionUploadModal
          documentId={doc.id}
          fileName={doc.fileName}
          currentVersion={doc.currentVersionNumber}
          onClose={() => setShowVersionUpload(false)}
          onSuccess={() => {
            setShowVersionUpload(false);
            reload();
            toast.success('New version uploaded.');
          }}
        />
      )}

      {/* Edit document modal */}
      {showEditModal && (
        <EditDocumentModal
          doc={doc}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            reload();
            toast.success('Document updated.');
          }}
        />
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete document"
          body={`"${doc.name}" will be soft-deleted and can be restored later.`}
          confirmLabel="Delete Document"
          danger
          loading={deletingDoc}
          onConfirm={handleDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Shred confirmation modal */}
      {showShredConfirm && (
        <ConfirmModal
          title="Permanently delete document"
          body={`This will permanently destroy "${doc.name}" and all its file versions. This action cannot be undone. Only Admins and Owners can shred documents.`}
          confirmLabel="Shred Permanently"
          danger
          loading={shredding}
          onConfirm={handleShred}
          onClose={() => { if (!shredding) setShowShredConfirm(false); }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Expiry & Reminder section
// ------------------------------------------------------------------ //

// ------------------------------------------------------------------ //
// Tags section
// ------------------------------------------------------------------ //

function TagsSection({
  doc,
  canEdit,
  workspaceId,
  onSaved,
}: {
  doc: DocumentDetail;
  canEdit: boolean;
  workspaceId: string;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<string[]>(doc.tags.map((t) => t.id));
  const [saving, setSaving] = useState(false);

  function startEdit() {
    fetchTags(workspaceId)
      .then(setAllTags)
      .catch(() => {});
    setSelected(doc.tags.map((t) => t.id));
    setEditing(true);
  }

  function toggleTag(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await setDocumentTags(doc.id, selected);
      toast.success('Tags updated.');
      setEditing(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update tags.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Tags">
      {!editing ? (
        <div className="flex flex-wrap items-center gap-2">
          {doc.tags.length === 0 ? (
            <span className="text-sm text-gray-400">No tags assigned.</span>
          ) : (
            doc.tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={
                  tag.color
                    ? { backgroundColor: `${tag.color}20`, color: tag.color }
                    : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                }
              >
                {tag.color && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                )}
                {tag.name}
              </span>
            ))
          )}
          {canEdit && (
            <button
              type="button"
              onClick={startEdit}
              className="text-xs text-brand-600 hover:underline ml-1"
            >
              Edit tags
            </button>
          )}
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {allTags.length === 0 ? (
              <p className="text-xs text-gray-400">No tags in workspace. Create tags in Settings.</p>
            ) : (
              allTags.map((tag) => {
                const isOn = selected.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border-2 transition-all',
                      isOn ? 'border-transparent' : 'border-dashed border-gray-300 opacity-50',
                    )}
                    style={
                      tag.color
                        ? { backgroundColor: isOn ? `${tag.color}20` : 'transparent', color: isOn ? tag.color : '#9ca3af' }
                        : { backgroundColor: isOn ? '#f3f4f6' : 'transparent', color: isOn ? '#6b7280' : '#9ca3af' }
                    }
                  >
                    {tag.color && isOn && (
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                    )}
                    {tag.name}
                  </button>
                );
              })
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}

const OFFSET_OPTIONS = [
  { days: 30, label: '30 days before' },
  { days: 15, label: '15 days before' },
  { days: 7,  label: '7 days before' },
  { days: 1,  label: '1 day before' },
];

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10); // 'YYYY-MM-DD'
}

function ExpiryReminderSection({
  doc,
  onSaved,
}: {
  doc: DocumentDetail;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [expiryDate, setExpiryDate] = useState(toDateInput(doc.expiryDate));
  const [renewalDueDate, setRenewalDueDate] = useState(toDateInput(doc.renewalDueDate));
  const [isReminderEnabled, setIsReminderEnabled] = useState(doc.isReminderEnabled);
  const [offsetDays, setOffsetDays] = useState<number[]>([30, 15, 7]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleOffset(days: number) {
    setOffsetDays((prev) =>
      prev.includes(days) ? prev.filter((d) => d !== days) : [...prev, days],
    );
  }

  async function handleSave() {
    setError(null);

    // Validate: reminders require an expiry date
    if (isReminderEnabled && !expiryDate) {
      setError('An expiry date is required to enable reminders.');
      return;
    }

    // Validate: expiry date must be in the future
    if (expiryDate) {
      const exp = new Date(expiryDate);
      exp.setHours(23, 59, 59, 999); // end of day
      if (exp <= new Date()) {
        setError('Expiry date must be in the future.');
        return;
      }
    }

    // Validate: at least one offset must be selected when reminders are on
    if (isReminderEnabled && offsetDays.length === 0) {
      setError('Select at least one reminder interval.');
      return;
    }

    setSaving(true);
    try {
      await setDocumentReminders(doc.id, {
        expiryDate: expiryDate || null,
        renewalDueDate: renewalDueDate || null,
        isReminderEnabled,
        offsetDays: isReminderEnabled ? offsetDays : [],
      });
      toast.success('Expiry & reminders saved.');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Expiry &amp; Reminders">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Expiry date
          </label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Renewal due date
          </label>
          <input
            type="date"
            value={renewalDueDate}
            onChange={(e) => setRenewalDueDate(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isReminderEnabled}
            onChange={(e) => setIsReminderEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-gray-700 font-medium">Enable reminders</span>
        </label>
      </div>

      {isReminderEnabled && (
        <div className="mt-3 pl-6">
          <p className="text-xs text-gray-500 mb-2">
            Remind me before expiry:
          </p>
          <div className="flex flex-wrap gap-3">
            {OFFSET_OPTIONS.map(({ days, label }) => (
              <label key={days} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={offsetDays.includes(days)}
                  onChange={() => toggleOffset(days)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs text-gray-600">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving && (
            <svg className="animate-spin" width="13" height="13" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------ //
// Edit document modal
// ------------------------------------------------------------------ //

function EditDocumentModal({
  doc,
  onClose,
  onSaved,
}: {
  doc: DocumentDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(doc.name);
  const [description, setDescription] = useState(doc.description ?? '');
  const [folderId, setFolderId] = useState(doc.folder?.id ?? '');
  const [status, setStatus] = useState<DocumentStatus>(doc.status);
  const [folders, setFolders] = useState<FolderListItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFolders(doc.workspace.id)
      .then(setFolders)
      .catch(() => {});
  }, [doc.workspace.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      await updateDocument(doc.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        folderId: folderId || null,
        status,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Edit Document</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Optional description…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Folder</label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">No folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DocumentStatus)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Version upload modal
// ------------------------------------------------------------------ //

function VersionUploadModal({
  documentId,
  fileName,
  currentVersion,
  onClose,
  onSuccess,
}: {
  documentId: string;
  fileName: string;
  currentVersion: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Please select a file.'); return; }

    setUploading(true);
    setError(null);

    try {
      await uploadDocumentVersion(documentId, file, notes.trim() || undefined);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

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
          <div>
            <h2 className="text-base font-semibold text-gray-900">Upload New Version</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {fileName} · current v{currentVersion} → v{currentVersion + 1}
            </p>
          </div>
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
              New file <span className="text-red-500">*</span>
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
                  <span className="text-sm font-medium text-gray-800 truncate max-w-xs">{file.name}</span>
                  <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto mb-2 text-gray-300" width="28" height="28" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path d="M4 16.004V17a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M16 8l-4-4-4 4M12 4v12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-sm text-gray-500">Click to choose the updated file</p>
                  <p className="text-xs text-gray-400 mt-1">Up to 50 MB</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv,.zip,.json"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Change notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What changed in this version?"
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
          </div>

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
                `Upload v${currentVersion + 1}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Document activity section
// ------------------------------------------------------------------ //

const ACTIVITY_CATEGORY_STYLES = {
  create:   'bg-green-50 text-green-700',
  update:   'bg-blue-50 text-blue-700',
  delete:   'bg-red-50 text-red-700',
  share:    'bg-purple-50 text-purple-700',
  download: 'bg-amber-50 text-amber-700',
  member:   'bg-teal-50 text-teal-700',
} as const;

const ACTIVITY_DOT_STYLES = {
  create:   'bg-green-500',
  update:   'bg-blue-500',
  delete:   'bg-red-500',
  share:    'bg-purple-500',
  download: 'bg-amber-500',
  member:   'bg-teal-500',
} as const;

function DocumentActivitySection({ documentId }: { documentId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocumentActivity(documentId)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [documentId]);

  return (
    <Section title="Activity">
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-gray-200 mt-2 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-2/3 bg-gray-200 rounded" />
                <div className="h-3 w-1/3 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-400">No activity recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const category = auditActionCategory(log.action);
            const actor = log.user
              ? `${log.user.firstName} ${log.user.lastName}`
              : 'External user';
            const diff = Date.now() - new Date(log.createdAt).getTime();
            const m = Math.floor(diff / 60000);
            const timeAgo =
              m < 1 ? 'just now'
              : m < 60 ? `${m}m ago`
              : m < 1440 ? `${Math.floor(m / 60)}h ago`
              : new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return (
              <div key={log.id} className="flex items-start gap-3">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                    ACTIVITY_DOT_STYLES[category],
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-800 leading-snug">
                      {describeAuditLog(log)}
                    </p>
                    <time className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      {timeAgo}
                    </time>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{actor}</span>
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                        ACTIVITY_CATEGORY_STYLES[category],
                      )}
                    >
                      {formatAuditAction(log.action)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

// ------------------------------------------------------------------ //
// Reusable sub-components
// ------------------------------------------------------------------ //

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="w-28 flex-shrink-0 text-xs text-gray-400 font-medium pt-0.5">
        {label}
      </span>
      <span className="flex-1 text-sm text-gray-700">{value}</span>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Loading skeleton
// ------------------------------------------------------------------ //

function DetailSkeleton() {
  return (
    <div className="max-w-5xl animate-pulse">
      <div className="h-4 w-28 bg-gray-200 rounded mb-5" />
      <div className="h-7 w-64 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-40 bg-gray-100 rounded mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-xl h-48" />
        ))}
      </div>
    </div>
  );
}
