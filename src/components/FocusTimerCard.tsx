import { useEffect, useRef, useState } from 'react';
import { Check, Pause, Play, RotateCcw } from 'lucide-react';
import { AppStyleId } from '../types/dashboard';

interface FocusTimerCardProps {
  onCompleteSession: (minutes: number, label: string) => void;
  compact?: boolean;
  defaultMinutes?: 15 | 25 | 50;
  defaultLabel?: string;
  style?: AppStyleId;
  reducedMotion?: boolean;
}

const PRESETS = [
  { label: '25m', minutes: 25 },
  { label: '50m', minutes: 50 },
  { label: '15m', minutes: 15 },
];

export function FocusTimerCard({
  onCompleteSession,
  compact = false,
  defaultMinutes = 25,
  defaultLabel = 'Deep work sprint',
  style = 'classic',
  reducedMotion = false,
}: FocusTimerCardProps) {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(defaultMinutes);
  const [secondsLeft, setSecondsLeft] = useState<number>(defaultMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionLabel, setSessionLabel] = useState(defaultLabel);
  const [justFinished, setJustFinished] = useState(false);
  const completedRef = useRef(false);
  const prevDefaultMinutesRef = useRef(defaultMinutes);
  const prevDefaultLabelRef = useRef(defaultLabel);

  useEffect(() => {
    if (prevDefaultMinutesRef.current !== defaultMinutes) {
      if (!isRunning && secondsLeft === prevDefaultMinutesRef.current * 60) {
        setSelectedMinutes(defaultMinutes);
        setSecondsLeft(defaultMinutes * 60);
      }
      prevDefaultMinutesRef.current = defaultMinutes;
    }
  }, [defaultMinutes, isRunning, secondsLeft]);

  useEffect(() => {
    if (prevDefaultLabelRef.current !== defaultLabel) {
      if (!isRunning && sessionLabel === prevDefaultLabelRef.current) {
        setSessionLabel(defaultLabel);
      }
      prevDefaultLabelRef.current = defaultLabel;
    }
  }, [defaultLabel, isRunning, sessionLabel]);

  useEffect(() => {
    if (!isRunning) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setIsRunning(false);
          if (!completedRef.current) {
            completedRef.current = true;
            onCompleteSession(selectedMinutes, sessionLabel.trim() || 'Focus session');
            setJustFinished(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning, onCompleteSession, selectedMinutes, sessionLabel]);

  const handleSelectPreset = (minutes: number) => {
    setIsRunning(false);
    completedRef.current = false;
    setJustFinished(false);
    setSelectedMinutes(minutes);
    setSecondsLeft(minutes * 60);
  };

  const handleToggleRun = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(selectedMinutes * 60);
    }
    completedRef.current = false;
    setJustFinished(false);
    setIsRunning((r) => !r);
  };

  const handleReset = () => {
    setIsRunning(false);
    completedRef.current = false;
    setJustFinished(false);
    setSecondsLeft(selectedMinutes * 60);
  };

  const handleLogManualNow = () => {
    const elapsedSeconds = selectedMinutes * 60 - secondsLeft;
    const loggedMinutes = Math.max(5, Math.round(elapsedSeconds / 60) || selectedMinutes);
    onCompleteSession(loggedMinutes, sessionLabel.trim() || 'Focus session');
    setIsRunning(false);
    completedRef.current = false;
    setSecondsLeft(selectedMinutes * 60);
    setJustFinished(true);
  };

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const progress = 1 - secondsLeft / (selectedMinutes * 60);

  return (
    <section className="editorial-rise editorial-rise-4 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">{compact ? '04' : '01'}</span>
            <span className="editorial-kicker-text">Chronometer</span>
          </span>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Focus Timer
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Timed work blocks log directly to your daily total
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg shrink-0">
          {PRESETS.map((preset) => (
            <button
              key={preset.minutes}
              type="button"
              onClick={() => handleSelectPreset(preset.minutes)}
              className={`px-2.5 py-1 text-xs font-mono tabular-nums font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedMinutes === preset.minutes
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className={compact ? 'py-2' : 'py-5'}>
        {style === 'celestial' ? (
          (() => {
            const size = compact ? 168 : 204;
            const center = size / 2;
            const orbitRadius = compact ? 70 : 86;
            const orbDiameter = compact ? 104 : 128;
            const circumference = 2 * Math.PI * orbitRadius;
            const dashOffset = circumference * (1 - Math.min(1, Math.max(0, progress)));
            const progressAngle = progress * Math.PI * 2 - Math.PI / 2;
            const moteX = center + orbitRadius * Math.cos(progressAngle);
            const moteY = center + orbitRadius * Math.sin(progressAngle);

            return (
              <div className="celestial-orb-stage mb-4">
                <div
                  className="celestial-orb-ring-wrap"
                  style={{ width: size, height: size }}
                >
                  {/* Central glowing orb with gentle pulse matched to countdown */}
                  <div
                    aria-hidden="true"
                    className={`celestial-orb-core ${
                      isRunning && !reducedMotion ? 'celestial-orb-pulsing' : ''
                    }`}
                    style={{ width: orbDiameter, height: orbDiameter }}
                  />

                  {/* Orbiting ring of light */}
                  <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    className="relative z-10 overflow-visible"
                    aria-hidden="true"
                  >
                    <defs>
                      <filter id={`celestial-orb-glow-${compact ? 'c' : 'f'}`} x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="3.2" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Base orbital track */}
                    <circle
                      cx={center}
                      cy={center}
                      r={orbitRadius}
                      fill="none"
                      stroke="rgba(186, 210, 255, 0.16)"
                      strokeWidth="1.25"
                    />

                    {/* Subtle rotating light arc when active */}
                    <g
                      className="celestial-orbit-sweep"
                      data-paused={isRunning && !reducedMotion ? 'false' : 'true'}
                    >
                      <circle
                        cx={center}
                        cy={center}
                        r={orbitRadius + 7}
                        fill="none"
                        stroke="color-mix(in srgb, var(--color-blue-300) 45%, transparent)"
                        strokeWidth="1"
                        strokeDasharray="24 14 6 42"
                        strokeLinecap="round"
                      />
                      <circle
                        cx={center}
                        cy={center - (orbitRadius + 7)}
                        r="2.2"
                        fill="var(--color-blue-200)"
                        opacity={isRunning ? 0.9 : 0.45}
                      />
                    </g>

                    {/* Countdown progress ring of light */}
                    <circle
                      cx={center}
                      cy={center}
                      r={orbitRadius}
                      fill="none"
                      stroke="var(--color-blue-400)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      transform={`rotate(-90 ${center} ${center})`}
                      filter={`url(#celestial-orb-glow-${compact ? 'c' : 'f'})`}
                      style={{ transition: 'stroke-dashoffset 450ms ease' }}
                    />

                    {/* Luminous orbiting node at current progress angle */}
                    <circle
                      cx={moteX}
                      cy={moteY}
                      r="4.2"
                      fill="#f8faff"
                      filter={`url(#celestial-orb-glow-${compact ? 'c' : 'f'})`}
                    />
                  </svg>

                  {/* Countdown readout centered over the orb */}
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center pointer-events-none">
                    <div
                      className={`editorial-timer-display font-mono tabular-nums font-semibold tracking-tight text-slate-100 ${
                        compact ? 'text-2xl' : 'text-3xl'
                      }`}
                    >
                      {mins}:{secs}
                    </div>
                    <span className="mt-1 text-[11px] font-mono tabular-nums text-slate-400">
                      {Math.round(progress * 100)}% elapsed
                    </span>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-4 mb-3">
              <div
                className={`editorial-timer-display font-mono tabular-nums font-semibold tracking-tight text-slate-900 dark:text-slate-100 ${
                  compact ? 'text-4xl' : 'text-5xl'
                }`}
              >
                {mins}:{secs}
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {Math.round(progress * 100)}% elapsed
              </span>
            </div>

            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 transition-[width] duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
              />
            </div>
          </>
        )}

        <div className="mb-4">
          <label htmlFor="focus-session-label" className="sr-only">
            Session intention
          </label>
          <input
            id="focus-session-label"
            type="text"
            value={sessionLabel}
            onChange={(e) => setSessionLabel(e.target.value)}
            placeholder="What are you focusing on?"
            className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleRun}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0"
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Pause' : secondsLeft === 0 ? 'Restart' : 'Start'}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              aria-label="Reset timer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleLogManualNow}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Complete & Log</span>
          </button>
        </div>

        {justFinished && (
          <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            Session logged to your daily focus history.
          </p>
        )}
      </div>
    </section>
  );
}
