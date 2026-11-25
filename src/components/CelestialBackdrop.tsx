import { useEffect, useRef, useState } from 'react';

interface CelestialBackdropProps {
  reducedMotion?: boolean;
}

interface Star {
  xFrac: number;
  yFrac: number;
  depth: number; // 0.25 (distant) to 1.0 (near)
  radius: number;
  baseAlpha: number;
  phase: number;
  twinkleSpeed: number;
  rgb: string;
}

interface ShootingStar {
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  length: number;
  bornAt: number;
  duration: number;
}

const STAR_COUNT = 300;
const FRAME_INTERVAL_MS = 1000 / 30; // Cap rendering at 30fps

// Deterministic seeded generator so the sky pattern stays harmonious across reloads
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildStars(): Star[] {
  const rand = mulberry32(42197);
  const palette = [
    '244, 248, 255', // star white
    '220, 234, 255', // cool ice blue
    '255, 246, 229', // warm pale gold
    '204, 224, 255', // sapphire mist
  ];

  const stars: Star[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const tierRoll = rand();
    const depth = tierRoll < 0.55 ? 0.3 : tierRoll < 0.85 ? 0.65 : 1.0;
    const radius =
      depth < 0.4 ? 0.55 + rand() * 0.55 : depth < 0.8 ? 0.8 + rand() * 0.7 : 1.1 + rand() * 0.85;
    const baseAlpha =
      depth < 0.4 ? 0.28 + rand() * 0.35 : depth < 0.8 ? 0.45 + rand() * 0.38 : 0.65 + rand() * 0.32;

    stars.push({
      xFrac: rand(),
      yFrac: rand(),
      depth,
      radius,
      baseAlpha,
      phase: rand() * Math.PI * 2,
      twinkleSpeed: 0.7 + rand() * 1.9,
      rgb: palette[Math.floor(rand() * palette.length)],
    });
  }
  return stars;
}

const STARS = buildStars();

