import { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Calendar,
  ExternalLink,
  FileText,
  FolderOpen,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  fetchRecentDriveFiles,
  fetchRecentGmailMessages,
  fetchUpcomingCalendarEvents,
  GoogleCalendarEvent,
  GoogleDriveFile,
  GoogleGmailMessage,
  WorkspaceAuthError,
} from '../services/googleWorkspace';
import { ScheduleBlock, TaskCategory } from '../types/dashboard';
import { GoogleSignInButton } from './GoogleSignInButton';

interface WorkspaceViewProps {
  user: User | null;
  accessToken: string | null;
  isSigningIn: boolean;
  authError: string | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onTokenExpired: () => void;
  onImportCalendarEvent: (block: Omit<ScheduleBlock, 'id'>) => void;
}

function formatEventTime(iso: string, isAllDay: boolean): string {
  if (!iso) return '';
  if (isAllDay) return 'All day';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function formatShortTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '09:00';
  }
}

function formatModifiedDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function describeMimeType(mimeType: string): string {
  if (mimeType === 'application/vnd.google-apps.document') return 'Google Doc';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'Google Sheet';
  if (mimeType === 'application/vnd.google-apps.presentation') return 'Google Slides';
  if (mimeType === 'application/vnd.google-apps.folder') return 'Folder';
  if (mimeType === 'application/pdf') return 'PDF';
  return 'File';
}

export function WorkspaceView({
  user,
  accessToken,
  isSigningIn,
  authError,
  onSignIn,
  onSignOut,
  onTokenExpired,
  onImportCalendarEvent,
}: WorkspaceViewProps) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [messages, setMessages] = useState<GoogleGmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fileFilter, setFileFilter] = useState<'all' | 'docs'>('all');
  const [importedIds, setImportedIds] = useState<Record<string, boolean>>({});

  const loadWorkspaceData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setFetchError(null);

    try {
      const [calRes, driveRes, gmailRes] = await Promise.allSettled([
        fetchUpcomingCalendarEvents(accessToken),
        fetchRecentDriveFiles(accessToken),
        fetchRecentGmailMessages(accessToken),
      ]);

      const rejectedAuth = [calRes, driveRes, gmailRes].find(
        (r) => r.status === 'rejected' && r.reason instanceof WorkspaceAuthError
      );
      if (rejectedAuth) {
        onTokenExpired();
        setFetchError('Your session expired. Sign in again to refresh live Google Workspace data.');
        return;
      }

      if (calRes.status === 'fulfilled') setEvents(calRes.value);
      if (driveRes.status === 'fulfilled') setFiles(driveRes.value);
      if (gmailRes.status === 'fulfilled') setMessages(gmailRes.value);

      const errors = [calRes, driveRes, gmailRes]
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => (r.reason instanceof Error ? r.reason.message : 'Service unavailable'));

      if (errors.length === 3) {
        setFetchError(errors[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, onTokenExpired]);

  useEffect(() => {
    if (accessToken) {
      void loadWorkspaceData();
    } else {
      setEvents([]);
      setFiles([]);
      setMessages([]);
    }
  }, [accessToken, loadWorkspaceData]);

  const handleImportEvent = (event: GoogleCalendarEvent) => {
    const startTime = event.isAllDay ? '09:00' : formatShortTime(event.start);
    const endTime = event.isAllDay ? '10:00' : formatShortTime(event.end);
    onImportCalendarEvent({
      title: event.summary,
      startTime,
      endTime: endTime > startTime ? endTime : '23:59',
      category: TaskCategory.Work,
      location: event.location || 'Google Calendar',
    });
    setImportedIds((prev) => ({ ...prev, [event.id]: true }));
  };

  const displayedFiles =
    fileFilter === 'docs' ? files.filter((f) => f.isGoogleDoc) : files;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Google Apps
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {user
              ? `Signed in as ${user.displayName || user.email || 'Google Account'}`
              : 'Connect your Google account to sync your name, Calendar, Drive, Docs, and Gmail'}
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {accessToken && (
              <button
                type="button"
                onClick={() => void loadWorkspaceData()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>

      {/* Authentication / Session Refresh Banner */}
      {(!user || !accessToken) && (
        <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              {user
                ? 'Reconnect to load live Google Workspace data'
                : 'Sign in with your Google Account'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {user
                ? `Welcome back, ${user.displayName || user.email}. For your security, live access to Google Calendar, Drive, Docs, and Gmail is held in memory only and resets on page reload.`
                : 'Connecting your Google account personalizes your dashboard with your name and profile photo while granting read-only access to Google Calendar, Drive, Docs, and Gmail.'}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span>Google Calendar</span>
              <span aria-hidden="true">·</span>
              <span>Google Drive</span>
              <span aria-hidden="true">·</span>
              <span>Google Docs</span>
              <span aria-hidden="true">·</span>
              <span>Gmail</span>
            </div>
            {authError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 pt-1">{authError}</p>
            )}
          </div>

          <div className="shrink-0">
            <GoogleSignInButton
              onClick={() => void onSignIn()}
              disabled={isSigningIn}
              label={
                isSigningIn
                  ? 'Connecting...'
                  : user
                    ? 'Reconnect Google Apps'
                    : 'Sign in with Google'
              }
            />
          </div>
        </section>
      )}

      {fetchError && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 px-5 py-3.5 text-xs text-rose-700 dark:text-rose-300">
          {fetchError}
        </div>
      )}

      {/* Live Google Workspace Grid */}
      {accessToken && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Google Calendar */}
          <section className="lg:col-span-6 bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Google Calendar
                </h2>
              </div>
              <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                {events.length} upcoming
              </span>
            </div>

            {loading && events.length === 0 ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-11 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No upcoming events found on your primary calendar.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {events.map((event) => (
                  <li key={event.id} className="px-6 py-3.5 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {event.summary}
                      </p>
                      <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatEventTime(event.start, event.isAllDay)}
                        {event.location ? ` · ${event.location}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleImportEvent(event)}
                      disabled={importedIds[event.id]}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:text-emerald-600 dark:disabled:text-emerald-400 disabled:hover:bg-transparent transition-colors whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{importedIds[event.id] ? 'Added' : 'To Schedule'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Google Drive & Docs */}
          <section className="lg:col-span-6 bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Drive &amp; Docs
                </h2>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFileFilter('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    fileFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  All Drive
                </button>
                <button
                  type="button"
                  onClick={() => setFileFilter('docs')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    fileFilter === 'docs'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Google Docs
                </button>
              </div>
            </div>

            {loading && files.length === 0 ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-11 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
                ))}
              </div>
            ) : displayedFiles.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                {fileFilter === 'docs'
                  ? 'No recent Google Docs files found.'
                  : 'No recent Google Drive files found.'}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {displayedFiles.slice(0, 6).map((file) => (
                  <li key={file.id} className="px-6 py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {describeMimeType(file.mimeType)}
                          {file.modifiedTime ? ` · Modified ${formatModifiedDate(file.modifiedTime)}` : ''}
                        </p>
                      </div>
                    </div>
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open "${file.name}" in Google Drive`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Gmail Inbox Preview */}
          <section className="lg:col-span-12 bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Recent Gmail Messages
                </h2>
              </div>
              <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                Inbox preview
              </span>
            </div>

            {loading && messages.length === 0 ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No recent messages found in your inbox.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {messages.map((msg) => (
                  <li key={msg.id} className="px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {msg.subject}
                      </p>
                      <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 truncate max-w-xs">
                        {msg.from}
                      </span>
                    </div>
                    {msg.snippet && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        {msg.snippet}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
