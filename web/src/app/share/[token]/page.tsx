'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  fetchPublicShareInfo,
  verifySharePassword,
  buildDownloadUrl,
} from '@/lib/shares';
import type { PublicShareInfo } from '@/types';

type PageState = 'loading' | 'password' | 'ready' | 'error';

export default function PublicSharePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [state, setState] = useState<PageState>('loading');
  const [shareInfo, setShareInfo] = useState<PublicShareInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // For password-protected shares
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [accessGrant, setAccessGrant] = useState<string | null>(null);

  // For download trigger
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchPublicShareInfo(token)
      .then((info) => {
        setShareInfo(info);
        setState(info.requiresPassword ? 'password' : 'ready');
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Share not found or has expired.');
        setState('error');
      });
  }, [token]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setVerifyError('');
    setVerifying(true);
    try {
      const res = await verifySharePassword(token, password);
      setAccessGrant(res.accessGrant);
      setState('ready');
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Incorrect password.');
    } finally {
      setVerifying(false);
    }
  }

  async function handleDownload() {
    if (!token) return;
    setDownloading(true);
    try {
      const url = buildDownloadUrl(token, accessGrant ?? undefined);
      // Use an anchor click to trigger browser download
      const a = document.createElement('a');
      a.href = url;
      a.download = shareInfo?.documentName ?? 'document';
      a.click();
    } finally {
      // Give a moment for the download to start before clearing state
      setTimeout(() => setDownloading(false), 1500);
    }
  }

  // ------------------------------------------------------------------ //
  // Render states
  // ------------------------------------------------------------------ //

  if (state === 'loading') {
    return (
      <Shell>
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-48 bg-gray-200 rounded mx-auto" />
          <div className="h-4 w-32 bg-gray-100 rounded mx-auto" />
        </div>
      </Shell>
    );
  }

  if (state === 'error') {
    return (
      <Shell>
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className="text-red-500">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Link unavailable</h1>
          <p className="text-sm text-gray-500">{errorMsg}</p>
        </div>
      </Shell>
    );
  }

  if (state === 'password') {
    return (
      <Shell>
        <div className="space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className="text-brand-600">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">{shareInfo?.documentName}</h1>
            <p className="text-sm text-gray-500">This document is password protected.</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoFocus
              className="w-full text-sm border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {verifyError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                {verifyError}
              </p>
            )}
            <button
              type="submit"
              disabled={verifying || !password}
              className="w-full py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {verifying ? 'Verifying…' : 'Access Document'}
            </button>
          </form>
        </div>
      </Shell>
    );
  }

  // state === 'ready'
  const expiresAt = shareInfo?.expiresAt
    ? new Date(shareInfo.expiresAt).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;

  return (
    <Shell>
      <div className="space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className="text-brand-600">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">{shareInfo?.documentName}</h1>
          <p className="text-sm text-gray-500">Shared document from DockyDoc</p>
        </div>

        <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
          <InfoRow label="Document" value={shareInfo?.documentName ?? '—'} />
          <InfoRow label="Download" value={shareInfo?.allowDownload ? 'Allowed' : 'View only'} />
          {expiresAt && <InfoRow label="Expires" value={expiresAt} />}
          {shareInfo?.requiresPassword && (
            <InfoRow label="Access" value={accessGrant ? 'Verified' : 'Password protected'} />
          )}
        </div>

        {shareInfo?.allowDownload && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {downloading ? (
              <>
                <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Starting download…
              </>
            ) : (
              <>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Download Document
              </>
            )}
          </button>
        )}

        {!shareInfo?.allowDownload && (
          <p className="text-xs text-center text-gray-400">
            Download is not enabled for this share.
          </p>
        )}

        <p className="text-[10px] text-center text-gray-300">
          Powered by DockyDoc
        </p>
      </div>
    </Shell>
  );
}

// ------------------------------------------------------------------ //
// Layout shell
// ------------------------------------------------------------------ //

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm p-8">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <span className="text-xs text-gray-700">{value}</span>
    </div>
  );
}
