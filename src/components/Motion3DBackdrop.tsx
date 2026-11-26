import { useEffect, useRef, useState } from 'react';

interface Motion3DBackdropProps {
  reducedMotion?: boolean;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// Unit octahedron vertices & faces for clean 3D depth geometry
const OCTA_VERTICES: Vec3[] = [
  { x: 0, y: 1.15, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 0, z: -1 },
  { x: 0, y: -1.15, z: 0 },
];

const OCTA_FACES: [number, number, number][] = [
  [0, 1, 2],
  [0, 2, 3],
  [0, 3, 4],
  [0, 4, 1],
  [5, 2, 1],
  [5, 3, 2],
  [5, 4, 3],
  [5, 1, 4],
];

// Outer cube wireframe vertices & edges
const CUBE_VERTICES: Vec3[] = [
  { x: -1, y: -1, z: -1 },
  { x: 1, y: -1, z: -1 },
  { x: 1, y: 1, z: -1 },
  { x: -1, y: 1, z: -1 },
  { x: -1, y: -1, z: 1 },
  { x: 1, y: -1, z: 1 },
  { x: 1, y: 1, z: 1 },
  { x: -1, y: 1, z: 1 },
];

const CUBE_EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

function rotatePoint(p: Vec3, rx: number, ry: number, rz: number): Vec3 {
  // Rotate X
  const cy = Math.cos(rx);
  const sy = Math.sin(rx);
  const y1 = p.y * cy - p.z * sy;
  const z1 = p.y * sy + p.z * cy;
  const x1 = p.x;

  // Rotate Y
  const cx = Math.cos(ry);
  const sx = Math.sin(ry);
  const x2 = x1 * cx + z1 * sx;
  const z2 = -x1 * sx + z1 * cx;
  const y2 = y1;

  // Rotate Z
  const cz = Math.cos(rz);
  const sz = Math.sin(rz);
  return {
    x: x2 * cz - y2 * sz,
    y: x2 * sz + y2 * cz,
    z: z2,
  };
}

function parseCssColorToRgb(colorStr: string): [number, number, number] {
  const clean = colorStr.trim();
  if (clean.startsWith('#')) {
    const hex = clean.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16) || 37,
        parseInt(hex[1] + hex[1], 16) || 99,
        parseInt(hex[2] + hex[2], 16) || 235,
      ];
    }
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16) || 37,
        parseInt(hex.slice(2, 4), 16) || 99,
        parseInt(hex.slice(4, 6), 16) || 235,
      ];
    }
  }
  if (typeof document !== 'undefined') {
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    const pCtx = probe.getContext('2d');
    if (pCtx) {
      pCtx.fillStyle = '#2563eb';
      pCtx.fillStyle = clean;
      pCtx.fillRect(0, 0, 1, 1);
      const data = pCtx.getImageData(0, 0, 1, 1).data;
      return [data[0], data[1], data[2]];
    }
  }
  return [37, 99, 235];
}

