import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let sharedDeferredPrompt: BeforeInstallPromptEvent | null = null;
let sharedIsInstalled = false;
let initialized = false;
const listeners = new Set<() => void>();

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isClassicIOS = /iphone|ipad|ipod/.test(ua);
  const isIPadOS =
    window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  return isClassicIOS || isIPadOS;
}

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function ensureGlobalListeners() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  sharedIsInstalled = detectStandalone();

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    sharedDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    sharedIsInstalled = true;
    sharedDeferredPrompt = null;
    notifyListeners();
  });

  const mq = window.matchMedia?.('(display-mode: standalone)');
  mq?.addEventListener?.('change', () => {
    sharedIsInstalled = detectStandalone();
    if (sharedIsInstalled) {
      sharedDeferredPrompt = null;
    }
    notifyListeners();
  });
}

export function usePWAInstall() {
  ensureGlobalListeners();

  const [, setVersion] = useState(0);
  const [isIOS] = useState<boolean>(detectIOS);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    listeners.add(bump);
    // Sync standalone state in case it changed before mount
    const currentStandalone = detectStandalone();
    if (currentStandalone !== sharedIsInstalled) {
      sharedIsInstalled = currentStandalone;
      bump();
    }
    return () => {
      listeners.delete(bump);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!sharedDeferredPrompt) return false;
    try {
      await sharedDeferredPrompt.prompt();
      const { outcome } = await sharedDeferredPrompt.userChoice;
      if (outcome === 'accepted') {
        sharedIsInstalled = true;
        sharedDeferredPrompt = null;
        notifyListeners();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return {
    isInstallable: Boolean(sharedDeferredPrompt) && !sharedIsInstalled,
    isInstalled: sharedIsInstalled,
    isIOS,
    install,
  };
}
