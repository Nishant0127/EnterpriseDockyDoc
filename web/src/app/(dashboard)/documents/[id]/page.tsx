'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchDocument } from '@/lib/documents';
import { cn } from '@/lib/utils';
import type { DocumentDetail, DocumentStatus } from '@/types';

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
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    fetchDocument(params.id)
      .then(setDoc)
      .catch(() => setError('Document not found or API unavailable.'))
      .finally(() => setLoading(false));
  }, [params.id]);

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
        <span
          className={cn(
            'flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border',
            badge.bg,
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', badge.dot)} />
          {badge.label}
        </span>
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
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-xs text-gray-500">{formatBytes(v.fileSizeBytes)}</p>
                    <p className="text-[10px] text-gray-400 truncate max-w-32">{v.mimeType}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ---- Tags ----------------------------------------------- */}
        <Section title="Tags">
          {doc.tags.length === 0 ? (
            <p className="text-sm text-gray-400">No tags assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {doc.tags.map((tag) => (
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
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                  )}
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </Section>

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
      </div>
    </div>
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