export function Motion3DBackdrop({ reducedMotion = false }: Motion3DBackdropProps) {
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

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    let targetPointerX = 0;
    let targetPointerY = 0;
    let pointerX = 0;
    let pointerY = 0;
    let scrollFactor = window.scrollY * 0.0022;

    const getPalette = () => {
      const rootStyle = getComputedStyle(document.documentElement);
      const accentHex = rootStyle.getPropertyValue('--color-blue-500') || '#3b82f6';
      const [r, g, b] = parseCssColorToRgb(accentHex);
      const dark = document.documentElement.classList.contains('dark');
      return { r, g, b, dark };
    };

    const drawScene = (timeSec: number) => {
      ctx.clearRect(0, 0, width, height);
      const { r, g, b, dark } = getPalette();

      // Subtle receding 3D perspective horizon grid at bottom
      const gridAlpha = dark ? 0.14 : 0.085;
      const horizonY = height * 0.62 + pointerY * 18;
      const centerX = width * 0.56 + pointerX * 26;
      const gridStroke = `rgba(${r}, ${g}, ${b}, ${gridAlpha})`;
      ctx.strokeStyle = gridStroke;
      ctx.lineWidth = 1;

      const cols = 12;
      for (let i = -cols; i <= cols; i++) {
        const bottomX = centerX + i * (width / 8);
        const topX = centerX + i * 24;
        ctx.beginPath();
        ctx.moveTo(topX, horizonY);
        ctx.lineTo(bottomX, height + 20);
        ctx.stroke();
      }

      const rows = 8;
      for (let j = 0; j < rows; j++) {
        const t = (j / rows) ** 1.75;
        const y = horizonY + t * (height - horizonY + 10);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw primary 3D faceted octahedron + orbital wireframe in upper-right spatial pocket
      const anchorX = width * 0.84 + pointerX * 24;
      const anchorY = height * 0.28 + pointerY * 18;
      const scale = Math.min(width, height) * 0.145;
      const fov = 4.2;

      const rotX = 0.42 + timeSec * 0.18 + pointerY * 0.35 + scrollFactor * 0.45;
      const rotY = timeSec * 0.26 + pointerX * 0.45 + scrollFactor * 0.6;
      const rotZ = 0.18 + Math.sin(timeSec * 0.3) * 0.08;

      const project = (v: Vec3, radiusScale: number) => {
        const z = v.z + fov;
        const p = fov / Math.max(0.5, z);
        return {
          x: anchorX + v.x * radiusScale * p,
          y: anchorY - v.y * radiusScale * p,
          z: v.z,
        };
      };

      // Outer rotating wireframe cube
      const rotatedCube = CUBE_VERTICES.map((v) =>
        rotatePoint(
          { x: v.x * 1.12, y: v.y * 1.12, z: v.z * 1.12 },
          rotX * 0.75,
          -rotY * 0.65,
          rotZ
        )
      );
      const projectedCube = rotatedCube.map((v) => project(v, scale));
      ctx.strokeStyle = dark
        ? `rgba(${r}, ${g}, ${b}, 0.22)`
        : `rgba(${r}, ${g}, ${b}, 0.17)`;
      ctx.lineWidth = 1.1;
      for (const [a, bIdx] of CUBE_EDGES) {
        ctx.beginPath();
        ctx.moveTo(projectedCube[a].x, projectedCube[a].y);
        ctx.lineTo(projectedCube[bIdx].x, projectedCube[bIdx].y);
        ctx.stroke();
      }

      // Inner shaded octahedron with painter's algorithm z-sorting
      const rotatedOcta = OCTA_VERTICES.map((v) => rotatePoint(v, rotX, rotY, rotZ));
      const projectedOcta = rotatedOcta.map((v) => project(v, scale * 0.76));

      const sortedFaces = OCTA_FACES.map((face) => {
        const a = rotatedOcta[face[0]];
        const bV = rotatedOcta[face[1]];
        const c = rotatedOcta[face[2]];
        const avgZ = (a.z + bV.z + c.z) / 3;
        // Surface normal for directional shading
        const ux = bV.x - a.x;
        const uy = bV.y - a.y;
        const uz = bV.z - a.z;
        const vx = c.x - a.x;
        const vy = c.y - a.y;
        const vz = c.z - a.z;
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz) || 1;
        const lightDot = Math.max(0.15, (nx * 0.45 + ny * 0.6 + nz * 0.66) / len);
        return { face, avgZ, lightDot };
      }).sort((f1, f2) => f2.avgZ - f1.avgZ);

      for (const { face, lightDot } of sortedFaces) {
        const p0 = projectedOcta[face[0]];
        const p1 = projectedOcta[face[1]];
        const p2 = projectedOcta[face[2]];

        const fillAlpha = (dark ? 0.14 : 0.1) + lightDot * (dark ? 0.16 : 0.12);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fillAlpha.toFixed(3)})`;
        ctx.strokeStyle = dark
          ? `rgba(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)}, 0.42)`
          : `rgba(${r}, ${g}, ${b}, 0.34)`;
        ctx.lineWidth = 1.25;

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Secondary distant geometric satellite prism (lower-left depth balance)
      const satX = width * 0.22 - pointerX * 16;
      const satY = height * 0.78 - pointerY * 14;
      const satScale = Math.min(width, height) * 0.068;
      const satRotated = OCTA_VERTICES.map((v) =>
        rotatePoint(v, -rotX * 0.8 + 0.6, rotY * 0.9 + 1.1, -rotZ)
      );
      const satProjected = satRotated.map((v) => {
        const z = v.z + fov;
        const p = fov / Math.max(0.5, z);
        return {
          x: satX + v.x * satScale * p,
          y: satY - v.y * satScale * p,
        };
      });
      ctx.strokeStyle = dark
        ? `rgba(${r}, ${g}, ${b}, 0.22)`
        : `rgba(${r}, ${g}, ${b}, 0.16)`;
      ctx.lineWidth = 1;
      for (const face of OCTA_FACES) {
        ctx.beginPath();
        ctx.moveTo(satProjected[face[0]].x, satProjected[face[0]].y);
        ctx.lineTo(satProjected[face[1]].x, satProjected[face[1]].y);
        ctx.lineTo(satProjected[face[2]].x, satProjected[face[2]].y);
        ctx.closePath();
        ctx.stroke();
      }
    };

    if (isReducedMotion) {
      drawScene(0.6);
      const handleReducedResize = () => {
        resize();
        drawScene(0.6);
      };
      window.addEventListener('resize', handleReducedResize);
      return () => window.removeEventListener('resize', handleReducedResize);
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      targetPointerX = (e.clientX / Math.max(1, width) - 0.5) * 2;
      targetPointerY = (e.clientY / Math.max(1, height) - 0.5) * 2;
    };

    const handlePointerReset = () => {
      targetPointerX = 0;
      targetPointerY = 0;
    };

    const handleScroll = () => {
      scrollFactor = window.scrollY * 0.0022;
    };

    let rafId = 0;
    let lastFrame = 0;
    const FRAME_MS = 1000 / 32;

    const tick = (now: number) => {
      if (document.hidden) {
        rafId = 0;
        return;
      }
      rafId = window.requestAnimationFrame(tick);
      if (now - lastFrame < FRAME_MS) return;
      lastFrame = now;

      pointerX += (targetPointerX - pointerX) * 0.07;
      pointerY += (targetPointerY - pointerY) * 0.07;

      drawScene(now * 0.001);
    };

    const startLoop = () => {
      if (!rafId && !document.hidden) {
        lastFrame = 0;
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
      } else {
        startLoop();
      }
    };

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mouseleave', handlePointerReset);
    document.addEventListener('visibilitychange', handleVisibility);
    startLoop();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mouseleave', handlePointerReset);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isReducedMotion]);

  return (
    <div
      className="motion-3d-backdrop"
      aria-hidden="true"
      data-reduced-motion={isReducedMotion ? 'true' : 'false'}
    >
      <div className="motion-3d-ambient-glow" />
      <canvas ref={canvasRef} className="motion-3d-canvas" />
    </div>
  );
}
