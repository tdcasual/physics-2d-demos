import type { TeachingMode } from '../../app/teaching-standards';
import { getTeachingStandards } from '../../app/teaching-standards';
import type { TeachingTheme } from '../../app/teaching-demo-shell';
import { applyHiDpiCanvasMetrics, computeHiDpiCanvasMetrics } from '../../core/high-dpi-canvas';
import type { ElectrificationSnapshot } from './scene.sim';

export type CreateElectrificationViewOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
};

function blend(theme: TeachingTheme, light: string, dark: string): string {
  return theme === 'light' ? light : dark;
}

function formatCharge(charge: number): string {
  if (charge > 0) return `+${charge}`;
  return String(charge);
}

export function createElectrificationView(options: CreateElectrificationViewOptions = {}) {
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  let mode: TeachingMode = options.mode ?? 'normal';
  let theme: TeachingTheme = options.theme ?? 'dark';
  let snapshot: ElectrificationSnapshot | null = null;
  let surface = computeHiDpiCanvasMetrics({
    cssWidth: 1280,
    cssHeight: 720,
    devicePixelRatio: 1
  });

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

  function drawScene(next: ElectrificationSnapshot): void {
    if (!ctx) return;
    const width = surface.cssWidth;
    const height = surface.cssHeight;
    const visuals = getTeachingStandards(mode).rightStage;

    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, blend(theme, '#fff7ed', '#111827'));
    gradient.addColorStop(1, blend(theme, '#ffedd5', '#1f2937'));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const leftX = width * 0.3;
    const rightX = width * 0.7;
    const centerY = height * 0.52;
    const bodyW = width * 0.16;
    const bodyH = height * 0.38;
    const radius = Math.max(10, visuals.markerRadiusPx * 1.5);

    const drawBody = (x: number, charge: number, color: string) => {
      const x0 = x - bodyW * 0.5;
      const y0 = centerY - bodyH * 0.5;
      ctx.fillStyle = blend(theme, 'rgba(255,255,255,0.76)', 'rgba(15,23,42,0.75)');
      ctx.strokeStyle = blend(theme, 'rgba(71,85,105,0.45)', 'rgba(148,163,184,0.35)');
      ctx.lineWidth = Math.max(1.5, visuals.minorStrokePx * 0.36);
      ctx.fillRect(x0, y0, bodyW, bodyH);
      ctx.strokeRect(x0, y0, bodyW, bodyH);

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(x, centerY, radius * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = blend(theme, '#0f172a', '#f8fafc');
      ctx.font = `700 ${Math.max(14, visuals.primaryFontPx * 0.36)}px "Noto Sans SC", "PingFang SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatCharge(charge), x, centerY);
    };

    drawBody(leftX, next.state.leftCharge, blend(theme, '#60a5fa', '#3b82f6'));
    drawBody(rightX, next.state.rightCharge, blend(theme, '#f87171', '#ef4444'));

    if (next.state.scene === 'friction' && next.state.stepIndex >= 1) {
      ctx.strokeStyle = blend(theme, '#334155', '#e5e7eb');
      ctx.lineWidth = Math.max(2, visuals.majorStrokePx * 0.32);
      ctx.beginPath();
      ctx.moveTo(leftX + bodyW * 0.5, centerY - bodyH * 0.15);
      ctx.lineTo(rightX - bodyW * 0.5, centerY - bodyH * 0.15);
      ctx.stroke();
    }

    ctx.fillStyle = blend(theme, '#0f172a', '#e2e8f0');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `700 ${Math.max(14, visuals.secondaryFontPx * 0.45)}px "Noto Sans SC", "PingFang SC", sans-serif`;
    ctx.fillText(`场景：${next.state.scene}`, 16, 30);
    ctx.fillText(`下一步动作：${next.state.nextActionLabel}`, 16, 56);
    ctx.font = `600 ${Math.max(13, visuals.secondaryFontPx * 0.42)}px "Noto Sans SC", "PingFang SC", sans-serif`;
    ctx.fillText(next.state.explanation, 16, 84);
  }

  return {
    render(next: ElectrificationSnapshot): void {
      snapshot = next;
      drawScene(next);
    },
    resize(): void {
      resizeCanvas();
      if (snapshot) drawScene(snapshot);
    },
    setMode(nextMode: TeachingMode): void {
      mode = nextMode;
      if (snapshot) drawScene(snapshot);
    },
    setTheme(nextTheme: TeachingTheme): void {
      theme = nextTheme;
      if (snapshot) drawScene(snapshot);
    },
    dispose(): void {
      snapshot = null;
      canvas = null;
      ctx = null;
    }
  };
}
