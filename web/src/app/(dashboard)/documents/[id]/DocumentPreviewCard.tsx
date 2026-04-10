'use client';

import { useEffect, useRef, useState } from 'react';
import { getStoredToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8081';
const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_USER_EMAIL ?? 'alice@acmecorp.com';

interface Props {
  documentId: string;
  versionNumber: number;
  mimeHint?: string;
}

export default function DocumentPreviewCard({ documentId, versionNumber, mimeHint }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mime, setMime] = useState<string>(mimeHint ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    if (prevUrl.current) {
      URL.revokeObjectURL(prevUrl.current);
      prevUrl.current = null;
    }
    setBlobUrl(null);
    setError(null);
    setLoading(true);

    const headers = new Headers();
    const token = getStoredToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    else headers.set('x-dev-user-email', DEV_EMAIL);

    fetch(
      `${API_URL}/api/v1/documents/${documentId}/versions/${versionNumber}/download`,
      { headers },
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const detected = blob.type || res.headers.get('content-type') || mimeHint || '';
        setBlobUrl(url);
        setMime(detected);
        prevUrl.current = url;
      })
      .catch((err: Error) => setError(err.message ?? 'Failed to load'))
      .finally(() => setLoading(false));

    return () => {
      if (prevUrl.current) {
        URL.revokeObjectURL(prevUrl.current);
        prevUrl.current = null;
      }
    };
  }, [documentId, versionNumber]);

  const isPdf = mime.includes('pdf');
  const isImage = mime.startsWith('image/');

  return (
    <div className="h-[520px] bg-gray-50 flex items-center justify-center relative overflow-hidden rounded-b-none">
      {loading && (
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <svg className="animate-spin w-7 h-7" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading preview…</span>
        </div>
      )}

      {!loading && error && (
        <div className="text-center px-8">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm font-medium text-gray-600 mb-1">Preview unavailable</p>
          <p className="text-xs text-gray-400">{error}</p>
        </div>
      )}

      {!loading && !error && blobUrl && isPdf && (
        <iframe src={blobUrl} className="w-full h-full border-0" title={`v${versionNumber} preview`} />
      )}

      {!loading && !error && blobUrl && isImage && (
        <img
          src={blobUrl}
          alt={`v${versionNumber} preview`}
          className="max-w-full max-h-full object-contain p-4"
        />
      )}

      {!loading && !error && blobUrl && !isPdf && !isImage && (
        <div className="text-center px-8">
          <div className="w-16 h-20 bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center mx-auto mb-3">
            <span className="text-xs font-bold text-gray-400 uppercase">
              {mime.split('/')[1]?.slice(0, 4) || 'FILE'}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">No preview available</p>
          <p className="text-xs text-gray-400">{mime || 'Binary file'} — download to view</p>
        </div>
      )}
    </div>
  );
}
