'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchDocument, downloadDocument, downloadDocumentVersion, deleteDocumentVersion, uploadDocumentVersion, setDocumentReminders, updateDocument, deleteDocument, shredDocument, fetchFolders, fetchTags, setDocumentTags, setDocumentMetadata } from '@/lib/documents';
import { apiFetch } from '@/lib/api';
import { fetchDocumentActivity, describeAuditLog, auditActionCategory, formatAuditAction } from '@/lib/audit';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useUser } from '@/context/UserContext';
import type { AuditLog, DocumentDetail, DocumentStatus, DocumentVersion, FolderListItem, Tag } from '@/types';
import ShareSection from './ShareSection';
import DocumentPreviewCard from './DocumentPreviewCard';

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
// AI Extraction types
// ------------------------------------------------------------------ //

interface ConfidenceByField {
  documentType: number;
  title: number;
  issuer: number;
  counterparty: number;
  contractNumber: number;
  policyNumber: number;
  certificateNumber: number;
  referenceNumber: number;
  issueDate: number;
  effectiveDate: number;
  expiryDate: number;
  renewalDueDate: number;
  suggestedTags: number;
  suggestedFolder: number;
}

interface AiExtractionResult {
  status: 'done' | 'running' | 'failed' | 'disabled' | 'none';
  documentType: string | null;
  title: string | null;
  issuer: string | null;
  counterparty: string | null;
  contractNumber: string | null;
  policyNumber: string | null;
  certificateNumber: string | null;
  referenceNumber: string | null;
  issueDate: string | null;
  effectiveDate: string | null;
  expiryDate: string | null;
  renewalDueDate: string | null;
  summary: string | null;
  keyPoints: string[];
  suggestedTags: string[];
  suggestedFolder: string | null;
  riskFlags: string[];
  overallConfidence: number;
  dateConfidence: number;
  confidenceByField: ConfidenceByField;
  ocrProvider: string | null;
  extractedAt: string | null;
  appliedFields: string[];
  userAppliedFields?: string[];
  error: string | null;
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
  const [deletingVersion, setDeletingVersion] = useState<number | null>(null);
  const [pendingDeleteVersion, setPendingDeleteVersion] = useState<number | null>(null);
  const [aiExtraction, setAiExtraction] = useState<AiExtractionResult | null>(null);
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiApplying, setAiApplying] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<number | null>(null);

  async function loadAiExtraction() {
    if (!params.id) return;
    try {
      const result = await apiFetch<AiExtractionResult>(`/api/v1/ai/documents/${params.id}/extraction`);
      setAiExtraction(result);
    } catch {
      // silently ignore — extraction may not exist yet
    }
  }

  async function handleAiExtract() {
    if (!params.id) return;
    setAiExtracting(true);
    try {
      const result = await apiFetch<AiExtractionResult>(`/api/v1/ai/documents/${params.id}/extract`, { method: 'POST' });
      setAiExtraction(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI extraction failed.');
    } finally {
      setAiExtracting(false);
    }
  }

  async function handleAiApply(fields: string[]) {
    if (!params.id) return;
    setAiApplying(true);
    try {
      const result = await apiFetch<{ applied: string[]; skipped: string[] }>(`/api/v1/ai/documents/${params.id}/apply`, {
        method: 'POST',
        body: JSON.stringify({ fields }),
      });
      reload();
      await loadAiExtraction();
      if (result.applied.length > 0) {
        toast.success(`Applied: ${result.applied.join(', ')}`);
      } else {
        toast.error('Nothing to apply — fields may already be set or have no extracted value.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply AI suggestions.');
    } finally {
      setAiApplying(false);
    }
  }

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
      .then((d) => {
        setDoc(d);
        setPreviewVersion((prev: number | null) => prev ?? d.currentVersionNumber);
        void loadAiExtraction();
      })
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

  async function handleDeleteVersion(versionNumber: number) {
    if (!doc) return;
    setPendingDeleteVersion(null);
    setDeletingVersion(versionNumber);
    try {
      const updated = await deleteDocumentVersion(doc.id, versionNumber);
      setDoc(updated);
      toast.success(`Version ${versionNumber} deleted.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete version.');
    } finally {
      setDeletingVersion(null);
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

      {/* Document preview */}
      {previewVersion !== null && (
        <div className="mb-5 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className="text-gray-400">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Document Preview</span>
              <span className="text-xs text-gray-400">
                — v{previewVersion}
                {previewVersion === doc.currentVersionNumber ? ' (current)' : ''}
              </span>
            </div>
            {/* Version switcher */}
            <div className="flex items-center gap-1">
              {doc.versions.map((v: DocumentVersion) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setPreviewVersion(v.versionNumber)}
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium transition-colors',
                    v.versionNumber === previewVersion
                      ? 'bg-brand-600 text-white'
                      : 'text-gray-500 hover:bg-gray-200',
                  )}
                >
                  v{v.versionNumber}
                </button>
              ))}
            </div>
          </div>
          <DocumentPreviewCard
            documentId={doc.id}
            versionNumber={previewVersion}
            mimeHint={doc.versions.find((v: DocumentVersion) => v.versionNumber === previewVersion)?.mimeType}
          />
        </div>
      )}

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
        <Section
          title={`Versions (${doc.versionCount})`}
          action={
            canEdit && doc.status !== 'DELETED' ? (
              <button
                type="button"
                onClick={() => setShowVersionUpload(true)}
                className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
              >
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M4 16.004V17a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M16 8l-4-4-4 4M12 4v12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Upload new version
              </button>
            ) : undefined
          }
        >
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
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <div className="text-right mr-1">
                      <p className="text-xs text-gray-500">{formatBytes(v.fileSizeBytes)}</p>
                      <p className="text-[10px] text-gray-400 truncate max-w-28">{v.mimeType}</p>
                    </div>
                    {/* Preview this version */}
                    <button
                      type="button"
                      onClick={() => setPreviewVersion(v.versionNumber)}
                      title={`Preview v${v.versionNumber}`}
                      className={cn(
                        'p-1.5 rounded-md text-xs font-medium transition-colors',
                        v.versionNumber === previewVersion
                          ? 'bg-brand-50 text-brand-600'
                          : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50',
                      )}
                    >
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
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
                    {/* Per-version delete — editor+, only when > 1 version exists */}
                    {canEdit && doc.versions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteVersion(v.versionNumber)}
                        disabled={deletingVersion === v.versionNumber}
                        title={`Delete v${v.versionNumber}`}
                        className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deletingVersion === v.versionNumber ? (
                          <svg className="animate-spin" width="12" height="12" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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
        <MetadataSection
          doc={doc}
          canEdit={canEdit}
          onSaved={reload}
        />

        {/* ---- AI Extraction (full width) ------------------------- */}
        <div className="lg:col-span-2">
          <AiExtractionSection
            documentId={doc.id}
            extraction={aiExtraction}
            extracting={aiExtracting}
            applying={aiApplying}
            onExtract={() => void handleAiExtract()}
            onApply={(fields) => void handleAiApply(fields)}
          />
        </div>

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

      {/* Version delete confirmation modal */}
      {pendingDeleteVersion !== null && (
        <ConfirmModal
          title={`Delete version ${pendingDeleteVersion}`}
          body={
            pendingDeleteVersion === doc.currentVersionNumber
              ? `v${pendingDeleteVersion} is the current version. Deleting it will roll back to v${doc.currentVersionNumber - 1}. The file will be permanently removed.`
              : `v${pendingDeleteVersion} will be permanently removed. This cannot be undone.`
          }
          confirmLabel="Delete Version"
          danger
          loading={deletingVersion === pendingDeleteVersion}
          onConfirm={() => handleDeleteVersion(pendingDeleteVersion)}
          onClose={() => { if (deletingVersion === null) setPendingDeleteVersion(null); }}
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

// ------------------------------------------------------------------ //
// Metadata section — editable key/value pairs
// ------------------------------------------------------------------ //

interface MetadataRow {
  key: string;
  value: string;
  /** cuid from DB if the row already exists, undefined for newly added rows */
  id?: string;
}

function MetadataSection({
  doc,
  canEdit,
  onSaved,
}: {
  doc: DocumentDetail;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<MetadataRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setRows(doc.metadata.map((m) => ({ id: m.id, key: m.key, value: m.value })));
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  function addRow() {
    setRows((prev: MetadataRow[]) => [...prev, { key: '', value: '' }]);
  }

  function removeRow(idx: number) {
    setRows((prev: MetadataRow[]) => prev.filter((_: MetadataRow, i: number) => i !== idx));
  }

  function updateRow(idx: number, field: 'key' | 'value', val: string) {
    setRows((prev: MetadataRow[]) =>
      prev.map((r: MetadataRow, i: number) => (i === idx ? { ...r, [field]: val } : r)),
    );
  }

  async function handleSave() {
    // Validate: no duplicate keys, no blank keys
    const trimmed = rows.map((r: MetadataRow) => ({ key: r.key.trim(), value: r.value.trim() }));
    const keys = trimmed.map((r: { key: string; value: string }) => r.key).filter(Boolean);
    if (trimmed.some((r: { key: string; value: string }) => !r.key)) {
      setError('All metadata keys must be non-empty.');
      return;
    }
    if (new Set(keys).size !== keys.length) {
      setError('Duplicate metadata keys are not allowed.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await setDocumentMetadata(doc.id, trimmed);
      toast.success('Metadata saved.');
      setEditing(false);
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save metadata.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  // ── read-only view ────────────────────────────────────────────────
  if (!editing) {
    return (
      <Section
        title="Metadata"
        action={
          canEdit ? (
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
          ) : undefined
        }
      >
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
    );
  }

  // ── edit view ─────────────────────────────────────────────────────
  return (
    <Section title="Metadata">
      <div className="space-y-2">
        {rows.length === 0 && (
          <p className="text-sm text-gray-400">No entries yet. Add one below.</p>
        )}
        {rows.map((row: MetadataRow, idx: number) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Key"
              value={row.key}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRow(idx, 'key', e.target.value)}
              className="w-36 flex-shrink-0 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium text-gray-700 placeholder-gray-400"
            />
            <input
              type="text"
              placeholder="Value"
              value={row.value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRow(idx, 'value', e.target.value)}
              className="flex-1 text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-700 placeholder-gray-400"
            />
            <button
              type="button"
              onClick={() => removeRow(idx)}
              title="Remove row"
              className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Add row */}
      <button
        type="button"
        onClick={addRow}
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-600 hover:underline"
      >
        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        Add metadata
      </button>

      {/* Error */}
      {error && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving && (
            <svg className="animate-spin" width="12" height="12" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          disabled={saving}
          className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
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
// AiExtractionSection
// ------------------------------------------------------------------ //

function SpinnerIcon({ size = 14 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function confidenceClass(c: number): string {
  if (c >= 0.8) return 'bg-green-50 text-green-700 border-green-200';
  if (c >= 0.6) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence <= 0) return null;
  const pct = Math.round(confidence * 100);
  const cls =
    confidence >= 0.85
      ? 'bg-green-50 text-green-600 border-green-200'
      : confidence >= 0.6
      ? 'bg-yellow-50 text-yellow-600 border-yellow-200'
      : 'bg-gray-50 text-gray-500 border-gray-200';
  const label =
    confidence >= 0.85 ? 'High' : confidence >= 0.6 ? 'Med' : 'Low';
  return (
    <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border', cls)}>
      {label} {pct}%
    </span>
  );
}

function daysUntil(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyClass(days: number): string {
  if (days < 0) return 'text-red-600 font-semibold';
  if (days <= 30) return 'text-orange-600 font-medium';
  if (days <= 90) return 'text-yellow-600';
  return 'text-gray-600';
}

function AiExtractionSection({
  documentId,
  extraction,
  extracting,
  applying,
  onExtract,
  onApply,
}: {
  documentId: string;
  extraction: AiExtractionResult | null;
  extracting: boolean;
  applying: boolean;
  onExtract: () => void;
  onApply: (fields: string[]) => void;
}) {
  const [summaryOpen, setSummaryOpen] = useState(false);

  const status = extraction?.status ?? 'none';

  // Determine applied state: userApplied = manually confirmed (locked), applied = AI auto-applied
  const applied = extraction?.appliedFields ?? [];
  const userApplied = extraction?.userAppliedFields ?? [];
  const isAppliedByAnyone = (field: string) => applied.includes(field) || userApplied.includes(field);
  const unappliedDates = (['expiryDate', 'renewalDueDate'] as const).filter(
    (f) => extraction?.[f] != null && !isAppliedByAnyone(f),
  );
  const hasUnappliedTags = (extraction?.suggestedTags?.length ?? 0) > 0 && !isAppliedByAnyone('suggestedTags');
  const hasUnappliedFolder = !!extraction?.suggestedFolder && !isAppliedByAnyone('suggestedFolder');
  const allUnapplied = [
    ...unappliedDates,
    ...(hasUnappliedTags ? ['suggestedTags'] : []),
    ...(hasUnappliedFolder ? ['suggestedFolder'] : []),
  ];

  function ExtractButton({ label = 'Extract with AI' }: { label?: string }) {
    return (
      <button
        type="button"
        onClick={onExtract}
        disabled={extracting}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
      >
        {extracting ? <><SpinnerIcon size={12} /> Extracting…</> : label}
      </button>
    );
  }

  return (
    <Section title="AI Extraction">
      {/* ── status: none ──────────────────────────────────────────── */}
      {status === 'none' && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-400 flex-1">
            Use AI to automatically extract key fields, dates, and insights from this document.
          </p>
          <ExtractButton />
        </div>
      )}

      {/* ── status: running ───────────────────────────────────────── */}
      {status === 'running' && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <SpinnerIcon size={16} />
          <span>AI extraction in progress…</span>
        </div>
      )}

      {/* ── status: disabled ──────────────────────────────────────── */}
      {status === 'disabled' && (
        <p className="text-sm text-gray-400">
          AI unavailable — <span className="font-mono text-xs">ANTHROPIC_API_KEY</span> not configured.
        </p>
      )}

      {/* ── status: failed ────────────────────────────────────────── */}
      {status === 'failed' && (
        <div className="space-y-2">
          <p className="text-sm text-red-600">
            {extraction?.error ?? 'Extraction failed. Please try again.'}
          </p>
          <ExtractButton label="Retry Extraction" />
        </div>
      )}

      {/* ── status: done ──────────────────────────────────────────── */}
      {status === 'done' && extraction && (
        <div className="space-y-5">

          {/* Row 1 — Classification bar */}
          <div className="flex flex-wrap items-center gap-2">
            {extraction.documentType && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-600 text-white tracking-wide">
                {extraction.documentType.toUpperCase()}
              </span>
            )}
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border', confidenceClass(extraction.overallConfidence))}>
              {Math.round(extraction.overallConfidence * 100)}% confidence
            </span>
            {extraction.ocrProvider && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                via {extraction.ocrProvider.replace('azure-document-intelligence', 'Azure DI').replace('mistral-ocr', 'Mistral').replace('claude-native', 'Claude').replace('search-content-fallback', 'text cache')}
              </span>
            )}
            {extraction.extractedAt && (
              <span className="text-xs text-gray-400">
                {formatDateTime(extraction.extractedAt)}
              </span>
            )}
            <button
              type="button"
              onClick={onExtract}
              disabled={extracting}
              className="ml-auto text-xs text-brand-600 hover:underline disabled:opacity-50 flex items-center gap-1"
            >
              {extracting ? <><SpinnerIcon size={10} /> Re-extracting…</> : 'Re-extract'}
            </button>
          </div>

          {/* Row 2 — Key fields grid */}
          {(() => {
            const cbf = extraction.confidenceByField ?? {};
            const fields: { label: string; value: string; fieldKey: keyof ConfidenceByField }[] = [];
            if (extraction.issuer) fields.push({ label: 'Issuer', value: extraction.issuer, fieldKey: 'issuer' });
            if (extraction.counterparty) fields.push({ label: 'Counterparty', value: extraction.counterparty, fieldKey: 'counterparty' });
            if (extraction.contractNumber) fields.push({ label: 'Contract No.', value: extraction.contractNumber, fieldKey: 'contractNumber' });
            if (extraction.policyNumber) fields.push({ label: 'Policy No.', value: extraction.policyNumber, fieldKey: 'policyNumber' });
            if (extraction.certificateNumber) fields.push({ label: 'Certificate No.', value: extraction.certificateNumber, fieldKey: 'certificateNumber' });
            if (extraction.referenceNumber) fields.push({ label: 'Reference No.', value: extraction.referenceNumber, fieldKey: 'referenceNumber' });
            if (extraction.issueDate) fields.push({ label: 'Issue Date', value: formatDate(extraction.issueDate), fieldKey: 'issueDate' });
            if (extraction.effectiveDate) fields.push({ label: 'Effective Date', value: formatDate(extraction.effectiveDate), fieldKey: 'effectiveDate' });
            if (fields.length === 0) return null;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {fields.map(({ label, value, fieldKey }) => (
                  <div key={label}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
                      <ConfidenceBadge confidence={cbf[fieldKey] ?? 0} />
                    </div>
                    <p className="text-sm text-gray-800">{value}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Row 3 — Critical dates panel */}
          {(extraction.expiryDate || extraction.renewalDueDate) && (
            <div className="rounded-lg bg-brand-50 border border-brand-100 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Detected Dates</p>
                <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium border', confidenceClass(extraction.dateConfidence))}>
                  {Math.round(extraction.dateConfidence * 100)}% date confidence
                </span>
              </div>
              {(
                [
                  { key: 'expiryDate', label: 'Expiry Date', fieldKey: 'expiryDate' as keyof ConfidenceByField },
                  { key: 'renewalDueDate', label: 'Renewal Due', fieldKey: 'renewalDueDate' as keyof ConfidenceByField },
                ] as const
              ).map(({ key, label, fieldKey }) => {
                const iso = extraction[key];
                if (!iso) return null;
                const days = daysUntil(iso);
                const isAutoApplied = applied.includes(key);
                const isUserApplied = userApplied.includes(key);
                const fieldConf = (extraction.confidenceByField ?? {})[fieldKey] ?? 0;
                return (
                  <div key={key} className="flex flex-wrap items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                        <ConfidenceBadge confidence={fieldConf} />
                      </div>
                      <p className="text-sm text-gray-800">{formatDate(iso)}</p>
                    </div>
                    <span className={cn('text-xs', urgencyClass(days))}>
                      {days < 0
                        ? `${Math.abs(days)}d overdue`
                        : days === 0
                        ? 'Today'
                        : `${days}d remaining`}
                    </span>
                    {isUserApplied ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        Confirmed ✓
                      </span>
                    ) : isAutoApplied ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        Auto-applied ✓
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onApply([key])}
                        disabled={applying}
                        className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                      >
                        {applying ? <SpinnerIcon size={10} /> : 'Apply'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Row 4 — Summary & key points (collapsible) */}
          {(extraction.summary || extraction.keyPoints.length > 0) && (
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setSummaryOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span>Summary &amp; Key Points</span>
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  className={cn('transition-transform', summaryOpen && 'rotate-180')}
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {summaryOpen && (
                <div className="px-4 py-3 space-y-3">
                  {extraction.summary && (
                    <p className="text-sm text-gray-700 leading-relaxed">{extraction.summary}</p>
                  )}
                  {extraction.keyPoints.length > 0 && (
                    <ul className="space-y-1.5">
                      {extraction.keyPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-brand-400 mt-0.5 flex-shrink-0">•</span>
                          {pt}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Row 5 — Suggested tags */}
          {extraction.suggestedTags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suggested Tags</p>
                <ConfidenceBadge confidence={(extraction.confidenceByField ?? {}).suggestedTags ?? 0} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {extraction.suggestedTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200"
                  >
                    {tag}
                  </span>
                ))}
                {!isAppliedByAnyone('suggestedTags') ? (
                  <button
                    type="button"
                    onClick={() => onApply(['suggestedTags'])}
                    disabled={applying}
                    className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    Apply Tags
                  </button>
                ) : (
                  <span className="text-xs text-green-600 font-medium">✓ Applied</span>
                )}
              </div>
            </div>
          )}

          {/* Row 6 — Risk flags */}
          {extraction.riskFlags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Risk Flags</p>
              <div className="flex flex-wrap gap-2">
                {extraction.riskFlags.map((flag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200"
                  >
                    <svg width="10" height="10" fill="currentColor" viewBox="0 0 20 20" className="flex-shrink-0">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested folder */}
          {extraction.suggestedFolder && (
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suggested Folder</p>
                  <ConfidenceBadge confidence={(extraction.confidenceByField ?? {}).suggestedFolder ?? 0} />
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>
                  {extraction.suggestedFolder}
                </span>
              </div>
              {!isAppliedByAnyone('suggestedFolder') ? (
                <button
                  type="button"
                  onClick={() => onApply(['suggestedFolder'])}
                  disabled={applying}
                  className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  Move Here
                </button>
              ) : userApplied.includes('suggestedFolder') ? (
                <span className="text-xs text-blue-600 font-medium">✓ Confirmed</span>
              ) : (
                <span className="text-xs text-green-600 font-medium">✓ Applied</span>
              )}
            </div>
          )}

          {/* Apply all button */}
          {allUnapplied.length > 0 && (
            <div className="pt-1 border-t border-gray-100">
              <button
                type="button"
                onClick={() => onApply(allUnapplied)}
                disabled={applying}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {applying ? <><SpinnerIcon size={12} /> Applying…</> : `Apply All (${allUnapplied.length})`}
              </button>
            </div>
          )}
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
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {action && <div>{action}</div>}
      </div>
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
