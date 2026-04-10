'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { fetchWorkspaceDetail, fetchTags, createTag, updateTag, deleteTag, renameWorkspace } from '@/lib/documents';
import type { AiSettings } from '@/lib/documents';
import { fetchAiSettings, updateAiSettings } from '@/lib/documents';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { Tag, WorkspaceDetail } from '@/types';

export default function SettingsPage() {
  const { user, activeWorkspace, isLoading, refreshUser } = useUser();
  const toast = useToast();
  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [renamingWorkspace, setRenamingWorkspace] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [aiSettingsLoading, setAiSettingsLoading] = useState(false);
  const [aiProviderMode, setAiProviderMode] = useState<'PLATFORM' | 'BYOK'>('PLATFORM');
  const [byokKey, setByokKey] = useState('');
  const [aiSaving, setAiSaving] = useState(false);
  const [showByokKey, setShowByokKey] = useState(false);

  useEffect(() => {
    if (!activeWorkspace) return;
    setDisplayName(activeWorkspace.workspaceName);
    setDetailLoading(true);
    setTagsLoading(true);
    fetchWorkspaceDetail(activeWorkspace.workspaceId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
    fetchTags(activeWorkspace.workspaceId)
      .then(setTags)
      .catch(() => setTags([]))
      .finally(() => setTagsLoading(false));
    setAiSettingsLoading(true);
    fetchAiSettings(activeWorkspace.workspaceId)
      .then((s) => {
        setAiSettings(s);
        setAiProviderMode(s.aiProvider);
      })
      .catch(() => setAiSettings(null))
      .finally(() => setAiSettingsLoading(false));
  }, [activeWorkspace?.workspaceId]);

  function refreshTags() {
    if (!activeWorkspace) return;
    fetchTags(activeWorkspace.workspaceId).then(setTags).catch(() => {});
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!activeWorkspace || !renameValue.trim()) return;
    setRenameSaving(true);
    try {
      const updated = await renameWorkspace(activeWorkspace.workspaceId, renameValue.trim());
      setDisplayName(updated.name);
      setRenamingWorkspace(false);
      toast.success('Workspace renamed successfully.');
      // Refresh user context so sidebar + header reflect new name
      void refreshUser();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rename workspace.');
    } finally {
      setRenameSaving(false);
    }
  }

  async function handleSaveAiSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!activeWorkspace) return;
    setAiSaving(true);
    try {
      const payload: { aiProvider: string; apiKey?: string } = {
        aiProvider: aiProviderMode,
      };
      if (aiProviderMode === 'BYOK' && byokKey.trim()) {
        payload.apiKey = byokKey.trim();
      }
      const updated = await updateAiSettings(activeWorkspace.workspaceId, payload);
      setAiSettings(updated);
      setByokKey('');
      toast.success('AI settings saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save AI settings.');
    } finally {
      setAiSaving(false);
    }
  }

  if (isLoading || detailLoading || tagsLoading) return <PageSkeleton />;

  const canRename = activeWorkspace?.role === 'ADMIN' || activeWorkspace?.role === 'OWNER';

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {displayName ?? activeWorkspace?.workspaceName ?? 'No workspace selected'}
        </p>
      </div>

      <div className="space-y-4">
        {/* Workspace info */}
        <SettingsCard title="Workspace">
          <div className={`flex items-center justify-between py-2.5 border-b border-gray-50`}>
            <span className="text-xs text-gray-500 font-medium w-28 flex-shrink-0">Name</span>
            {renamingWorkspace ? (
              <form onSubmit={handleRename} className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  autoFocus
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  disabled={renameSaving || !renameValue.trim()}
                  className="px-3 py-1 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >
                  {renameSaving ? '…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setRenamingWorkspace(false)}
                  className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex-1 flex items-center justify-between">
                <span className="text-sm text-gray-800">{displayName ?? activeWorkspace?.workspaceName ?? '—'}</span>
                {canRename && (
                  <button
                    onClick={() => { setRenameValue(displayName ?? activeWorkspace?.workspaceName ?? ''); setRenamingWorkspace(true); }}
                    className="text-xs text-brand-600 hover:underline ml-2"
                  >
                    Rename
                  </button>
                )}
              </div>
            )}
          </div>
          <SettingsRow label="Slug" value={activeWorkspace?.workspaceSlug ?? '—'} />
          <SettingsRow
            label="Type"
            value={
              activeWorkspace
                ? activeWorkspace.workspaceType.charAt(0) +
                  activeWorkspace.workspaceType.slice(1).toLowerCase()
                : '—'
            }
          />
          <SettingsRow label="Your role" value={activeWorkspace?.role ?? '—'} />
          <SettingsRow
            label="Members"
            value={detail ? String(detail.memberCount) : '—'}
          />
          <SettingsRow
            label="Documents"
            value={detail ? String(detail.documentCount) : '—'}
            last
          />
        </SettingsCard>

        {/* Account info */}
        <SettingsCard title="Account">
          <SettingsRow
            label="Name"
            value={user ? `${user.firstName} ${user.lastName}` : '—'}
          />
          <SettingsRow label="Email" value={user?.email ?? '—'} last />
        </SettingsCard>

        {/* Tags management */}
        {activeWorkspace && (
          <TagsCard
            workspaceId={activeWorkspace.workspaceId}
            tags={tags}
            onChanged={refreshTags}
          />
        )}

        {/* Placeholder sections */}
        <SettingsCard title="Notifications">
          <p className="text-sm text-gray-400 py-1">
            Notification preferences — coming soon.
          </p>
        </SettingsCard>

        <SettingsCard title="Security">
          <p className="text-sm text-gray-400 py-1">
            Password and authentication settings — coming soon.
          </p>
        </SettingsCard>

        <SettingsCard title="Retention &amp; Storage">
          <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
            <div>
              <p className="text-sm text-gray-800 font-medium">Auto-empty Trash</p>
              <p className="text-xs text-gray-400 mt-0.5">Automatically shred deleted documents after a set period</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Coming soon</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <div>
              <p className="text-sm text-gray-800 font-medium">Document retention policy</p>
              <p className="text-xs text-gray-400 mt-0.5">Set default expiry rules for document types</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Coming soon</span>
          </div>
        </SettingsCard>

        <SettingsCard title="Integrations">
          <p className="text-sm text-gray-400 py-1">
            Connect with third-party tools — coming soon.
          </p>
        </SettingsCard>

        {/* AI Configuration */}
        <SettingsCard title="AI Configuration">
          {aiSettingsLoading ? (
            <div className="py-4 text-center text-sm text-gray-400">Loading AI settings…</div>
          ) : aiSettings === null ? (
            <div className="py-4 text-center text-sm text-gray-400">AI settings unavailable.</div>
          ) : (
            <form onSubmit={handleSaveAiSettings} className="space-y-4 py-2">
              {/* Plan badge */}
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-500 font-medium w-28 flex-shrink-0">Plan</span>
                <span className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  aiSettings.plan === 'FREE' && 'bg-gray-100 text-gray-600',
                  aiSettings.plan === 'PRO' && 'bg-blue-100 text-blue-700',
                  aiSettings.plan === 'ENTERPRISE' && 'bg-purple-100 text-purple-700',
                )}>
                  {aiSettings.plan}
                </span>
              </div>

              {/* Provider toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAiProviderMode('PLATFORM')}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                    aiProviderMode === 'PLATFORM'
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300',
                  )}
                >
                  <div className="font-medium">Use DockyDoc AI</div>
                  <div className="text-xs mt-0.5 opacity-70">Managed by DockyDoc, usage tracked</div>
                </button>
                <button
                  type="button"
                  onClick={() => setAiProviderMode('BYOK')}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                    aiProviderMode === 'BYOK'
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300',
                  )}
                >
                  <div className="font-medium">Bring Your Own Key</div>
                  <div className="text-xs mt-0.5 opacity-70">Use your Anthropic API key</div>
                </button>
              </div>

              {/* Platform: usage meter */}
              {aiProviderMode === 'PLATFORM' && (
                <div className="rounded-lg bg-gray-50 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Tokens used this period</span>
                    <span className="font-medium tabular-nums">
                      {aiSettings.aiUsageTokens.toLocaleString()} / {aiSettings.aiUsageLimit.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        aiSettings.aiUsagePercent >= 90 ? 'bg-red-500' :
                        aiSettings.aiUsagePercent >= 70 ? 'bg-yellow-500' : 'bg-blue-500',
                      )}
                      style={{ width: `${aiSettings.aiUsagePercent}%` }}
                    />
                  </div>
                  {aiSettings.aiUsagePercent >= 90 && (
                    <p className="text-xs text-red-600">
                      Usage limit nearly reached. Upgrade your plan to continue using AI features.
                    </p>
                  )}
                </div>
              )}

              {/* BYOK: API key input */}
              {aiProviderMode === 'BYOK' && (
                <div className="space-y-2">
                  {aiSettings.hasApiKey && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <span>✓</span> API key saved. Enter a new key below to replace it.
                    </p>
                  )}
                  <div className="relative">
                    <input
                      type={showByokKey ? 'text' : 'password'}
                      value={byokKey}
                      onChange={(e) => setByokKey(e.target.value)}
                      placeholder={aiSettings.hasApiKey ? 'Enter new key to replace…' : 'sk-ant-…'}
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm pr-16 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowByokKey((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      {showByokKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Keys are encrypted at rest. Never shared or logged.
                  </p>
                </div>
              )}

              {/* Save button — only show if user can edit */}
              {canRename && (
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={aiSaving || (aiProviderMode === 'BYOK' && !aiSettings.hasApiKey && !byokKey.trim())}
                    className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiSaving ? 'Saving…' : 'Save AI Settings'}
                  </button>
                </div>
              )}
            </form>
          )}
        </SettingsCard>

        <SettingsCard title="Danger zone">
          <p className="text-sm text-gray-400 py-1">
            Workspace deletion and data export — coming soon.
          </p>
        </SettingsCard>
      </div>
    </div>
  );
}

