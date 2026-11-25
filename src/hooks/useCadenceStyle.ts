import { useEffect, useState } from 'react';
import { AppStyleId } from '../types/dashboard';
import { VALID_STYLES } from '../styles/stylesConfig';

function readDomStyle(): AppStyleId {
  if (typeof document === 'undefined') return 'classic';
  const raw = document.documentElement.getAttribute('data-style');
  if (raw && VALID_STYLES.has(raw)) {
    return raw as AppStyleId;
  }
  return 'classic';
}

export function useCadenceStyle(): AppStyleId {
  const [style, setStyle] = useState<AppStyleId>(readDomStyle);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setStyle(readDomStyle());

    const observer = new MutationObserver(() => {
      setStyle(readDomStyle());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-style'],
    });
    return () => observer.disconnect();
  }, []);

  return style;
}

export function useDoodleCelebratePulse(durationMs = 1800): boolean {
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let timer: number | null = null;
    const handleCelebrate = () => {
      setCelebrating(true);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setCelebrating(false), durationMs);
    };
    window.addEventListener('cadence:doodle-celebrate', handleCelebrate);
    return () => {
      window.removeEventListener('cadence:doodle-celebrate', handleCelebrate);
      if (timer) window.clearTimeout(timer);
    };
  }, [durationMs]);

  return celebrating;
}
