import { useState } from 'react';
import {
  Check,
  Clock,
  ExternalLink,
  FileSearch,
  History,
  Pencil,
  RefreshCw,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import {
  ActivityLog,
  JournalConfig,
  JournalEntrySummary,
  ReviewSuggestion,
} from '../types/dashboard';
import { GoogleSignInButton } from './GoogleSignInButton';
import { ParsedJournalEntry } from '../services/journalDocsService';
import { isAppCheckConfigured } from '../services/googleAuth';

interface JournalViewProps {
  isSignedIn: boolean;
  hasWorkspaceToken: boolean;
  isSigningIn: boolean;
  journalConfig: JournalConfig;
  entries: JournalEntrySummary[];
  suggestions: ReviewSuggestion[];
  activityLogs: ActivityLog[];
  syncStatusMessage: string | null;
  syncError: string | null;
  isSyncing: boolean;
  isRunningHistorical: boolean;
  historicalProgress: string | null;
  modifiedEntryPrompt: ParsedJournalEntry | null;
  onSignIn: () => void;
  onSelectJournalDoc: () => void;
  onSyncJournal: (forceReprocess?: boolean) => void;
  onRunHistoricalBatch: () => void;
  onDismissModifiedPrompt: () => void;
  onUpdateJournalConfig: (patch: Partial<JournalConfig>) => void;
  onConfirmSuggestion: (
    suggestion: ReviewSuggestion,
    edited?: { title: string; proposedValue: string; amount?: number; category?: string }
  ) => void;
  onDismissSuggestion: (suggestionId: string) => void;
  onDeleteActivityLog: (logId: string) => void;
  onDeleteAllJournalData: () => void;
  onDisconnectGoogle: () => void;
}



function formatDateTime(iso?: string): string {
  if (!iso) return 'Never';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function JournalView({
  isSignedIn,
  hasWorkspaceToken,
  isSigningIn,
  journalConfig,
  entries,
  suggestions,
  activityLogs,
  syncStatusMessage,
  syncError,
  isSyncing,
  isRunningHistorical,
  historicalProgress,
  modifiedEntryPrompt,
  onSignIn,
  onSelectJournalDoc,
  onSyncJournal,
  onRunHistoricalBatch,
  onDismissModifiedPrompt,
  onUpdateJournalConfig,
  onConfirmSuggestion,
  onDismissSuggestion,
  onDeleteActivityLog,
  onDeleteAllJournalData,
  onDisconnectGoogle,
}: JournalViewProps) {
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending');
  const sortedEntries = [...entries].sort((a, b) => b.entryDate.localeCompare(a.entryDate));
  const sortedLogs = [...activityLogs].sort((a, b) => b.entryDate.localeCompare(a.entryDate));

  const startEditSuggestion = (item: ReviewSuggestion) => {
    setEditingSuggestionId(item.id);
    setEditTitle(item.title);
    setEditValue(item.proposedValue);
    setEditAmount(typeof item.amount === 'number' ? String(item.amount) : '');
    setEditCategory(item.category || '');
  };

  const handleSaveEditedSuggestion = (item: ReviewSuggestion) => {
    const parsedNum = editAmount.trim() ? Number(editAmount) : undefined;
    onConfirmSuggestion(item, {
      title: editTitle.trim() || item.title,
      proposedValue: editValue.trim() || item.proposedValue,
      amount: Number.isFinite(parsedNum) ? parsedNum : item.amount,
      category: editCategory.trim() || item.category,
    });
    setEditingSuggestionId(null);
  };

  const kindLabel = (kind: ReviewSuggestion['kind']) => {
    if (kind === 'sleep') return 'Sleep & Rest';
    if (kind === 'spending') return 'Spending';
    if (kind === 'vault_link') return 'Vault Link';
    if (kind === 'vault_song') return 'Vault Song';
    return 'Vault Note';
  };

  const aiConsentGranted = Boolean(journalConfig.aiPrivacyAcknowledged);

  return (
    <div className="space-y-6">
      {/* Header + Sync Journal CTA */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Journal Intelligence
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Read-only reflection &amp; memory extraction from your Google Docs journal
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {hasWorkspaceToken && journalConfig.journalDocId && (
            <>
              <button
                type="button"
                onClick={onRunHistoricalBatch}
                disabled={!aiConsentGranted || isSyncing || isRunningHistorical}
                title={
                  aiConsentGranted
                    ? 'Process a small batch of older entries'
                    : 'Acknowledge the Gemini free-tier privacy notice below first'
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <History className="w-3.5 h-3.5" />
                <span>{isRunningHistorical ? 'Analyzing...' : 'Analyze Older Entries'}</span>
              </button>

              <button
                type="button"
                onClick={() => onSyncJournal(false)}
                disabled={!aiConsentGranted || isSyncing || isRunningHistorical}
                title={
                  aiConsentGranted
                    ? 'Sync latest journal entry'
                    : 'Acknowledge the Gemini free-tier privacy notice below first'
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Journal'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Gemini Free-Tier Data Usage & Privacy Consent Gate */}
      {isSignedIn && !aiConsentGranted && (
        <section
          aria-label="Gemini Free-Tier Privacy Notice"
          className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl p-6 space-y-3"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2 text-xs text-amber-950 dark:text-amber-100 leading-relaxed">
              <h2 className="font-display text-sm font-semibold">
                Gemini Free-Tier Privacy &amp; Data Usage Notice
              </h2>
              <p>
                To keep Cadence strictly <strong>₹0 on the Firebase Spark plan</strong> (with no billing account or credit card), journal analysis and Ask My Life run via <strong>Firebase AI Logic</strong> using the <strong>Gemini Developer API free tier</strong>.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  On the unbilled Gemini Developer API free tier, Google may use submitted prompts, journal text, and model responses to improve its products and models, and anonymized samples may be reviewed by human reviewers.
                </li>
                <li>
                  Do not sync entries containing sensitive credentials, private medical/financial identifiers, or anything you prefer not to send under free-tier terms.
                </li>
                <li>
                  Your historical journal is <strong>never processed automatically</strong>—only the single latest entry is analyzed when you click Sync Journal (or open the app if Auto-Sync on Open is enabled).
                </li>
              </ul>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onUpdateJournalConfig({ aiPrivacyAcknowledged: true })}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>I understand free-tier data usage and enable Gemini analysis</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Google Connection & Selected Document Card */}
      <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Google Docs Source
            </h2>
            {journalConfig.journalDocId ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium">{journalConfig.journalDocName || 'Selected Journal'}</span>
                {journalConfig.journalDocUrl && (
                  <a
                    href={journalConfig.journalDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>Open in Docs</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Choose the specific Google Docs document you write in. Only that file is ever read—never modified.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!isSignedIn || !hasWorkspaceToken ? (
              <GoogleSignInButton
                onClick={onSignIn}
                disabled={isSigningIn}
                label={
                  isSigningIn
                    ? 'Connecting...'
                    : isSignedIn
                      ? 'Reconnect Google Docs'
                      : 'Sign in with Google'
                }
              />
            ) : (
              <button
                type="button"
                onClick={onSelectJournalDoc}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <FileSearch className="w-3.5 h-3.5" />
                <span>{journalConfig.journalDocId ? 'Change Document' : 'Select Journal Doc'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Sync Metadata & Status */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Last Synced</span>
            <p className="font-mono tabular-nums text-slate-800 dark:text-slate-200 mt-0.5">
              {formatDateTime(journalConfig.lastSyncedAt)}
            </p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Last Processed Entry</span>
            <p className="font-mono tabular-nums text-slate-800 dark:text-slate-200 mt-0.5">
              {journalConfig.lastProcessedEntryDate || 'None yet'}
            </p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Entry Fingerprint</span>
            <p className="font-mono tabular-nums text-slate-800 dark:text-slate-200 mt-0.5 truncate">
              {journalConfig.lastProcessedEntryHash
                ? `${journalConfig.lastProcessedEntryHash.slice(0, 14)}…`
                : '—'}
            </p>
          </div>
        </div>

        {(syncStatusMessage || historicalProgress) && (
          <div className="rounded-lg bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
            {historicalProgress || syncStatusMessage}
          </div>
        )}

        {(syncError || journalConfig.lastSyncError) && (
          <div className="rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
            {syncError || journalConfig.lastSyncError}
          </div>
        )}

        {modifiedEntryPrompt && (
          <div className="rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <p className="font-medium">
                Your entry for {modifiedEntryPrompt.entryDate} ({modifiedEntryPrompt.heading}) changed in Google Docs since the last sync.
              </p>
              <p className="mt-0.5 opacity-90">
                Would you like to reprocess this entry with Gemini without duplicating already-saved items?
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onDismissModifiedPrompt}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => onSyncJournal(true)}
                disabled={!aiConsentGranted || isSyncing}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 transition-colors"
              >
                Reprocess Entry
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Confirmation Review Inbox */}
      <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Review Inbox
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Confirm, edit, or dismiss details Gemini noticed in your writing before saving to logs
            </p>
          </div>
          <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
            {pendingSuggestions.length} pending
          </span>
        </div>

        {pendingSuggestions.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No pending suggestions. Sync a journal entry to review extracted sleep, spending, or Vault highlights.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {pendingSuggestions.map((item) => {
              const isEditing = editingSuggestionId === item.id;
              return (
                <li key={item.id} className="px-6 py-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {kindLabel(item.kind)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{item.entryDate}</span>
                        {item.category && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{item.category}</span>
                          </>
                        )}
                      </div>

                      {!isEditing ? (
                        <>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {item.title}
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            {item.proposedValue}
                            {typeof item.amount === 'number'
                              ? ` (${item.currency || 'USD'} ${item.amount})`
                              : ''}
                          </p>
                        </>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Title"
                            className="px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                          />
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Proposed value"
                            className="px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                          />
                          {item.kind === 'spending' && (
                            <input
                              type="number"
                              step="0.01"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              placeholder="Amount"
                              className="px-3 py-1.5 rounded-lg text-sm font-mono bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                            />
                          )}
                          <input
                            type="text"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            placeholder="Category"
                            className="px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                          />
                        </div>
                      )}

                      <p className="text-xs italic text-slate-500 dark:text-slate-400 pt-1">
                        &ldquo;{item.excerpt}&rdquo;
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onConfirmSuggestion(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditSuggestion(item)}
                            aria-label="Edit suggestion"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDismissSuggestion(item.id)}
                            aria-label="Dismiss suggestion"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveEditedSuggestion(item)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
                          >
                            Save &amp; Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSuggestionId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Two-Column: Daily Summaries + Confirmed Sleep & Spending Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Daily Summaries */}
        <section className="lg:col-span-7 bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Journal Reflections
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Personal summaries derived from your entries
            </p>
          </div>

          {sortedEntries.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No journal summaries yet. Connect your Google Doc and click Sync Journal.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {sortedEntries.map((entry) => (
                <li key={entry.id} className="px-6 py-5 space-y-2.5">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {entry.heading}
                    </h3>
                    <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400 shrink-0">
                      {entry.entryDate}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {entry.summary}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {entry.themes.length > 0 && (
                      <span>Themes: {entry.themes.join(' · ')}</span>
                    )}
                    {entry.mentionedPeople.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>People: {entry.mentionedPeople.join(', ')}</span>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Confirmed Sleep & Spending Logs + Auto-Sync Settings */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Confirmed Sleep &amp; Spending Logs
              </h2>
            </div>

            {sortedLogs.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                Confirmed sleep patterns and expenses appear here.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {sortedLogs.slice(0, 12).map((log) => (
                  <li key={log.id} className="px-6 py-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {log.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {log.value}
                        {typeof log.amount === 'number'
                          ? ` · ${log.currency || 'USD'} ${log.amount}`
                          : ''}
                      </p>
                      <p className="text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500 mt-0.5">
                        {log.kind === 'sleep' ? 'Sleep' : 'Spending'} · {log.entryDate}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteActivityLog(log.id)}
                      aria-label={`Remove log "${log.title}"`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Automatic Sync on Open (Zero-Billing Spark Architecture) */}
          <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Sync on Open</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Automatically check and sync only your single latest journal entry when you open Cadence with Google connected.
                </p>
              </div>
              <label className="inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={Boolean(journalConfig.autoSyncOnOpen)}
                  onChange={(e) =>
                    onUpdateJournalConfig({ autoSyncOnOpen: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <span className="ml-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  Enabled
                </span>
              </label>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800/80">
              Background sync while your browser is closed is paused to stay strictly ₹0 on the Firebase Spark plan (no paid Cloud Functions or external workers). Historical entries are never processed automatically.
            </p>
          </section>

          {/* Privacy & Data Management */}
          <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Privacy &amp; Data Controls
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Your original Google Doc is never altered. Gemini analysis runs on the free-tier Gemini Developer API via Firebase AI Logic; you can pause consent or delete all generated Firestore summaries anytime.
            </p>
            {!isAppCheckConfigured && (
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                App Check is not yet active—add a free reCAPTCHA Enterprise Essentials site key in Firebase Console → App Check and <code className="font-mono">firebase-applet-config.json</code> before enforcing App Check.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {aiConsentGranted && (
                <button
                  type="button"
                  onClick={() => onUpdateJournalConfig({ aiPrivacyAcknowledged: false })}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Pause Gemini Analysis
                </button>
              )}
              {isSignedIn && (
                <button
                  type="button"
                  onClick={onDisconnectGoogle}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Disconnect Google
                </button>
              )}
              {!confirmResetOpen ? (
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(true)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  Delete Generated Journal Data
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteAllJournalData();
                      setConfirmResetOpen(false);
                    }}
                    className="px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 transition-colors"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(false)}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
