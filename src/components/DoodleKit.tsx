import { DashboardView } from '../types/dashboard';
import { EmptyIllustrationKind } from './EmptyStateIllustration';

export type MascotState = 'idle' | 'celebrating' | 'sleeping' | 'focused' | 'waving';

interface MascotProps {
  state?: MascotState;
  size?: number;
  className?: string;
}

const DOODLE_INK = '#1e2433';

/**
 * Original round friendly Cadence Doodle mascot with dot eyes, chunky rounded ink outlines,
 * slightly wonky organic proportions, and theme-derived palette fills.
 */
export function DoodleMascot({
  state = 'idle',
  size = 68,
  className = '',
}: MascotProps) {
  const bodyMotionClass =
    state === 'celebrating'
      ? 'doodle-celebrate-jump'
      : state === 'sleeping'
        ? 'doodle-sleep-breathe'
        : state === 'focused'
          ? 'doodle-focus-bob'
          : 'doodle-wobble';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 88 88"
      fill="none"
      aria-hidden="true"
      className={`overflow-visible ${className}`}
    >
      {/* Ground paper-cut shadow */}
      <ellipse
        cx="45"
        cy="78"
        rx={state === 'sleeping' ? 25 : 21}
        ry="4.5"
        fill="var(--doodle-accent-soft, #bfdbfe)"
      />

      <g className={bodyMotionClass}>
        {/* Tiny round feet (tucked cleanly when sleeping) */}
        {state !== 'sleeping' && (
          <>
            <ellipse
              cx="34"
              cy="72"
              rx="6.5"
              ry="4.5"
              fill="var(--doodle-sun, #fbbc04)"
              stroke={DOODLE_INK}
              strokeWidth="2.6"
            />
            <ellipse
              cx="53"
              cy="72.5"
              rx="6.5"
              ry="4.5"
              fill="var(--doodle-sun, #fbbc04)"
              stroke={DOODLE_INK}
              strokeWidth="2.6"
            />
          </>
        )}

        {/* Left stubby arm */}
        {state === 'celebrating' ? (
          <path
            d="M21 44 C12 37, 10 26, 16 22 C21 19, 25 27, 25 36"
            fill="var(--doodle-accent, #3b82f6)"
            stroke={DOODLE_INK}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : state === 'waving' ? (
          <path
            d="M22 46 C15 48, 13 54, 17 57 C21 59, 25 54, 24 49"
            fill="var(--doodle-accent, #3b82f6)"
            stroke={DOODLE_INK}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        ) : state === 'focused' ? (
          <path
            d="M22 48 C15 51, 16 58, 22 57"
            fill="var(--doodle-accent, #3b82f6)"
            stroke={DOODLE_INK}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M21 47 C14 49, 14 57, 20 58 C24 58, 25 53, 23 48"
            fill="var(--doodle-accent, #3b82f6)"
            stroke={DOODLE_INK}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        )}

        {/* Right arm (waves happily on Overview!) */}
        {state === 'waving' ? (
          <g className="doodle-wave-arm">
            <path
              d="M65 44 C74 36, 78 24, 71 20 C66 17, 62 25, 62 35"
              fill="var(--doodle-accent, #3b82f6)"
              stroke={DOODLE_INK}
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ) : state === 'celebrating' ? (
          <path
            d="M66 44 C75 36, 77 25, 71 21 C66 18, 62 26, 62 35"
            fill="var(--doodle-accent, #3b82f6)"
            stroke={DOODLE_INK}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M66 47 C73 49, 73 57, 67 58 C63 58, 62 53, 64 48"
            fill="var(--doodle-accent, #3b82f6)"
            stroke={DOODLE_INK}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        )}

        {/* Wonky round head/body silhouette (thick rounded outline) */}
        <path
          d={
            state === 'sleeping'
              ? 'M20 55 C19 36, 30 28, 45 28 C61 28, 71 37, 70 55 C69 68, 59 73, 44 73 C29 73, 21 68, 20 55 Z'
              : 'M21 47 C20 29, 31 20, 44 20 C59 20, 68 30, 67 47 C66 63, 57 69, 44 69 C30 69, 22 62, 21 47 Z'
          }
          fill="var(--doodle-accent, #3b82f6)"
          stroke={DOODLE_INK}
          strokeWidth="2.8"
          strokeLinejoin="round"
        />

        {/* Little curly hair tuft on crown */}
        <path
          d={
            state === 'sleeping'
              ? 'M42 28 C40 21, 47 20, 46 28'
              : 'M41 20 C38 11, 46 9, 48 16 C51 12, 56 15, 50 21'
          }
          fill="var(--doodle-sun, #fbbc04)"
          stroke={DOODLE_INK}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner light belly/face patch */}
        <path
          d={
            state === 'sleeping'
              ? 'M28 53 C28 42, 35 37, 45 37 C55 37, 62 43, 62 53 C61 62, 54 66, 45 66 C35 66, 28 62, 28 53 Z'
              : 'M27 46 C27 34, 34 29, 44 29 C54 29, 60 35, 60 46 C59 57, 53 62, 44 62 C34 62, 27 57, 27 46 Z'
          }
          fill="#fffdf7"
          stroke={DOODLE_INK}
          strokeWidth="2.1"
        />

        {/* Rosy cheeks */}
        <ellipse cx="32.5" cy={state === 'sleeping' ? 54 : 47} rx="3.4" ry="2.1" fill="#fb7185" opacity="0.65" />
        <ellipse cx="55.5" cy={state === 'sleeping' ? 54 : 47} rx="3.4" ry="2.1" fill="#fb7185" opacity="0.65" />

        {/* Facial expressions by state */}
        {state === 'sleeping' ? (
          <>
            {/* Peaceful closed U eyes */}
            <path
              d="M35 48 Q38 51.5 41 48"
              stroke={DOODLE_INK}
              strokeWidth="2.3"
              strokeLinecap="round"
            />
            <path
              d="M48 48 Q51 51.5 54 48"
              stroke={DOODLE_INK}
              strokeWidth="2.3"
              strokeLinecap="round"
            />
            <circle cx="44.5" cy="54.5" r="2.1" fill="#fb7185" stroke={DOODLE_INK} strokeWidth="1.6" />
          </>
        ) : state === 'celebrating' ? (
          <>
            {/* Happy joyful dot eyes + star gleam */}
            <circle cx="37.5" cy="41.5" r="2.7" fill={DOODLE_INK} />
            <circle cx="51" cy="41.5" r="2.7" fill={DOODLE_INK} />
            <circle cx="38.3" cy="40.6" r="0.9" fill="#ffffff" />
            <circle cx="51.8" cy="40.6" r="0.9" fill="#ffffff" />
            <path
              d="M39 48.5 Q44.2 55.5 49.5 48.5 Z"
              fill="#fb7185"
              stroke={DOODLE_INK}
              strokeWidth="2.1"
              strokeLinejoin="round"
            />
          </>
        ) : state === 'focused' ? (
          <>
            {/* Chunky round study glasses over dot eyes! */}
            <circle
              cx="37.5"
              cy="41.5"
              r="5.6"
              fill="var(--doodle-accent-tint, #eff6ff)"
              fillOpacity="0.6"
              stroke={DOODLE_INK}
              strokeWidth="2.2"
            />
            <circle
              cx="51"
              cy="41.5"
              r="5.6"
              fill="var(--doodle-accent-tint, #eff6ff)"
              fillOpacity="0.6"
              stroke={DOODLE_INK}
              strokeWidth="2.2"
            />
            <line x1="43" y1="41.5" x2="45.5" y2="41.5" stroke={DOODLE_INK} strokeWidth="2.2" />
            <circle cx="37.5" cy="41.5" r="2.3" fill={DOODLE_INK} className="doodle-eye-blink" />
            <circle cx="51" cy="41.5" r="2.3" fill={DOODLE_INK} className="doodle-eye-blink" />
            {/* Determined little mouth */}
            <path d="M41.5 49.5 L47 49.5" stroke={DOODLE_INK} strokeWidth="2.2" strokeLinecap="round" />
            {/* Sweatband stripe */}
            <path
              d="M27 33 Q44 30 61 33"
              stroke="var(--doodle-sun, #fbbc04)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
          </>
        ) : state === 'waving' ? (
          <>
            {/* Bright blinking dot eyes + welcoming grin */}
            <circle cx="37.5" cy="41.5" r="2.6" fill={DOODLE_INK} className="doodle-eye-blink" />
            <circle cx="51" cy="41.5" r="2.6" fill={DOODLE_INK} className="doodle-eye-blink" />
            <path
              d="M39.5 47.5 Q44.2 53 49 47.5"
              stroke={DOODLE_INK}
              strokeWidth="2.3"
              strokeLinecap="round"
            />
          </>
        ) : (
          /* idle state with occasional blink */
          <>
            <circle cx="37.5" cy="42" r="2.6" fill={DOODLE_INK} className="doodle-eye-blink" />
            <circle cx="51" cy="42" r="2.6" fill={DOODLE_INK} className="doodle-eye-blink" />
            <path
              d="M40.5 48.2 Q44.2 51.6 48 48.2"
              stroke={DOODLE_INK}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </>
        )}
      </g>

      {/* Extra floating flourishes per state */}
      {state === 'sleeping' && (
        <g fill="var(--doodle-stroke, #1e2433)" fontFamily="Fredoka, sans-serif" fontWeight="700">
          <text x="64" y="25" fontSize="11" className="doodle-zzz-1">
            z
          </text>
          <text x="72" y="16" fontSize="13.5" className="doodle-zzz-2">
            Z
          </text>
        </g>
      )}

      {state === 'celebrating' && (
        <g className="doodle-sparkle-twinkle">
          <path
            d="M15 15 L17 9 L19 15 L25 17 L19 19 L17 25 L15 19 L9 17 Z"
            fill="var(--doodle-sun, #fbbc04)"
            stroke={DOODLE_INK}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="75" cy="14" r="3.2" fill="var(--doodle-coral, #fb7185)" stroke={DOODLE_INK} strokeWidth="1.5" />
        </g>
      )}

      {state === 'waving' && (
        <path
          d="M14 21 L15.7 16 L17.4 21 L22.5 22.7 L17.4 24.4 L15.7 29.5 L14 24.4 L9 22.7 Z"
          fill="var(--doodle-sun, #fbbc04)"
          stroke={DOODLE_INK}
          strokeWidth="1.6"
          strokeLinejoin="round"
          className="doodle-sparkle-twinkle"
        />
      )}
    </svg>
  );
}

