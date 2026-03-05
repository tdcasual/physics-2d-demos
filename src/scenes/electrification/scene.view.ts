import type { TeachingMode } from '../../app/teaching-standards';
import { getTeachingStandards } from '../../app/teaching-standards';
import type { TeachingTheme } from '../../app/teaching-demo-shell';
import {
  applyHiDpiCanvasMetrics,
  computeHiDpiCanvasMetrics
} from '../../core/high-dpi-canvas';
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

function drawFrictionLegacyLike(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: TeachingTheme,
  visuals: ReturnType<typeof getTeachingStandards>['rightStage']
): void {
  const darkPalette = {
    bg: '#1a1f2c',
    electron: '#00aaff',
    positive: '#ff5555',
    neutralStroke: '#6c757d',
    neutralFill: 'rgba(108, 117, 125, 0.2)'
  } as const;
  const lightPalette = {
    bg: '#f4f7fb',
    electron: '#0d6efd',
    positive: '#d14343',
    neutralStroke: '#6b7280',
    neutralFill: 'rgba(107, 114, 128, 0.18)'
  } as const;
  const palette = theme === 'light' ? lightPalette : darkPalette;

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  const viewW = 800;
  const viewH = 450;
  const scale = Math.min(width / viewW, height / viewH);
  const offsetX = (width - viewW * scale) * 0.5;
  const offsetY = (height - viewH * scale) * 0.5;
  const mapX = (x: number) => offsetX + x * scale;
  const mapY = (y: number) => offsetY + y * scale;
  const mapLen = (value: number) => value * scale;
  const atomFont = Math.max(12, visuals.secondaryFontPx * scale);

  const drawBody = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void => {
    const left = mapX(x);
    const top = mapY(y);
    const widthPx = mapLen(w);
    const heightPx = mapLen(h);
    const radius = mapLen(r);
    ctx.beginPath();
    ctx.moveTo(left + radius, top);
    ctx.arcTo(left + widthPx, top, left + widthPx, top + heightPx, radius);
    ctx.arcTo(left + widthPx, top + heightPx, left, top + heightPx, radius);
    ctx.arcTo(left, top + heightPx, left, top, radius);
    ctx.arcTo(left, top, left + widthPx, top, radius);
    ctx.closePath();
    ctx.fillStyle = palette.neutralFill;
    ctx.fill();
    ctx.strokeStyle = palette.neutralStroke;
    ctx.lineWidth = Math.max(1, visuals.majorStrokePx * scale);
    ctx.stroke();
  };

  const drawAtom = (x: number, y: number, withElectronAtX: number): void => {
    const cx = mapX(x);
    const cy = mapY(y);
    ctx.beginPath();
    ctx.fillStyle = palette.positive;
    ctx.arc(cx, cy, mapLen(14), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.bg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${atomFont}px Inter, "Noto Sans SC", "PingFang SC", sans-serif`;
    ctx.fillText('+', cx, cy);

    ctx.beginPath();
    ctx.fillStyle = palette.electron;
    ctx.arc(mapX(withElectronAtX), cy, mapLen(6), 0, Math.PI * 2);
    ctx.fill();
  };

  drawBody(500, 150, 40, 200, 20);
  for (let i = 0; i < 3; i += 1) {
    const atomY = 150 + (40 + i * 60);
    drawAtom(500 + 20, atomY, 500 + 5);
  }

  drawBody(250, 125, 80, 250, 10);
  for (let i = 0; i < 4; i += 1) {
    for (let j = 0; j < 2; j += 1) {
      const atomX = 250 + (25 + j * 30);
      const atomY = 125 + (40 + i * 60);
      drawAtom(atomX, atomY, atomX - 15);
    }
  }
}

export function createElectrificationView(
  options: CreateElectrificationViewOptions = {}
) {
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
    const dpr =
      typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    surface = computeHiDpiCanvasMetrics({
      cssWidth,
      cssHeight,
      devicePixelRatio: dpr
    });
    applyHiDpiCanvasMetrics(canvas, ctx, surface);
  }

  function drawScene(next: ElectrificationSnapshot): void {
    const context = ctx;
    if (!context) return;
    const width = surface.cssWidth;
    const height = surface.cssHeight;
    const visuals = getTeachingStandards(mode).rightStage;

    if (next.state.scene === 'friction' && next.state.stepIndex === 0) {
      drawFrictionLegacyLike(context, width, height, theme, visuals);
      return;
    }

    context.clearRect(0, 0, width, height);
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, blend(theme, '#fff7ed', '#111827'));
    gradient.addColorStop(1, blend(theme, '#ffedd5', '#1f2937'));
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const leftX = width * 0.3;
    const rightX = width * 0.7;
    const centerY = height * 0.52;
    const bodyW = width * 0.16;
    const bodyH = height * 0.38;
    const radius = Math.max(10, visuals.markerRadiusPx * 1.5);

    const drawBody = (x: number, charge: number, color: string) => {
      const x0 = x - bodyW * 0.5;
      const y0 = centerY - bodyH * 0.5;
      context.fillStyle = blend(
        theme,
        'rgba(255,255,255,0.76)',
        'rgba(15,23,42,0.75)'
      );
      context.strokeStyle = blend(
        theme,
        'rgba(71,85,105,0.45)',
        'rgba(148,163,184,0.35)'
      );
      context.lineWidth = Math.max(1.5, visuals.minorStrokePx * 0.36);
      context.fillRect(x0, y0, bodyW, bodyH);
      context.strokeRect(x0, y0, bodyW, bodyH);

      context.beginPath();
      context.fillStyle = color;
      context.arc(x, centerY, radius * 1.6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = blend(theme, '#0f172a', '#f8fafc');
      context.font = `700 ${Math.max(14, visuals.primaryFontPx * 0.36)}px "Noto Sans SC", "PingFang SC", sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(formatCharge(charge), x, centerY);
    };

    drawBody(leftX, next.state.leftCharge, blend(theme, '#60a5fa', '#3b82f6'));
    drawBody(
      rightX,
      next.state.rightCharge,
      blend(theme, '#f87171', '#ef4444')
    );

    if (next.state.scene === 'friction' && next.state.stepIndex >= 1) {
      context.strokeStyle = blend(theme, '#334155', '#e5e7eb');
      context.lineWidth = Math.max(2, visuals.majorStrokePx * 0.32);
      context.beginPath();
      context.moveTo(leftX + bodyW * 0.5, centerY - bodyH * 0.15);
      context.lineTo(rightX - bodyW * 0.5, centerY - bodyH * 0.15);
      context.stroke();
    }

    context.fillStyle = blend(theme, '#0f172a', '#e2e8f0');
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    context.font = `700 ${Math.max(14, visuals.secondaryFontPx * 0.45)}px "Noto Sans SC", "PingFang SC", sans-serif`;
    context.fillText(`场景：${next.state.scene}`, 16, 30);
    context.fillText(`下一步动作：${next.state.nextActionLabel}`, 16, 56);
    context.font = `600 ${Math.max(13, visuals.secondaryFontPx * 0.42)}px "Noto Sans SC", "PingFang SC", sans-serif`;
    context.fillText(next.state.explanation, 16, 84);
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
