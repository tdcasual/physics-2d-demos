import type { TeachingMode } from '../../app/teaching-standards';
import { getTeachingStandards } from '../../app/teaching-standards';
import type { TeachingTheme } from '../../app/teaching-demo-shell';
import { applyHiDpiCanvasMetrics, computeHiDpiCanvasMetrics } from '../../core/high-dpi-canvas';
import type { EmfAnalogySnapshot } from './scene.sim';

export type CreateEmfAnalogyViewOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
};

type Point = { x: number; y: number };

function blend(theme: TeachingTheme, light: string, dark: string): string {
  return theme === 'light' ? light : dark;
}

function lerp(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  };
}

function pathPoint(t: number, points: Point[]): Point {
  const segments = points.length - 1;
  if (segments <= 0) return { x: 0, y: 0 };
  const wrapped = ((t % 1) + 1) % 1;
  const scaled = wrapped * segments;
  const index = Math.floor(scaled);
  const local = scaled - index;
  return lerp(points[index], points[index + 1], local);
}

export function createEmfAnalogyView(options: CreateEmfAnalogyViewOptions = {}) {
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  let mode: TeachingMode = options.mode ?? 'normal';
  let theme: TeachingTheme = options.theme ?? 'dark';
  let snapshot: EmfAnalogySnapshot | null = null;
  let surface = computeHiDpiCanvasMetrics({
    cssWidth: 1280,
    cssHeight: 720,
    devicePixelRatio: 1
  });

  const particles = Array.from({ length: 140 }, (_, index) => ({
    offset: (index / 140) % 1,
    drift: 0.7 + (index % 9) * 0.04,
    size: 1.8 + (index % 4) * 0.45
  }));

  function resizeCanvas(): void {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(480, Math.floor(rect.width || 1280));
    const cssHeight = Math.max(280, Math.floor(rect.height || 720));
    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    surface = computeHiDpiCanvasMetrics({
      cssWidth,
      cssHeight,
      devicePixelRatio: dpr
    });
    applyHiDpiCanvasMetrics(canvas, ctx, surface);
  }

  function draw(next: EmfAnalogySnapshot): void {
    if (!ctx) return;
    const width = surface.cssWidth;
    const height = surface.cssHeight;
    const visuals = getTeachingStandards(mode).rightStage;

    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, blend(theme, '#e0f2fe', '#0f172a'));
    gradient.addColorStop(1, blend(theme, '#dbeafe', '#020617'));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const padX = width * 0.14;
    const padY = height * 0.2;
    const channelH = Math.max(56, height * 0.11);
    const left = padX;
    const right = width - padX;
    const top = padY;
    const bottom = height - padY;
    const midY = (top + bottom) * 0.5;

    const path: Point[] = [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
      { x: left, y: top }
    ];

    ctx.lineWidth = Math.max(4, visuals.majorStrokePx * 0.62);
    ctx.strokeStyle = blend(theme, 'rgba(37,99,235,0.55)', 'rgba(96,165,250,0.58)');
    ctx.fillStyle = blend(theme, 'rgba(191,219,254,0.42)', 'rgba(30,64,175,0.28)');
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(right, top);
    ctx.lineTo(right, bottom);
    ctx.lineTo(left, bottom);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pump
    const pumpX = left + (right - left) * 0.24;
    const pumpY = midY;
    const pumpR = Math.max(24, visuals.markerRadiusPx * 1.9);
    ctx.beginPath();
    ctx.fillStyle = blend(theme, '#f8fafc', '#1e293b');
    ctx.arc(pumpX, pumpY, pumpR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = blend(theme, '#94a3b8', '#64748b');
    ctx.lineWidth = Math.max(2, visuals.minorStrokePx * 0.35);
    ctx.stroke();

    const bladeLength = pumpR * 0.72;
    const angle = next.state.phase * 4;
    ctx.strokeStyle = blend(theme, '#1e3a8a', '#93c5fd');
    ctx.lineWidth = Math.max(2, visuals.majorStrokePx * 0.25);
    for (let i = 0; i < 4; i += 1) {
      const theta = angle + (Math.PI / 2) * i;
      const x2 = pumpX + Math.cos(theta) * bladeLength;
      const y2 = pumpY + Math.sin(theta) * bladeLength;
      ctx.beginPath();
      ctx.moveTo(pumpX, pumpY);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Resistor/tap area
    const tapX = right - (right - left) * 0.2;
    ctx.fillStyle = blend(theme, '#f59e0b', '#d97706');
    const tapW = Math.max(16, visuals.markerRadiusPx * 1.6);
    const tapH = channelH * (0.4 + next.state.tapOpening * 0.8);
    ctx.fillRect(tapX - tapW * 0.5, top - tapH * 0.5, tapW, tapH);

    if (next.state.isSystemOn) {
      ctx.fillStyle = blend(theme, '#2563eb', '#60a5fa');
      for (const particle of particles) {
        const progress = particle.offset + next.state.phase * 0.08 * particle.drift;
        const point = pathPoint(progress, path);
        const jitterY = (Math.sin(progress * Math.PI * 6) * 0.5 + 0.5) * (channelH * 0.22) - channelH * 0.11;
        ctx.beginPath();
        ctx.arc(point.x, point.y + jitterY, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = blend(theme, '#0f172a', '#e2e8f0');
    ctx.font = `700 ${Math.max(13, visuals.secondaryFontPx * 0.43)}px "Noto Sans SC", "PingFang SC", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`系统：${next.state.isSystemOn ? '通路' : '断路'}`, 16, 28);
    ctx.fillText(`开度：${Math.round(next.state.tapOpening * 100)}%`, 16, 52);
    ctx.fillText(`I=${next.state.currentI.toFixed(2)}A  Ir=${next.state.internalDrop.toFixed(2)}V  U=${next.state.terminalVoltage.toFixed(2)}V`, 16, 76);
  }

  return {
    render(next: EmfAnalogySnapshot): void {
      snapshot = next;
      draw(next);
    },
    resize(): void {
      resizeCanvas();
      if (snapshot) draw(snapshot);
    },
    setMode(nextMode: TeachingMode): void {
      mode = nextMode;
      if (snapshot) draw(snapshot);
    },
    setTheme(nextTheme: TeachingTheme): void {
      theme = nextTheme;
      if (snapshot) draw(snapshot);
    },
    dispose(): void {
      snapshot = null;
      canvas = null;
      ctx = null;
    }
  };
}