/* ---------------- Reusable Decorative Doodles ---------------- */

export function DoodleStar({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 2.5 L14.6 8.3 L21 9.1 L16.2 13.5 L17.6 19.8 L12 16.5 L6.4 19.8 L7.8 13.5 L3 9.1 L9.4 8.3 Z"
        fill="var(--doodle-sun, #fbbc04)"
        stroke={DOODLE_INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DoodleSparkle({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 3 L14.2 9.8 L21 12 L14.2 14.2 L12 21 L9.8 14.2 L3 12 L9.8 9.8 Z"
        fill="var(--doodle-accent, #3b82f6)"
        stroke={DOODLE_INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DoodleSquiggle({ width = 44, className = '' }: { width?: number; className?: string }) {
  return (
    <svg
      width={width}
      height={Math.round(width * 0.32)}
      viewBox="0 0 48 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3 10 Q9 2, 15 9 T27 8 T39 9 L45 6"
        stroke="var(--doodle-coral, #fb7185)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DoodleCloud({ width = 44, className = '' }: { width?: number; className?: string }) {
  return (
    <svg
      width={width}
      height={Math.round(width * 0.6)}
      viewBox="0 0 52 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M13 26 H39 C44 26, 47 22.5, 47 18.5 C47 14.8, 44 12, 40 12 C38.5 7, 34 4, 28.5 4 C22.5 4, 18 7.8, 17 12.8 C12.2 12.5, 8 15.5, 8 19.8 C8 23.4, 10 26, 13 26 Z"
        fill="#ffffff"
        stroke={DOODLE_INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DoodleArrow({ width = 32, className = '' }: { width?: number; className?: string }) {
  return (
    <svg
      width={width}
      height={Math.round(width * 0.65)}
      viewBox="0 0 36 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3 17 Q14 5, 29 12"
        stroke="var(--doodle-stroke, #1e2433)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M23 7 L31 12.5 L23.5 17"
        stroke="var(--doodle-stroke, #1e2433)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------------- Doodle-Shape Confetti Burst ---------------- */

const DOODLE_CONFETTI_ITEMS = [
  { shape: 'star', tx: '-28px', ty: '-24px', rot: '-42deg', fill: 'var(--doodle-sun, #fbbc04)' },
  { shape: 'squiggle', tx: '26px', ty: '-24px', rot: '58deg', fill: 'var(--doodle-coral, #fb7185)' },
  { shape: 'sparkle', tx: '-34px', ty: '-4px', rot: '-80deg', fill: 'var(--doodle-accent, #3b82f6)' },
  { shape: 'dot', tx: '31px', ty: '-6px', rot: '95deg', fill: 'var(--doodle-mint, #34d399)' },
  { shape: 'star', tx: '-16px', ty: '-34px', rot: '-20deg', fill: 'var(--doodle-coral, #fb7185)' },
  { shape: 'sparkle', tx: '16px', ty: '-33px', rot: '38deg', fill: 'var(--doodle-sun, #fbbc04)' },
  { shape: 'squiggle', tx: '-22px', ty: '18px', rot: '-115deg', fill: 'var(--doodle-mint, #34d399)' },
  { shape: 'dot', tx: '22px', ty: '17px', rot: '120deg', fill: 'var(--doodle-accent, #3b82f6)' },
] as const;

export function DoodleConfettiBurst() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible z-30"
    >
      {DOODLE_CONFETTI_ITEMS.map((item, idx) => (
        <svg
          key={idx}
          width="11"
          height="11"
          viewBox="0 0 14 14"
          fill="none"
          className="confetti-particle absolute overflow-visible"
          style={
            {
              '--tx': item.tx,
              '--ty': item.ty,
              '--rot': item.rot,
            } as React.CSSProperties
          }
        >
          {item.shape === 'star' && (
            <path
              d="M7 1 L8.6 4.8 L12.8 5.2 L9.6 8 L10.6 12.2 L7 10 L3.4 12.2 L4.4 8 L1.2 5.2 L5.4 4.8 Z"
              fill={item.fill}
              stroke={DOODLE_INK}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          )}
          {item.shape === 'sparkle' && (
            <path
              d="M7 1 L8.4 5.6 L13 7 L8.4 8.4 L7 13 L5.6 8.4 L1 7 L5.6 5.6 Z"
              fill={item.fill}
              stroke={DOODLE_INK}
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
          )}
          {item.shape === 'squiggle' && (
            <path
              d="M2 9 Q5 3, 8 8 T13 5"
              stroke={item.fill}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          )}
          {item.shape === 'dot' && (
            <circle cx="7" cy="7" r="3.6" fill={item.fill} stroke={DOODLE_INK} strokeWidth="1.2" />
          )}
        </svg>
      ))}
    </span>
  );
}

/* ---------------- Tab Header Illustrated Scenes ---------------- */

interface DoodleHeaderSceneProps {
  tab: DashboardView;
  mascotOverride?: MascotState;
}

export function DoodleHeaderScene({ tab, mascotOverride }: DoodleHeaderSceneProps) {
  switch (tab) {
    case DashboardView.Overview: {
      const mState: MascotState = mascotOverride ?? 'waving';
      return (
        <div
          aria-hidden="true"
          className="doodle-scene-frame hidden sm:flex items-center gap-1.5 px-3 py-1.5 shrink-0"
        >
          <svg width="56" height="54" viewBox="0 0 60 56" fill="none" className="overflow-visible">
            <circle
              cx="19"
              cy="20"
              r="11"
              fill="var(--doodle-sun, #fbbc04)"
              stroke={DOODLE_INK}
              strokeWidth="2.4"
            />
            <path d="M19 4v3M7 20H4M10 10l2.2 2.2M28 10l-2.2 2.2" stroke={DOODLE_INK} strokeWidth="2.2" strokeLinecap="round" />
            <path
              d="M17 41 H45 C49.5 41, 52 38, 52 34.5 C52 31.2, 49.4 28.8, 45.8 28.8 C44.5 24, 40 21, 35 21 C29.5 21, 25.5 24.5, 24.5 29 C20.2 28.8, 16.5 31.6, 16.5 35.5 C16.5 38.6, 18.6 41, 17 41 Z"
              fill="#ffffff"
              stroke={DOODLE_INK}
              strokeWidth="2.3"
              strokeLinejoin="round"
            />
            <path
              d="M47 13 L48.5 9 L50 13 L54 14.5 L50 16 L48.5 20 L47 16 L43 14.5 Z"
              fill="var(--doodle-coral, #fb7185)"
              stroke={DOODLE_INK}
              strokeWidth="1.5"
              className="doodle-sparkle-twinkle"
            />
          </svg>
          <DoodleMascot state={mState} size={58} />
        </div>
      );
    }

    case DashboardView.Tasks: {
      const mState: MascotState = mascotOverride ?? 'idle';
      return (
        <div
          aria-hidden="true"
          className="doodle-scene-frame hidden sm:flex items-center gap-1.5 px-3 py-1.5 shrink-0"
        >
          <svg width="58" height="54" viewBox="0 0 62 56" fill="none" className="overflow-visible">
            <rect
              x="8"
              y="8"
              width="38"
              height="44"
              rx="8"
              transform="rotate(-4 8 8)"
              fill="#ffffff"
              stroke={DOODLE_INK}
              strokeWidth="2.4"
            />
            <rect
              x="19"
              y="3"
              width="16"
              height="7"
              rx="3"
              transform="rotate(-4 19 3)"
              fill="var(--doodle-sun, #fbbc04)"
              stroke={DOODLE_INK}
              strokeWidth="2"
            />
            <rect x="15" y="18" width="9" height="9" rx="2.5" fill="var(--doodle-mint, #34d399)" stroke={DOODLE_INK} strokeWidth="2" />
            <path d="M17 22.5 L19 24.5 L22.5 20.5" stroke={DOODLE_INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M28 22 H40" stroke={DOODLE_INK} strokeWidth="2.4" strokeLinecap="round" />
            <rect x="16" y="32" width="9" height="9" rx="2.5" fill="#fff" stroke={DOODLE_INK} strokeWidth="2" />
            <path d="M29 36 H38" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" />
            <path
              d="M49 12 L51 16.5 L55.8 17 L52.2 20 L53.2 24.8 L49 22.4 L44.8 24.8 L45.8 20 L42.2 17 L47 16.5 Z"
              fill="var(--doodle-sun, #fbbc04)"
              stroke={DOODLE_INK}
              strokeWidth="1.6"
              strokeLinejoin="round"
              className="doodle-sparkle-twinkle"
            />
          </svg>
          <DoodleMascot state={mState} size={54} />
        </div>
      );
    }

    case DashboardView.Schedule:
      return (
        <div
          aria-hidden="true"
          className="doodle-scene-frame hidden sm:flex items-center px-3 py-1.5 shrink-0"
        >
          <svg width="106" height="54" viewBox="0 0 112 56" fill="none" className="overflow-visible">
            <rect x="8" y="10" width="46" height="38" rx="9" fill="#ffffff" stroke={DOODLE_INK} strokeWidth="2.4" />
            <line x1="8" y1="21" x2="54" y2="21" stroke={DOODLE_INK} strokeWidth="2.2" />
            <circle cx="18" cy="15.5" r="2.2" fill="var(--doodle-coral, #fb7185)" stroke={DOODLE_INK} strokeWidth="1.4" />
            <circle cx="30" cy="15.5" r="2.2" fill="var(--doodle-sun, #fbbc04)" stroke={DOODLE_INK} strokeWidth="1.4" />
            <rect x="14" y="26" width="24" height="7" rx="3.5" fill="var(--doodle-accent-soft, #bfdbfe)" stroke={DOODLE_INK} strokeWidth="1.8" />
            <rect x="22" y="36" width="25" height="7" rx="3.5" fill="var(--doodle-mint, #34d399)" stroke={DOODLE_INK} strokeWidth="1.8" />
            <circle cx="80" cy="30" r="17" fill="var(--doodle-sun, #fbbc04)" stroke={DOODLE_INK} strokeWidth="2.4" />
            <circle cx="80" cy="30" r="12" fill="#ffffff" stroke={DOODLE_INK} strokeWidth="1.8" />
            <path d="M80 23 v7 l5 3" stroke={DOODLE_INK} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M58 14 Q64 7, 70 13" stroke="var(--doodle-coral, #fb7185)" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
      );

    case DashboardView.Focus: {
      const mState: MascotState = mascotOverride ?? 'focused';
      return (
        <div
          aria-hidden="true"
          className="doodle-scene-frame hidden sm:flex items-center gap-1.5 px-3 py-1.5 shrink-0"
        >
          <svg width="54" height="54" viewBox="0 0 58 56" fill="none" className="overflow-visible">
            <rect x="21" y="5" width="16" height="5" rx="2.5" fill="var(--doodle-sun, #fbbc04)" stroke={DOODLE_INK} strokeWidth="2" />
            <circle cx="29" cy="31" r="18" fill="#ffffff" stroke={DOODLE_INK} strokeWidth="2.5" />
            <circle cx="29" cy="31" r="12.5" fill="var(--doodle-accent-tint, #eff6ff)" stroke={DOODLE_INK} strokeWidth="1.8" strokeDasharray="3 3" />
            <path d="M29 19 A12 12 0 0 1 41 31" stroke="var(--doodle-accent, #3b82f6)" strokeWidth="3.2" strokeLinecap="round" />
            <circle cx="29" cy="31" r="2.6" fill={DOODLE_INK} />
            <path d="M29 31 V22" stroke={DOODLE_INK} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M10 14 L11.5 10 L13 14 L17 15.5 L13 17 L11.5 21 L10 17 L6 15.5 Z" fill="var(--doodle-coral, #fb7185)" stroke={DOODLE_INK} strokeWidth="1.4" className="doodle-sparkle-twinkle" />
          </svg>
          <DoodleMascot state={mState} size={56} />
        </div>
      );
    }

    case DashboardView.Habits: {
      const mState: MascotState = mascotOverride ?? 'idle';
      return (
        <div
          aria-hidden="true"
          className="doodle-scene-frame hidden sm:flex items-center gap-1.5 px-3 py-1.5 shrink-0"
        >
          <svg width="54" height="54" viewBox="0 0 58 56" fill="none" className="overflow-visible">
            {/* Sprouting doodle plant */}
            <path d="M29 34 V18" stroke={DOODLE_INK} strokeWidth="2.6" strokeLinecap="round" />
            <path
              d="M29 22 C20 19, 17 11, 24 10 C29 9, 30 16, 29 22 Z"
              fill="var(--doodle-mint, #34d399)"
              stroke={DOODLE_INK}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path
              d="M29 26 C37 22, 42 15, 36 12 C31 10, 29 18, 29 26 Z"
              fill="var(--doodle-mint, #34d399)"
              stroke={DOODLE_INK}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path
              d="M17 34 H41 L38 50 H20 Z"
              fill="var(--doodle-coral, #fb7185)"
              stroke={DOODLE_INK}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <rect x="15" y="31" width="28" height="6" rx="3" fill="var(--doodle-sun, #fbbc04)" stroke={DOODLE_INK} strokeWidth="2.2" />
            <path
              d="M46 10 L47.5 6 L49 10 L53 11.5 L49 13 L47.5 17 L46 13 L42 11.5 Z"
              fill="var(--doodle-sun, #fbbc04)"
              stroke={DOODLE_INK}
              strokeWidth="1.4"
              className="doodle-sparkle-twinkle"
            />
          </svg>
          <DoodleMascot state={mState} size={54} />
        </div>
      );
    }

    case DashboardView.Notes:
      return (
        <div
          aria-hidden="true"
          className="doodle-scene-frame hidden sm:flex items-center px-3 py-1.5 shrink-0"
        >
          <svg width="102" height="54" viewBox="0 0 108 56" fill="none" className="overflow-visible">
            <rect x="12" y="10" width="44" height="38" rx="7" transform="rotate(-4 12 10)" fill="#ffffff" stroke={DOODLE_INK} strokeWidth="2.4" />
            <rect x="20" y="18" width="20" height="5" rx="2.5" fill="var(--doodle-accent, #3b82f6)" stroke={DOODLE_INK} strokeWidth="1.5" />
            <line x1="20" y1="29" x2="46" y2="27.5" stroke={DOODLE_INK} strokeWidth="2" strokeLinecap="round" />
            <line x1="20" y1="36" x2="39" y2="35" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            {/* Chunky crayon / pencil */}
            <g transform="rotate(-24 79 29)">
              <rect x="64" y="21" width="30" height="11" rx="3" fill="var(--doodle-sun, #fbbc04)" stroke={DOODLE_INK} strokeWidth="2.3" />
              <path d="M64 21 L54 26.5 L64 32 Z" fill="#fde68a" stroke={DOODLE_INK} strokeWidth="2.3" strokeLinejoin="round" />
              <circle cx="56" cy="26.5" r="1.7" fill={DOODLE_INK} />
              <rect x="91" y="21" width="7" height="11" rx="2" fill="var(--doodle-coral, #fb7185)" stroke={DOODLE_INK} strokeWidth="2.3" />
            </g>
            <path d="M88 45 Q95 40, 102 45" stroke="var(--doodle-accent, #3b82f6)" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
      );

    case DashboardView.GoogleWorkspace:
      return (
        <div
          aria-hidden="true"
          className="doodle-scene-frame hidden sm:flex items-center px-3 py-1.5 shrink-0"
        >
          <svg width="108" height="54" viewBox="0 0 114 56" fill="none" className="overflow-visible">
            <rect x="8" y="13" width="38" height="30" rx="8" fill="#ffffff" stroke={DOODLE_INK} strokeWidth="2.3" />
            <circle cx="20" cy="24" r="5" fill="var(--doodle-mint, #34d399)" stroke={DOODLE_INK} strokeWidth="1.8" />
            <line x1="29" y1="24" x2="39" y2="24" stroke={DOODLE_INK} strokeWidth="2" strokeLinecap="round" />
            <line x1="15" y1="34" x2="36" y2="34" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            {/* Dotted paper plane loop */}
            <path d="M50 31 Q64 14, 77 25" stroke={DOODLE_INK} strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
            <path
              d="M72 20 L102 14 L87 38 L81 28 Z"
              fill="var(--doodle-accent-soft, #bfdbfe)"
              stroke={DOODLE_INK}
              strokeWidth="2.3"
              strokeLinejoin="round"
            />
            <path d="M81 28 L102 14" stroke={DOODLE_INK} strokeWidth="1.9" />
            <path d="M57 10 L58.5 6 L60 10 L64 11.5 L60 13 L58.5 17 L57 13 L53 11.5 Z" fill="var(--doodle-sun, #fbbc04)" stroke={DOODLE_INK} strokeWidth="1.4" className="doodle-sparkle-twinkle" />
          </svg>
        </div>
      );

    case DashboardView.Settings:
      return (
        <div
          aria-hidden="true"
          className="doodle-scene-frame hidden sm:flex items-center px-3 py-1.5 shrink-0"
        >
          <svg width="104" height="54" viewBox="0 0 110 56" fill="none" className="overflow-visible">
            {/* Paint palette */}
            <path
              d="M14 29 C14 16, 26 9, 39 11 C50 13, 54 22, 47 28 C43 32, 44 37, 48 40 C51 43, 47 48, 37 48 C22 48, 14 40, 14 29 Z"
              fill="#ffffff"
              stroke={DOODLE_INK}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <circle cx="25" cy="23" r="3.4" fill="var(--doodle-coral, #fb7185)" stroke={DOODLE_INK} strokeWidth="1.6" />
            <circle cx="36" cy="18" r="3.4" fill="var(--doodle-sun, #fbbc04)" stroke={DOODLE_INK} strokeWidth="1.6" />
            <circle cx="24" cy="34" r="3.4" fill="var(--doodle-accent, #3b82f6)" stroke={DOODLE_INK} strokeWidth="1.6" />
            <circle cx="35" cy="40" r="3" fill="var(--doodle-mint, #34d399)" stroke={DOODLE_INK} strokeWidth="1.6" />
            {/* Chunky gear doodle */}
            <g transform="translate(80, 28)">
              <path
                d="M-3 -17 H3 L5 -12 L10 -14 L14 -10 L12 -5 L17 -3 V3 L12 5 L14 10 L10 14 L5 12 L3 17 H-3 L-5 12 L-10 14 L-14 10 L-12 5 L-17 3 V-3 L-12 -5 L-14 -10 L-10 -14 L-5 -12 Z"
                fill="var(--doodle-accent-soft, #bfdbfe)"
                stroke={DOODLE_INK}
                strokeWidth="2.3"
                strokeLinejoin="round"
              />
              <circle cx="0" cy="0" r="6" fill="var(--doodle-sun, #fbbc04)" stroke={DOODLE_INK} strokeWidth="2.1" />
            </g>
          </svg>
        </div>
      );
  }
}

/* ---------------- Empty State Vector Scenes ---------------- */

export function DoodleEmptyScene({ kind }: { kind: EmptyIllustrationKind }) {
  switch (kind) {
    case 'tasks':
      /* Sleeping creature curled on a cloud pillow beside a blank checklist */
      return (
        <svg viewBox="0 0 180 116" fill="none" aria-hidden="true" className="w-44 h-28 mx-auto overflow-visible">
          {/* Paper-cut wonky checklist sheet tilted */}
          <rect
            x="24"
            y="18"
            width="66"
            height="78"
            rx="12"
            transform="rotate(-5 24 18)"
            fill="#ffffff"
            stroke={DOODLE_INK}
            strokeWidth="2.6"
          />
          <rect x="44" y="11" width="24" height="9" rx="4" transform="rotate(-5 44 11)" fill="var(--doodle-sun, #fbbc04)" stroke={DOODLE_INK} strokeWidth="2.1" />
          <circle cx="40" cy="39" r="5.5" fill="var(--doodle-mint, #34d399)" stroke={DOODLE_INK} strokeWidth="2" />
          <path d="M37.5 39 l2 2 3.5-3.5" stroke={DOODLE_INK} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="51" y1="38" x2="77" y2="36" stroke={DOODLE_INK} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="41" cy="56" r="5.5" fill="#fff" stroke={DOODLE_INK} strokeWidth="2" />
          <line x1="52" y1="55" x2="74" y2="53" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" />

          {/* Pillow cloud */}
          <path
            d="M84 96 H154 C161 96, 165 91, 165 86 C165 81, 161 77, 155 77 C153 71, 146 67, 138 67 C130 67, 123 71, 121 77 C114 75, 104 75, 98 79 C90 79, 80 83, 80 90 C80 94, 82 96, 84 96 Z"
            fill="var(--doodle-accent-soft, #bfdbfe)"
            stroke={DOODLE_INK}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />

          {/* Sleeping mascot nested cleanly in scene */}
          <g transform="translate(80, 14)">
            <DoodleMascot state="sleeping" size={82} />
          </g>
        </svg>
      );

    case 'schedule':
      return (
        <svg viewBox="0 0 176 112" fill="none" aria-hidden="true" className="w-44 h-28 mx-auto overflow-visible">
          <DoodleCloud width={52} />
          <g transform="translate(116, 8)">
            <DoodleStar size={24} className="doodle-sparkle-twinkle" />
          </g>
          <rect x="28" y="24" width="112" height="72" rx="14" fill="#ffffff" stroke={DOODLE_INK} strokeWidth="2.6" />
          <line x1="28" y1="43" x2="140" y2="43" stroke={DOODLE_INK} strokeWidth="2.4" />
          <circle cx="45" cy="33.5" r="3.5" fill="var(--doodle-coral, #fb7185)" stroke={DOODLE_INK} strokeWidth="1.8" />
          <circle cx="58" cy="33.5" r="3.5" fill="var(--doodle-sun, #fbbc04)" stroke={DOODLE_INK} strokeWidth="1.8" />
          <rect x="40" y="54" width="54" height="14" rx="7" fill="var(--doodle-accent-soft, #bfdbfe)" stroke={DOODLE_INK} strokeWidth="2.2" />
          <rect x="64" y="74" width="60" height="13" rx="6.5" fill="var(--doodle-mint, #34d399)" stroke={DOODLE_INK} strokeWidth="2.2" strokeDasharray="5 3" />
          <g transform="translate(122, 48)">
            <circle cx="18" cy="18" r="17" fill="var(--doodle-sun, #fbbc04)" stroke={DOODLE_INK} strokeWidth="2.5" />
            <circle cx="18" cy="18" r="11" fill="#fff" stroke={DOODLE_INK} strokeWidth="1.8" />
            <path d="M18 11 v7 l5 3" stroke={DOODLE_INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      );

    case 'focus':
      return (
        <svg viewBox="0 0 176 112" fill="none" aria-hidden="true" className="w-44 h-28 mx-auto overflow-visible">
          <g transform="translate(16, 16)">
            <DoodleStar size={22} className="doodle-sparkle-twinkle" />
          </g>
          <g transform="translate(126, 20)">
            <DoodleSquiggle width={36} />
          </g>
          <circle cx="66" cy="60" r="34" fill="#ffffff" stroke={DOODLE_INK} strokeWidth="2.7" />
          <rect x="55" y="18" width="22" height="8" rx="4" fill="var(--doodle-sun, #fbbc04)" stroke={DOODLE_INK} strokeWidth="2.3" />
          <circle cx="66" cy="60" r="23" fill="var(--doodle-accent-tint, #eff6ff)" stroke={DOODLE_INK} strokeWidth="2" strokeDasharray="4 4" />
          <path d="M66 37 A23 23 0 0 1 89 60" stroke="var(--doodle-accent, #3b82f6)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="66" cy="60" r="3.5" fill={DOODLE_INK} />
          <line x1="66" y1="60" x2="66" y2="45" stroke={DOODLE_INK} strokeWidth="2.6" strokeLinecap="round" />
          <g transform="translate(88, 28)">
            <DoodleMascot state="idle" size={74} />
          </g>
        </svg>
      );

    case 'habits':
      return (
        <svg viewBox="0 0 176 112" fill="none" aria-hidden="true" className="w-44 h-28 mx-auto overflow-visible">
          <rect x="28" y="22" width="112" height="72" rx="14" fill="#ffffff" stroke={DOODLE_INK} strokeWidth="2.6" />
          {[0, 1, 2, 3, 4].map((c) =>
            [0, 1, 2].map((r) => {
              const lit = (c === 0 && r < 2) || (c === 1 && r === 1) || c === 2 || (c === 3 && r === 0) || (c === 4 && r === 2);
              return (
                <rect
                  key={`${c}-${r}`}
                  x={42 + c * 18}
                  y={36 + r * 17}
                  width="13"
                  height="13"
                  rx="4"
                  fill={lit ? 'var(--doodle-accent, #3b82f6)' : '#f1f5f9'}
                  stroke={DOODLE_INK}
                  strokeWidth="1.9"
                />
              );
            })
          )}
          <g transform="translate(130, 10)">
            <DoodleStar size={24} className="doodle-sparkle-twinkle" />
          </g>
          <g transform="translate(14, 70)">
            <DoodleSparkle size={20} />
          </g>
        </svg>
      );

    case 'notes':
      return (
        <svg viewBox="0 0 176 112" fill="none" aria-hidden="true" className="w-44 h-28 mx-auto overflow-visible">
          <rect x="42" y="18" width="80" height="78" rx="11" transform="rotate(-6 42 18)" fill="var(--doodle-accent-soft, #bfdbfe)" stroke={DOODLE_INK} strokeWidth="2.4" />
          <rect x="48" y="14" width="80" height="80" rx="11" fill="#ffffff" stroke={DOODLE_INK} strokeWidth="2.6" />
          <rect x="61" y="29" width="40" height="8" rx="4" fill="var(--doodle-sun, #fbbc04)" stroke={DOODLE_INK} strokeWidth="1.9" />
          <line x1="61" y1="47" x2="114" y2="47" stroke={DOODLE_INK} strokeWidth="2.4" strokeLinecap="round" />
          <line x1="61" y1="59" x2="108" y2="59" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="61" y1="71" x2="94" y2="71" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" />
          <g transform="rotate(-28 134 62)">
            <rect x="116" y="55" width="34" height="12" rx="3" fill="var(--doodle-coral, #fb7185)" stroke={DOODLE_INK} strokeWidth="2.3" />
            <path d="M116 55 L105 61 L116 67 Z" fill="#fde68a" stroke={DOODLE_INK} strokeWidth="2.3" strokeLinejoin="round" />
          </g>
          <g transform="translate(18, 22)">
            <DoodleSparkle size={20} className="doodle-sparkle-twinkle" />
          </g>
        </svg>
      );

    case 'workspace':
      return (
        <svg viewBox="0 0 176 112" fill="none" aria-hidden="true" className="w-44 h-28 mx-auto overflow-visible">
          <rect x="16" y="24" width="66" height="52" rx="12" fill="#ffffff" stroke={DOODLE_INK} strokeWidth="2.5" />
          <rect x="27" y="36" width="28" height="6" rx="3" fill="var(--doodle-accent, #3b82f6)" stroke={DOODLE_INK} strokeWidth="1.8" />
          <line x1="27" y1="50" x2="70" y2="50" stroke={DOODLE_INK} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="27" y1="60" x2="58" y2="60" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" />

          <rect x="88" y="38" width="70" height="54" rx="12" fill="var(--doodle-sun, #fbbc04)" stroke={DOODLE_INK} strokeWidth="2.5" />
          <circle cx="107" cy="56" r="8" fill="#ffffff" stroke={DOODLE_INK} strokeWidth="2.2" />
          <line x1="121" y1="56" x2="146" y2="56" stroke={DOODLE_INK} strokeWidth="2.4" strokeLinecap="round" />
          <line x1="101" y1="73" x2="144" y2="73" stroke={DOODLE_INK} strokeWidth="2.2" strokeLinecap="round" />

          <g transform="translate(92, 8)">
            <DoodleStar size={22} className="doodle-sparkle-twinkle" />
          </g>
          <g transform="translate(64, 14)">
            <DoodleArrow width={28} />
          </g>
          <g transform="translate(12, 84)">
            <DoodleSquiggle width={42} />
          </g>
        </svg>
      );
  }
}
