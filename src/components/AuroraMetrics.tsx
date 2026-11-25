import { useEffect, useId, useRef, useState } from 'react';

interface AnimatedMetricValueProps {
  value: number;
  decimals?: number;
  suffix?: string;
  animate: boolean;
}

export function AnimatedMetricValue({
  value,
  decimals = 0,
  suffix = '',
  animate,
}: AnimatedMetricValueProps) {
  const [displayValue, setDisplayValue] = useState<number>(() => (animate ? 0 : value));
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      return;
    }

    const from = hasAnimatedRef.current ? displayValue : 0;
    hasAnimatedRef.current = true;
    const duration = 680;
    let rafId = 0;
    let startTime: number | null = null;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayValue(from + (value - from) * eased);
      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        setDisplayValue(value);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
    // Intentionally omit displayValue from dependencies so updates animate smoothly from prior value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, animate]);

  const formatted =
    decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toString();

  return (
    <>
      {formatted}
      {suffix}
    </>
  );
}

interface AuroraProgressRingProps {
  progress: number; // 0 to 1
  animate: boolean;
  label?: string;
}

export function AuroraProgressRing({
  progress,
  animate,
  label,
}: AuroraProgressRingProps) {
  const gradientId = useId();
  const clamped = Math.max(0, Math.min(1, progress));
  const [currentProgress, setCurrentProgress] = useState<number>(() =>
    animate ? 0 : clamped
  );

  useEffect(() => {
    if (!animate) {
      setCurrentProgress(clamped);
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      setCurrentProgress(clamped);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [clamped, animate]);

  const size = 42;
  const strokeWidth = 3.25;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - currentProgress);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className="shrink-0 -rotate-90"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'var(--color-blue-300)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--color-blue-500)' }} />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(148, 163, 184, 0.18)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{
          transition: animate ? 'stroke-dashoffset 760ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
        }}
      />
    </svg>
  );
}
