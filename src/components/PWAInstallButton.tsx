import { useEffect, useState } from 'react';
import { CheckCircle2, Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'sidebar' | 'settings';
  compact?: boolean;
}

export function PWAInstallButton({ variant = 'sidebar', compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (!showIOSGuide) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowIOSGuide(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showIOSGuide]);

  const iosModal = showIOSGuide ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-guide-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) setShowIOSGuide(false);
      }}
    >
      <div className="cadence-card editorial-modal editorial-preserve-pad w-full max-w-sm rounded-xl bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <h3
              id="ios-install-guide-title"
              className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Install Cadence on iOS
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowIOSGuide(false)}
            aria-label="Close installation guide"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ol className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex items-start gap-2.5">
            <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
              1.
            </span>
            <span>
              Tap the <strong className="text-slate-900 dark:text-slate-100 inline-flex items-center gap-1">Share <Share className="w-3.5 h-3.5 inline" /></strong> button in the Safari toolbar.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
              2.
            </span>
            <span>
              Scroll down and tap <strong className="text-slate-900 dark:text-slate-100">Add to Home Screen</strong>.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
              3.
            </span>
            <span>Tap <strong className="text-slate-900 dark:text-slate-100">Add</strong> to launch Cadence offline as a standalone app.</span>
          </li>
        </ol>

        <button
          type="button"
          onClick={() => setShowIOSGuide(false)}
          className="w-full py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  ) : null;

  if (variant === 'settings') {
    if (isInstalled) {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Installed as App</span>
        </div>
      );
    }

    if (isInstallable) {
      return (
        <button
          type="button"
          onClick={() => void install()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install Cadence App</span>
        </button>
      );
    }

    if (isIOS) {
      return (
        <>
          <button
            type="button"
            onClick={() => setShowIOSGuide(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Install on iOS</span>
          </button>
          {iosModal}
        </>
      );
    }

    return (
      <span className="text-xs text-slate-500 dark:text-slate-400">
        Use your browser&apos;s address bar or menu (&ldquo;Install Cadence&rdquo;) to add as a desktop/mobile app.
      </span>
    );
  }

  // Sidebar variant: automatically hides when already running in standalone mode
  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        title={compact ? 'Install App' : undefined}
        aria-label="Install App"
        className={`w-full flex items-center justify-center gap-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer ${
          compact ? 'p-2' : 'px-3 py-2'
        }`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        {!compact && <span>Install App</span>}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title={compact ? 'Install on iOS' : undefined}
          aria-label="Install on iOS"
          className={`w-full flex items-center justify-center gap-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
            compact ? 'p-2' : 'px-3 py-2'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          {!compact && <span>Install on iOS</span>}
        </button>
        {iosModal}
      </>
    );
  }

  return null;
}
