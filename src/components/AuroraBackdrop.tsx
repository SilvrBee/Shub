import { useEffect, useState } from 'react';

type TimeOfDay = 'dawn' | 'noon' | 'dusk' | 'night';

function getTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) return 'dawn';
  if (hour >= 10 && hour < 17) return 'noon';
  if (hour >= 17 && hour < 21) return 'dusk';
  return 'night';
}

interface AuroraBackdropProps {
  reducedMotion?: boolean;
}

export function AuroraBackdrop({ reducedMotion = false }: AuroraBackdropProps) {
  const [tod, setTod] = useState<TimeOfDay>(() => getTimeOfDay(new Date()));
  const [tabHidden, setTabHidden] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.hidden : false
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTod(getTimeOfDay(new Date()));
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      setTabHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <div
      aria-hidden="true"
      data-tod={tod}
      data-paused={tabHidden || reducedMotion ? 'true' : 'false'}
      className="aurora-backdrop"
    >
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-blob aurora-blob-4" />
      <div className="aurora-grain" />
    </div>
  );
}
