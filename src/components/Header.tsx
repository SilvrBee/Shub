import { useRef, useState } from 'react';
import { Bell, CheckCheck, Clock, Menu, Trash2 } from 'lucide-react';
import { DashboardView, ReminderRecord } from '../types/dashboard';
import { PortalPopover } from './ui/PortalPopover';
import { PriorityFlagDisplay } from './PriorityFlag';
import { formatShortDateLabel, formatTimeShort } from '../utils/taskUtils';

interface HeaderProps {
  activeView: DashboardView;
  onOpenMobileNav: () => void;
  reminders: ReminderRecord[];
  unreadCount: number;
  timeFormat: '12h' | '24h';
  onOpenReminderTask: (reminder: ReminderRecord) => void;
  onMarkAllRemindersRead: () => void;
  onDismissReminder: (triggerKey: string) => void;
  onClearAllReminders: () => void;
}

const VIEW_LABELS: Record<DashboardView, string> = {
  [DashboardView.Overview]: 'Overview',
  [DashboardView.Tasks]: 'Tasks',
  [DashboardView.Schedule]: 'Schedule',
  [DashboardView.Focus]: 'Focus',
  [DashboardView.Habits]: 'Habits',
  [DashboardView.Notes]: 'Notes',
  [DashboardView.GoogleWorkspace]: 'Google Apps',
  [DashboardView.Settings]: 'Settings',
};

export function Header({
  activeView,
  onOpenMobileNav,
  reminders,
  unreadCount,
  timeFormat,
  onOpenReminderTask,
  onMarkAllRemindersRead,
  onDismissReminder,
  onClearAllReminders,
}: HeaderProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement | null>(null);

  const missedCount = reminders.filter((r) => r.status === 'missed').length;
  const sortedReminders = [...reminders].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    if (a.status !== b.status) return a.status === 'missed' ? -1 : 1;
    return b.triggerAtMs - a.triggerAtMs;
  });

  return (
    <header className="cadence-header sticky top-0 z-30 h-16 bg-white/95 dark:bg-[#0F1521]/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between gap-8">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0 whitespace-nowrap">
          <span className="text-slate-400 dark:text-slate-500">Workspace</span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
            /
          </span>
          <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
            {VIEW_LABELS[activeView]}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          ref={bellRef}
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={panelOpen}
          aria-label={
            unreadCount > 0
              ? `Reminders (${unreadCount} unread${missedCount > 0 ? `, ${missedCount} missed` : ''})`
              : 'Reminders'
          }
          className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-mono font-semibold flex items-center justify-center leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <PortalPopover
          open={panelOpen}
          anchorEl={bellRef.current}
          onClose={() => setPanelOpen(false)}
          align="end"
          minWidth={320}
          maxWidth={380}
          maxHeight={420}
          role="dialog"
          ariaLabel="Missed and recent reminders"
        >
          <div className="flex flex-col max-h-[400px]">
            <div
              className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0"
              style={{ borderColor: 'var(--cadence-border-subtle)' }}
            >
              <div>
                <h2 className="text-xs font-semibold">
                  {missedCount > 0 ? 'Missed & Recent Reminders' : 'Reminders'}
                </h2>
                <p
                  className="text-[11px]"
                  style={{ color: 'var(--cadence-popover-muted)' }}
                >
                  {unreadCount > 0
                    ? `${unreadCount} unread${missedCount > 0 ? ` · ${missedCount} missed while away` : ''}`
                    : 'All caught up'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRemindersRead}
                    title="Mark all read"
                    aria-label="Mark all reminders read"
                    className="cadence-popover-item p-1.5 rounded text-blue-600 dark:text-blue-400"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                {reminders.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAllReminders}
                    title="Clear all reminders"
                    aria-label="Clear all reminders"
                    className="cadence-popover-item p-1.5 rounded text-slate-500 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {sortedReminders.length === 0 ? (
              <div
                className="px-4 py-8 text-center text-xs"
                style={{ color: 'var(--cadence-popover-muted)' }}
              >
                No missed or recent task reminders.
              </div>
            ) : (
              <ul className="overflow-y-auto divide-y divide-slate-200/50 dark:divide-slate-700/50">
                {sortedReminders.map((rem) => {
                  const whenLabel = rem.targetDate
                    ? `${formatShortDateLabel(rem.targetDate)}${
                        rem.targetTime ? ` ${formatTimeShort(rem.targetTime, timeFormat)}` : ''
                      }`
                    : '';
                  return (
                    <li
                      key={rem.triggerKey}
                      className={`px-3.5 py-2.5 flex items-start gap-2.5 ${
                        !rem.read ? 'bg-blue-500/5' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setPanelOpen(false);
                          onOpenReminderTask(rem);
                        }}
                        className="min-w-0 flex-1 text-left group"
                      >
                        <div className="flex items-center gap-1.5">
                          {!rem.read && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"
                              aria-label="Unread"
                            />
                          )}
                          {rem.status === 'missed' && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                              Missed
                            </span>
                          )}
                          <span className="text-xs font-medium truncate group-hover:underline">
                            {rem.taskTitle}
                          </span>
                        </div>
                        <div
                          className="flex flex-wrap items-center gap-2 mt-1 text-[11px]"
                          style={{ color: 'var(--cadence-popover-muted)' }}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" aria-hidden="true" />
                            {rem.subtitle}
                          </span>
                          {whenLabel && <span className="font-mono">{whenLabel}</span>}
                          <PriorityFlagDisplay priority={rem.priority} compact />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDismissReminder(rem.triggerKey)}
                        aria-label={`Dismiss reminder for "${rem.taskTitle}"`}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </PortalPopover>
      </div>
    </header>
  );
}
