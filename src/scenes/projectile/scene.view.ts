import type { ProjectileState } from './scene.sim';
import { getTeachingStandards, type TeachingMode } from '../../app/teaching-standards';
import { applyHiDpiCanvasMetrics, computeHiDpiCanvasMetrics } from '../../core/high-dpi-canvas';

export type CreateProjectileViewOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
};

export function createProjectileView(options: CreateProjectileViewOptions = {}) {
  let lastState: ProjectileState | null = null;
  let trail: Array<Pick<ProjectileState, 'x' | 'y'>> = [];
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  let mode: TeachingMode = options.mode ?? 'normal';
  let surface = computeHiDpiCanvasMetrics({
    cssWidth: 1280,
    cssHeight: 720,
    devicePixelRatio: 1
  });

  function resizeCanvas(): void {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width || 1280));
    const height = Math.max(220, Math.floor(rect.height || 720));
    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    surface = computeHiDpiCanvasMetrics({
      cssWidth: width,
      cssHeight: height,
      devicePixelRatio: dpr
    });
    if (ctx) {
      applyHiDpiCanvasMetrics(canvas, ctx, surface);
    }
  }

  function drawAxes(width: number, height: number, strokeWidth: number): void {
    if (!ctx) return;
    const originX = 70;
    const originY = height - 60;
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = '#345b8a';
    ctx.beginPath();
    ctx.moveTo(originX, 30);
    ctx.lineTo(originX, originY);
    ctx.lineTo(width - 24, originY);
    ctx.stroke();
  }

  function drawTrail(width: number, height: number, strokeWidth: number, pointRadius: number): void {
    if (!ctx || trail.length === 0) return;

    const originX = 70;
    const originY = height - 60;
    const maxX = Math.max(25, ...trail.map((p) => p.x + 3));
    const maxY = Math.max(10, ...trail.map((p) => p.y + 2));
    const scaleX = (width - 100) / maxX;
    const scaleY = (height - 100) / maxY;

    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = '#0f6fc6';
    ctx.beginPath();
    for (let i = 0; i < trail.length; i += 1) {
      const x = originX + trail[i].x * scaleX;
      const y = originY - trail[i].y * scaleY;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    const tip = trail[trail.length - 1];
    const tipX = originX + tip.x * scaleX;
    const tipY = originY - tip.y * scaleY;
    ctx.fillStyle = '#f14545';
    ctx.beginPath();
    ctx.arc(tipX, tipY, pointRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawText(state: ProjectileState, width: number, fontSize: number): void {
    if (!ctx) return;
    ctx.fillStyle = '#243b57';
    ctx.font = `700 ${fontSize}px "Noto Sans SC", "PingFang SC", sans-serif`;
    ctx.fillText(`t=${state.t.toFixed(2)}s`, width - 220, 42);
    ctx.fillText(`x=${state.x.toFixed(2)}m`, width - 220, 42 + fontSize + 8);
    ctx.fillText(`y=${state.y.toFixed(2)}m`, width - 220, 42 + (fontSize + 8) * 2);
  }

  function draw(state: ProjectileState): void {
    if (!ctx || !canvas) return;
    const standards = getTeachingStandards(mode);
    const width = surface.cssWidth;
    const height = surface.cssHeight;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f4f9ff';
    ctx.fillRect(0, 0, width, height);
    drawAxes(width, height, standards.strokePx);
    drawTrail(width, height, standards.strokePx, standards.pointRadiusPx);
    drawText(state, width, Math.max(14, Math.floor(standards.bodyFontPx * 0.7)));
  }

  return {
    render(state: ProjectileState): void {
      lastState = { ...state };
      trail.push({ x: state.x, y: state.y });
      if (trail.length > 1200) {
        trail = trail.slice(-1200);
      }
      draw(lastState);
    },
    reset(): void {
      trail = [];
      if (lastState) {
        draw(lastState);
      }
    },
    attachCanvas(nextCanvas: HTMLCanvasElement): void {
      canvas = nextCanvas;
      ctx = canvas.getContext('2d');
      resizeCanvas();
      if (lastState) {
        draw(lastState);
      }
    },
    resize(): void {
      resizeCanvas();
      if (lastState) {
        draw(lastState);
      }
    },
    setMode(nextMode: TeachingMode): void {
      mode = nextMode;
      if (lastState) {
        draw(lastState);
      }
    },
    getLastState(): ProjectileState | null {
      return lastState;
    },
    dispose(): void {
      lastState = null;
      trail = [];
      canvas = null;
      ctx = null;
    }
  };
}