function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-5 py-2">{children}</div>
    </div>
  );
}

function SettingsRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-2.5 ${last ? '' : 'border-b border-gray-50'}`}
    >
      <span className="text-xs text-gray-500 font-medium w-28 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-800 flex-1">{value}</span>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Tags card
// ------------------------------------------------------------------ //

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6b7280',
];

function TagsCard({
  workspaceId,
  tags,
  onChanged,
}: {
  workspaceId: string;
  tags: Tag[];
  onChanged: () => void;
}) {
  const toast = useToast();
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createTag(workspaceId, newName.trim(), newColor);
      setNewName('');
      setNewColor(PRESET_COLORS[0]);
      setShowNew(false);
      onChanged();
      toast.success(`Tag "${newName.trim()}" created.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteTag(pendingDelete.id);
      toast.success(`Tag "${pendingDelete.name}" deleted.`);
      setPendingDelete(null);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete tag.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveEdit(name: string, color: string) {
    if (!editingTag) return;
    setSaving(true);
    setError(null);
    try {
      await updateTag(editingTag.id, { name, color });
      setEditingTag(null);
      onChanged();
      toast.success('Tag updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tag.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Tags</h2>
        <button
          onClick={() => setShowNew(true)}
          className="text-xs text-brand-600 hover:underline"
        >
          + New tag
        </button>
      </div>

      <div className="px-5 py-3 space-y-2">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        {tags.length === 0 && !showNew && (
          <p className="text-sm text-gray-400 py-1">No tags yet. Create one to organize your documents.</p>
        )}

        {tags.map((tag) =>
          editingTag?.id === tag.id ? (
            <TagEditRow
              key={tag.id}
              tag={tag}
              saving={saving}
              onSave={handleSaveEdit}
              onCancel={() => setEditingTag(null)}
            />
          ) : (
            <div key={tag.id} className="flex items-center gap-3 py-1.5">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
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
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => setEditingTag(tag)}
                  className="text-xs text-gray-400 hover:text-brand-600 transition-colors px-2 py-1"
                >
                  Edit
                </button>
                <button
                  onClick={() => setPendingDelete(tag)}
                  className="text-xs text-gray-400 hover:text-red-600 transition-colors px-2 py-1"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )}

        {showNew && (
          <form onSubmit={handleCreate} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tag name"
              autoFocus
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="flex gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={cn(
                    'w-5 h-5 rounded-full transition-transform',
                    newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : '',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button type="submit" disabled={saving || !newName.trim()} className="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">
              {saving ? '…' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowNew(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </form>
        )}
      </div>

      {pendingDelete && (
        <ConfirmModal
          title="Delete tag"
          body={`"${pendingDelete.name}" will be removed from all documents.`}
          confirmLabel="Delete Tag"
          danger
          loading={deleting}
          onConfirm={confirmDelete}
          onClose={() => { if (!deleting) setPendingDelete(null); }}
        />
      )}
    </div>
  );
}

function TagEditRow({
  tag,
  saving,
  onSave,
  onCancel,
}: {
  tag: Tag;
  saving: boolean;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color ?? PRESET_COLORS[0]);

  return (
    <div className="flex items-center gap-2 py-1">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <div className="flex gap-1">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={cn(
              'w-5 h-5 rounded-full transition-transform',
              color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : '',
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <button
        type="button"
        disabled={saving || !name.trim()}
        onClick={() => onSave(name.trim(), color)}
        className="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
      >
        {saving ? '…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">
        Cancel
      </button>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-2xl animate-pulse">
      <div className="h-7 w-28 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-44 bg-gray-100 rounded mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-xl h-32" />
        ))}
      </div>
    </div>
  );
}
