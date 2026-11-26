import { useEffect, useRef, useState } from 'react';

interface Motion3DHeroOrbProps {
  reducedMotion?: boolean;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const VERTS: Vec3[] = [
  { x: 0, y: 1.15, z: 0 },
  { x: 1, y: 0.25, z: 0 },
  { x: 0, y: 0.25, z: 1 },
  { x: -1, y: 0.25, z: 0 },
  { x: 0, y: 0.25, z: -1 },
  { x: 0.72, y: -0.95, z: 0.72 },
  { x: -0.72, y: -0.95, z: 0.72 },
  { x: -0.72, y: -0.95, z: -0.72 },
  { x: 0.72, y: -0.95, z: -0.72 },
];

const EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 1],
  [1, 5],
  [2, 5],
  [2, 6],
  [3, 6],
  [3, 7],
  [4, 7],
  [4, 8],
  [1, 8],
  [5, 6],
  [6, 7],
  [7, 8],
  [8, 5],
];

const TOP_FACES: [number, number, number][] = [
  [0, 1, 2],
  [0, 2, 3],
  [0, 3, 4],
  [0, 4, 1],
];

function rotate3(v: Vec3, rx: number, ry: number): Vec3 {
  const cy = Math.cos(rx);
  const sy = Math.sin(rx);
  const y1 = v.y * cy - v.z * sy;
  const z1 = v.y * sy + v.z * cy;
  const cx = Math.cos(ry);
  const sx = Math.sin(ry);
  return {
    x: v.x * cx + z1 * sx,
    y: y1,
    z: -v.x * sx + z1 * cx,
  };
}

function parseCssColorToRgb(colorStr: string): [number, number, number] {
  const clean = colorStr.trim();
  if (clean.startsWith('#')) {
    const hex = clean.slice(1);
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16) || 59,
        parseInt(hex.slice(2, 4), 16) || 130,
        parseInt(hex.slice(4, 6), 16) || 246,
      ];
    }
  }
  if (typeof document !== 'undefined') {
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    const pCtx = probe.getContext('2d');
    if (pCtx) {
      pCtx.fillStyle = '#3b82f6';
      pCtx.fillStyle = clean;
      pCtx.fillRect(0, 0, 1, 1);
      const data = pCtx.getImageData(0, 0, 1, 1).data;
      return [data[0], data[1], data[2]];
    }
  }
  return [59, 130, 246];
}

/** Interactive 3D wireframe polyhedron emblem shown in Overview hero for Motion 3D style. */
export function Motion3DHeroOrb({ reducedMotion = false }: Motion3DHeroOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const spinBoostRef = useRef(0);
  const pointerOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 64;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = (angleY: number, angleX: number) => {
      ctx.clearRect(0, 0, size, size);
      const rootStyle = getComputedStyle(document.documentElement);
      const accentHex = rootStyle.getPropertyValue('--color-blue-500') || '#3b82f6';
      const [r, g, b] = parseCssColorToRgb(accentHex);
      const dark = document.documentElement.classList.contains('dark');

      const rotated = VERTS.map((v) => rotate3(v, angleX, angleY));
      const fov = 3.8;
      const scale = 18.5;
      const cx = size / 2;
      const cy = size / 2;
      const projected = rotated.map((v) => {
        const p = fov / Math.max(0.5, v.z + fov);
        return { x: cx + v.x * scale * p, y: cy - v.y * scale * p };
      });

      for (const [i0, i1, i2] of TOP_FACES) {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${dark ? 0.22 : 0.16})`;
        ctx.beginPath();
        ctx.moveTo(projected[i0].x, projected[i0].y);
        ctx.lineTo(projected[i1].x, projected[i1].y);
        ctx.lineTo(projected[i2].x, projected[i2].y);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${dark ? 0.85 : 0.78})`;
      ctx.lineWidth = 1.35;
      ctx.lineJoin = 'round';
      for (const [a, bIdx] of EDGES) {
        ctx.beginPath();
        ctx.moveTo(projected[a].x, projected[a].y);
        ctx.lineTo(projected[bIdx].x, projected[bIdx].y);
        ctx.stroke();
      }
    };

    if (reducedMotion) {
      draw(0.65, 0.38);
      return;
    }

    let rafId = 0;
    let baseYaw = 0.65;
    let lastTs = performance.now();

    const frame = (now: number) => {
      if (document.hidden) {
        rafId = 0;
        return;
      }
      const dt = Math.min(0.05, (now - lastTs) * 0.001);
      lastTs = now;
      spinBoostRef.current *= 0.94;
      const speed = 0.65 + (hovered ? 1.45 : 0) + spinBoostRef.current;
      baseYaw += dt * speed;

      const tiltX = 0.36 + pointerOffsetRef.current.y * 0.55;
      const tiltY = baseYaw + pointerOffsetRef.current.x * 0.6;
      draw(tiltY, tiltX);
      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [hovered, reducedMotion]);

  return (
    <div
      aria-hidden="true"
      onMouseEnter={() => {
        setHovered(true);
        spinBoostRef.current = Math.min(4.2, spinBoostRef.current + 1.8);
      }}
      onMouseLeave={() => {
        setHovered(false);
        pointerOffsetRef.current = { x: 0, y: 0 };
      }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        pointerOffsetRef.current = {
          x: ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2,
          y: ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2,
        };
      }}
      className="motion-3d-orb hidden sm:flex items-center justify-center w-16 h-16 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 bg-white/75 dark:bg-slate-900/70 shadow-sm cursor-grab active:cursor-grabbing shrink-0"
    >
      <canvas ref={canvasRef} className="w-16 h-16 block" />
    </div>
  );
}

/** Helper props for pointer-driven 3D tilt KPI cards when Motion 3D style is active. */
export function getMotion3DTiltHandlers(enabled: boolean) {
  if (!enabled) return {};
  return {
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'touch') return;
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
      const ny = (e.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
      el.style.setProperty('--m3d-rx', `${(-ny * 8).toFixed(2)}deg`);
      el.style.setProperty('--m3d-ry', `${(nx * 9).toFixed(2)}deg`);
      el.style.setProperty('--m3d-sx', `${((nx + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--m3d-sy', `${((ny + 0.5) * 100).toFixed(1)}%`);
    },
    onPointerLeave: (e: React.PointerEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      el.style.setProperty('--m3d-rx', '0deg');
      el.style.setProperty('--m3d-ry', '0deg');
      el.style.setProperty('--m3d-sx', '50%');
      el.style.setProperty('--m3d-sy', '0%');
    },
  };
}
