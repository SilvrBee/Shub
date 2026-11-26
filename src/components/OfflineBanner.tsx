import { CheckCircle2, RefreshCw, WifiOff, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useServiceWorkerStatus } from '../hooks/useServiceWorkerStatus';

interface OfflineBannerProps {
  isCloudSignedIn: boolean;
}

export function OfflineBanner({ isCloudSignedIn }: OfflineBannerProps) {
  const isOnline = useOnlineStatus();
  const {
    offlineReady,
    needRefresh,
    applyUpdate,
    dismissOfflineReady,
    dismissNeedRefresh,
  } = useServiceWorkerStatus();

  if (isOnline && !offlineReady && !needRefresh) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 left-4 z-40 flex flex-col gap-2 max-w-xs w-[calc(100vw-2rem)] pointer-events-none"
    >
      {!isOnline && (
        <div
          role="status"
          className="pointer-events-auto cadence-card editorial-preserve-pad flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/90 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 shadow-lg text-xs font-medium"
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            {isCloudSignedIn
              ? 'Offline Mode — Cached data active; edits sync on reconnect.'
              : 'Offline Mode — Changes are saved locally.'}
          </span>
        </div>
      )}

      {needRefresh && (
        <div
          role="status"
          className="pointer-events-auto cadence-card editorial-preserve-pad flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-lg text-xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="truncate font-medium">Update ready</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void applyUpdate()}
              className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={dismissNeedRefresh}
              aria-label="Dismiss update notification"
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {offlineReady && isOnline && !needRefresh && (
        <div
          role="status"
          className="pointer-events-auto cadence-card editorial-preserve-pad flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-lg text-xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate font-medium">Ready for offline use</span>
          </div>
          <button
            type="button"
            onClick={dismissOfflineReady}
            aria-label="Dismiss offline ready notification"
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
