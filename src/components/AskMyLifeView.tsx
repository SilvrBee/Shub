import { useState } from 'react';
import {
  BookOpen,
  Check,
  FileSearch,
  MessageSquareText,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  ActivityLog,
  AskLifeChatMessage,
  CommitmentItem,
  JournalConfig,
  JournalEntrySummary,
  NoteItem,
  PersonProfile,
  TaskItem,
  TimelineEvent,
  VaultItem,
} from '../types/dashboard';
import { ParsedJournalEntry } from '../services/journalDocsService';
import { askMyLifeWithFirebaseAI } from '../services/firebaseAiService';
import { GoogleSignInButton } from './GoogleSignInButton';

interface AskMyLifeViewProps {
  isSignedIn: boolean;
  hasWorkspaceToken: boolean;
  isSigningIn: boolean;
  journalConfig: JournalConfig;
  journalEntries: JournalEntrySummary[];
  rawDocEntries: ParsedJournalEntry[];
  isLoadingRawDoc: boolean;
  people: PersonProfile[];
  timelineEvents: TimelineEvent[];
  commitments: CommitmentItem[];
  activityLogs: ActivityLog[];
  vaultItems: VaultItem[];
  notes: NoteItem[];
  tasks: TaskItem[];
  onSignIn: () => void;
  onAcknowledgePrivacy: () => void;
  onLoadRawDocEntries: () => Promise<void>;
}

const STARTER_PROMPTS = [
  'What themes or patterns showed up most in my recent journal entries?',
  'What did I recently say I would do, and what is still pending?',
  'Which people have I mentioned most often lately, and what happened?',
  'What have I noticed about my sleep or spending recently?',
];