export function CelestialBackdrop({ reducedMotion = false }: CelestialBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [prefersReduced, setPrefersReduced] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const isReducedMotion = reducedMotion || prefersReduced;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();

    const drawStaticFrame = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < STARS.length; i++) {
        const s = STARS[i];
        const x = s.xFrac * width;
        const y = s.yFrac * height;
        ctx.fillStyle = `rgba(${s.rgb}, ${s.baseAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Reduce Motion: render crisp static starfield image and exit without rAF loops
    if (isReducedMotion) {
      drawStaticFrame();
      const handleReducedResize = () => {
        resizeCanvas();
        drawStaticFrame();
      };
      window.addEventListener('resize', handleReducedResize);
      return () => window.removeEventListener('resize', handleReducedResize);
    }

    let targetParallaxX = 0;
    let targetParallaxY = 0;
    let parallaxX = 0;
    let parallaxY = 0;
    const shootingStars: ShootingStar[] = [];

    const spawnShootingStar = (now: number) => {
      if (document.hidden) return;
      const fromLeft = Math.random() > 0.35;
      const startX = fromLeft
        ? width * (0.08 + Math.random() * 0.55)
        : width * (0.42 + Math.random() * 0.48);
      const startY = height * (0.05 + Math.random() * 0.32);
      const angle = fromLeft ? Math.PI * (0.14 + Math.random() * 0.1) : Math.PI * (0.76 + Math.random() * 0.1);
      const speed = 0.48 + Math.random() * 0.24; // px per ms
      shootingStars.push({
        startX,
        startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: 95 + Math.random() * 65,
        bornAt: now,
        duration: 780 + Math.random() * 240,
      });
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const nx = (e.clientX / Math.max(1, width) - 0.5) * 2;
      const ny = (e.clientY / Math.max(1, height) - 0.5) * 2;
      targetParallaxX = -nx * 18;
      targetParallaxY = -ny * 14;
    };

    const handlePointerReset = () => {
      targetParallaxX = 0;
      targetParallaxY = 0;
    };

    const handleShootingStarEvent = () => {
      const now = performance.now();
      spawnShootingStar(now);
      window.setTimeout(() => {
        if (!document.hidden) {
          spawnShootingStar(performance.now());
        }
      }, 220);
    };

    let rafId = 0;
    let lastDraw = 0;
    let ambientTimer: number | null = null;

    const scheduleAmbientShootingStar = () => {
      if (ambientTimer) window.clearTimeout(ambientTimer);
      const delay = 13000 + Math.random() * 9000;
      ambientTimer = window.setTimeout(() => {
        if (!document.hidden) {
          spawnShootingStar(performance.now());
        }
        scheduleAmbientShootingStar();
      }, delay);
    };

    const renderFrame = (now: number) => {
      if (document.hidden) {
        rafId = 0;
        return;
      }

      rafId = window.requestAnimationFrame(renderFrame);
      if (now - lastDraw < FRAME_INTERVAL_MS) return;
      lastDraw = now;

      // Smooth parallax interpolation
      parallaxX += (targetParallaxX - parallaxX) * 0.05;
      parallaxY += (targetParallaxY - parallaxY) * 0.05;

      const tSec = now * 0.001;
      ctx.clearRect(0, 0, width, height);

      // Draw twinkling parallax stars
      for (let i = 0; i < STARS.length; i++) {
        const s = STARS[i];
        let x = s.xFrac * width + parallaxX * s.depth;
        let y = s.yFrac * height + parallaxY * s.depth;

        // Wrap softly around edges during parallax
        if (x < -4) x += width + 8;
        else if (x > width + 4) x -= width + 8;
        if (y < -4) y += height + 8;
        else if (y > height + 4) y -= height + 8;

        const twinkle = 0.62 + 0.38 * Math.sin(tSec * s.twinkleSpeed + s.phase);
        const alpha = Math.min(1, s.baseAlpha * twinkle);

        ctx.fillStyle = `rgba(${s.rgb}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, s.radius, 0, Math.PI * 2);
        ctx.fill();

        // Subtle cross-glint on brightest foreground stars
        if (s.depth === 1.0 && alpha > 0.78 && s.radius > 1.45) {
          const haloAlpha = (alpha - 0.72) * 0.55;
          ctx.fillStyle = `rgba(${s.rgb}, ${haloAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y, s.radius * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw active shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const star = shootingStars[i];
        const elapsed = now - star.bornAt;
        if (elapsed >= star.duration) {
          shootingStars.splice(i, 1);
          continue;
        }
        const progress = elapsed / star.duration;
        const fade = Math.sin(progress * Math.PI);
        const headX = star.startX + star.vx * elapsed;
        const headY = star.startY + star.vy * elapsed;
        const speed = Math.hypot(star.vx, star.vy) || 1;
        const tailLen = star.length * (0.45 + 0.55 * fade);
        const tailX = headX - (star.vx / speed) * tailLen;
        const tailY = headY - (star.vy / speed) * tailLen;

        const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
        grad.addColorStop(0, 'rgba(226, 238, 255, 0)');
        grad.addColorStop(0.7, `rgba(210, 228, 255, ${(fade * 0.45).toFixed(3)})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${(fade * 0.92).toFixed(3)})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.75;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 255, 255, ${(fade * 0.95).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(headX, headY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const startLoop = () => {
      if (!rafId && !document.hidden) {
        lastDraw = 0;
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
      } else {
        startLoop();
      }
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerReset);
    window.addEventListener('blur', handlePointerReset);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('cadence:shooting-star', handleShootingStarEvent);

    scheduleAmbientShootingStar();
    startLoop();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (ambientTimer) window.clearTimeout(ambientTimer);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerReset);
      window.removeEventListener('blur', handlePointerReset);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('cadence:shooting-star', handleShootingStarEvent);
    };
  }, [isReducedMotion]);

  return (
    <div
      className="celestial-backdrop"
      aria-hidden="true"
      data-reduced-motion={isReducedMotion ? 'true' : 'false'}
    >
      <div className="celestial-space-gradient" />
      <div className="celestial-nebula celestial-nebula-primary" />
      <div className="celestial-nebula celestial-nebula-secondary" />
      <canvas ref={canvasRef} className="celestial-starfield-canvas" />
    </div>
  );
}
