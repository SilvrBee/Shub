import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

let swOfflineReady = false;
let swNeedRefresh = false;
let swUpdateFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
let swRegistered = false;
const swListeners = new Set<() => void>();

function notifySW() {
  for (const fn of swListeners) fn();
}

function initServiceWorker() {
  if (swRegistered || typeof window === 'undefined') return;
  swRegistered = true;

  try {
    swUpdateFn = registerSW({
      immediate: true,
      onNeedRefresh() {
        swNeedRefresh = true;
        notifySW();
      },
      onOfflineReady() {
        swOfflineReady = true;
        notifySW();
      },
    });
  } catch {
    // Ignore registration errors in unsupported environments
  }
}

export function useServiceWorkerStatus() {
  initServiceWorker();

  const [, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    swListeners.add(bump);
    return () => {
      swListeners.delete(bump);
    };
  }, []);

  const applyUpdate = async () => {
    swNeedRefresh = false;
    notifySW();
    if (swUpdateFn) {
      await swUpdateFn(true);
    }
  };

  const dismissOfflineReady = () => {
    swOfflineReady = false;
    notifySW();
  };

  const dismissNeedRefresh = () => {
    swNeedRefresh = false;
    notifySW();
  };

  return {
    offlineReady: swOfflineReady,
    needRefresh: swNeedRefresh,
    applyUpdate,
    dismissOfflineReady,
    dismissNeedRefresh,
  };
}