function makeMsgId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function AskMyLifeView({
  isSignedIn,
  hasWorkspaceToken,
  isSigningIn,
  journalConfig,
  journalEntries,
  rawDocEntries,
  isLoadingRawDoc,
  people,
  timelineEvents,
  commitments,
  activityLogs,
  vaultItems,
  notes,
  tasks,
  onSignIn,
  onAcknowledgePrivacy,
  onLoadRawDocEntries,
}: AskMyLifeViewProps) {
  const [messages, setMessages] = useState<AskLifeChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aiConsentGranted = Boolean(journalConfig.aiPrivacyAcknowledged);
  const approvedMilestonesCount = timelineEvents.filter((t) => t.status === 'approved').length;

  const handleAsk = async (questionText?: string) => {
    const trimmed = (questionText ?? input).trim();
    if (!trimmed || isThinking || !isSignedIn || !aiConsentGranted) return;

    setError(null);
    const userMsg: AskLifeChatMessage = {
      id: makeMsgId(),
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!questionText) setInput('');
    setIsThinking(true);

    try {
      const result = await askMyLifeWithFirebaseAI({
        question: trimmed,
        history: messages,
        journalEntries,
        rawDocEntries,
        people,
        timelineEvents,
        commitments,
        activityLogs,
        vaultItems,
        notes,
        tasks,
      });

      const assistantMsg: AskLifeChatMessage = {
        id: makeMsgId(),
        role: 'assistant',
        text: result.answer,
        structured: result,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to answer right now. Please try again.'
      );
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleAsk();
  };

  const kindLabel = (kind: string): string => {
    if (kind === 'journal') return 'Journal';
    if (kind === 'people') return 'People';
    if (kind === 'timeline') return 'Timeline';
    if (kind === 'commitment') return 'Commitment';
    if (kind === 'vault') return 'Vault';
    if (kind === 'log') return 'Log';
    return 'Record';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Ask My Life
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Private reflection chat grounded in your journal, People Directory, timeline, commitments &amp; Vault
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {hasWorkspaceToken && journalConfig.journalDocId && (
            <button
              type="button"
              onClick={() => void onLoadRawDocEntries()}
              disabled={isLoadingRawDoc}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>
                {isLoadingRawDoc
                  ? 'Loading Google Doc...'
                  : rawDocEntries.length > 0
                    ? `Google Doc Loaded (${rawDocEntries.length})`
                    : 'Load Full Google Doc'}
              </span>
            </button>
          )}

          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Searchable Scope Strip */}
      <section
        aria-label="Searchable Personal Context"
        className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 dark:text-slate-300"
      >
        <span className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Searchable Context:</span>
        </span>
        <span className="tabular-nums">{journalEntries.length} summaries</span>
        <span className="tabular-nums">
          {rawDocEntries.length} full doc {rawDocEntries.length === 1 ? 'entry' : 'entries'}
        </span>
        <span className="tabular-nums">{people.length} people</span>
        <span className="tabular-nums">{approvedMilestonesCount} milestones</span>
        <span className="tabular-nums">{commitments.length} commitments</span>
        <span className="tabular-nums">{activityLogs.length} logs</span>
        <span className="tabular-nums">{vaultItems.length} vault items</span>
      </section>

      {/* Sign-In Gate */}
      {!isSignedIn ? (
        <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-4">
          <MessageSquareText className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto" />
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Sign in to search your personal records
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Sign in with Google to load your private Firestore summaries, People Directory, Timeline, and Google Docs journal for Ask My Life.
            </p>
          </div>
          <div className="flex justify-center">
            <GoogleSignInButton
              onClick={onSignIn}
              disabled={isSigningIn}
              label={isSigningIn ? 'Signing in...' : 'Sign in with Google'}
            />
          </div>
        </section>
      ) : !aiConsentGranted ? (
        /* Free-Tier Privacy Consent Gate */
        <section
          aria-label="Gemini Free-Tier Privacy Notice"
          className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl p-6 space-y-3"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2 text-xs text-amber-950 dark:text-amber-100 leading-relaxed">
              <h2 className="font-display text-sm font-semibold">
                Review Gemini Free-Tier Privacy Before Using Ask My Life
              </h2>
              <p>
                Ask My Life sends relevant excerpts from your personal records to <strong>Firebase AI Logic</strong> using the <strong>Gemini Developer API free tier</strong> (₹0, no billing account linked).
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  On the unbilled free tier, Google may use submitted prompts, journal excerpts, and replies to improve its products and models, and anonymized samples may be reviewed by human reviewers.
                </li>
                <li>
                  Avoid asking about sensitive credentials or private identifiers you do not wish to share under free-tier terms.
                </li>
                <li>
                  Answers always distinguish stated facts from interpretations and cite matching dates and records.
                </li>
              </ul>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onAcknowledgePrivacy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>I understand free-tier data usage and enable Ask My Life</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Chat Container */
        <div className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col min-h-[480px]">
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="py-8 space-y-6">
                <div className="text-center max-w-lg mx-auto space-y-2">
                  <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto" />
                  <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                    Ask a question about your life &amp; writing
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Gemini searches your synced summaries, raw Google Doc entries (when loaded), people, milestones, commitments, logs, and Vault—separating stated facts from interpretations.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void handleAsk(prompt)}
                      className="text-left p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0F17] hover:border-blue-400 dark:hover:border-blue-500 text-xs text-slate-700 dark:text-slate-300 transition-colors leading-relaxed"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <div className="max-w-2xl rounded-xl px-4 py-3 bg-blue-600 text-white text-sm leading-relaxed">
                        {msg.text}
                      </div>
                    ) : (
                      <div className="w-full space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0B0F17] p-5">
                        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {msg.structured?.answer || msg.text}
                        </p>

                        {msg.structured &&
                          (msg.structured.facts.length > 0 ||
                            msg.structured.interpretations.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                              {msg.structured.facts.length > 0 && (
                                <div className="space-y-1.5">
                                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Observed Facts
                                  </h3>
                                  <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {msg.structured.facts.map((fact, idx) => (
                                      <li key={idx}>{fact}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {msg.structured.interpretations.length > 0 && (
                                <div className="space-y-1.5">
                                  <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                                    Interpretations &amp; Patterns
                                  </h3>
                                  <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {msg.structured.interpretations.map((interp, idx) => (
                                      <li key={idx}>{interp}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                        {msg.structured && msg.structured.references.length > 0 && (
                          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Referenced Entries &amp; Records
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {msg.structured.references.map((ref, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121927] px-3.5 py-2.5 space-y-1"
                                >
                                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                    <span className="font-medium text-blue-600 dark:text-blue-400">
                                      {kindLabel(ref.kind)}
                                    </span>
                                    <span className="font-mono tabular-nums">{ref.entryDate}</span>
                                  </div>
                                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                    {ref.heading}
                                  </p>
                                  {ref.excerpt && (
                                    <p className="text-xs italic text-slate-500 dark:text-slate-400 line-clamp-2">
                                      &ldquo;{ref.excerpt}&rdquo;
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {isThinking && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0B0F17] px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                    Searching your records and synthesizing a grounded response...
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isThinking}
              placeholder="Ask about a memory, person, commitment, sleep pattern, or theme..."
              aria-label="Ask My Life question"
              className="flex-1 px-4 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
            />
            <button
              type="submit"
              disabled={isThinking || !input.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
