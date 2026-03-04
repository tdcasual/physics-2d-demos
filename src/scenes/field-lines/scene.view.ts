import type { TeachingMode } from '../../app/teaching-standards';
import { getTeachingStandards } from '../../app/teaching-standards';
import type { TeachingTheme } from '../../app/teaching-demo-shell';
import { applyHiDpiCanvasMetrics, computeHiDpiCanvasMetrics } from '../../core/high-dpi-canvas';
import type { FieldLinesSnapshot } from './scene.sim';

export type CreateFieldLinesViewOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
};

function blend(theme: TeachingTheme, light: string, dark: string): string {
  return theme === 'light' ? light : dark;
}

export function createFieldLinesView(options: CreateFieldLinesViewOptions = {}) {
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  let mode: TeachingMode = options.mode ?? 'normal';
  let theme: TeachingTheme = options.theme ?? 'dark';
  let snapshot: FieldLinesSnapshot | null = null;
  let surface = computeHiDpiCanvasMetrics({
    cssWidth: 1280,
    cssHeight: 720,
    devicePixelRatio: 1
  });

  function resizeCanvas(): void {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(480, Math.floor(rect.width || 1280));
    const cssHeight = Math.max(300, Math.floor(rect.height || 720));
    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    surface = computeHiDpiCanvasMetrics({
      cssWidth,
      cssHeight,
      devicePixelRatio: dpr
    });
    applyHiDpiCanvasMetrics(canvas, ctx, surface);
  }

  function worldToCanvasX(x: number): number {
    return x * surface.cssWidth;
  }

  function worldToCanvasY(y: number): number {
    return y * surface.cssHeight;
  }

  function drawArrows(next: FieldLinesSnapshot): void {
    if (!ctx) return;
    const visuals = getTeachingStandards(mode).rightStage;
    const density = next.params.density;
    const cols = Math.max(7, Math.min(28, Math.round(6 + density * 0.2)));
    const rows = Math.max(5, Math.min(18, Math.round(4 + density * 0.12)));
    const stepX = surface.cssWidth / cols;
    const stepY = surface.cssHeight / rows;

    ctx.lineWidth = Math.max(1, visuals.minorStrokePx * 0.35);
    ctx.strokeStyle = blend(theme, 'rgba(30,64,175,0.7)', 'rgba(125,211,252,0.75)');

    for (let gx = 1; gx < cols; gx += 1) {
      for (let gy = 1; gy < rows; gy += 1) {
        const px = gx * stepX;
        const py = gy * stepY;

        let fx = 0;
        let fy = 0;
        for (const charge of next.charges) {
          const cx = worldToCanvasX(charge.x);
          const cy = worldToCanvasY(charge.y);
          const dx = px - cx;
          const dy = py - cy;
          const distanceSq = dx * dx + dy * dy + 260;
          const influence = charge.q / distanceSq;
          fx += influence * dx;
          fy += influence * dy;
        }

        const magnitude = Math.hypot(fx, fy);
        if (magnitude < 0.00001) continue;
        const ux = fx / magnitude;
        const uy = fy / magnitude;
        const arrowLength = Math.max(5, Math.min(26, 8 + magnitude * 2500));

        const x2 = px + ux * arrowLength;
        const y2 = py + uy * arrowLength;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const head = Math.max(4, arrowLength * 0.24);
        const leftX = x2 - ux * head - uy * (head * 0.6);
        const leftY = y2 - uy * head + ux * (head * 0.6);
        const rightX = x2 - ux * head + uy * (head * 0.6);
        const rightY = y2 - uy * head - ux * (head * 0.6);

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle as string;
        ctx.fill();
      }
    }
  }

  function drawCharges(next: FieldLinesSnapshot): void {
    if (!ctx) return;
    const visuals = getTeachingStandards(mode).rightStage;
    const radius = Math.max(14, visuals.markerRadiusPx * 1.9);
    for (const charge of next.charges) {
      const x = worldToCanvasX(charge.x);
      const y = worldToCanvasY(charge.y);
      const positive = charge.q >= 0;

      ctx.beginPath();
      ctx.fillStyle = positive
        ? blend(theme, 'rgba(239,68,68,0.85)', 'rgba(248,113,113,0.92)')
        : blend(theme, 'rgba(37,99,235,0.85)', 'rgba(96,165,250,0.92)');
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = Math.max(2, visuals.majorStrokePx * 0.28);
      ctx.strokeStyle = blend(theme, 'rgba(15,23,42,0.9)', 'rgba(226,232,240,0.92)');
      ctx.stroke();

      ctx.fillStyle = blend(theme, '#0f172a', '#f8fafc');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.max(16, visuals.primaryFontPx * 0.42)}px "Noto Sans SC", "PingFang SC", sans-serif`;
      const prefix = charge.q > 0 ? '+' : '';
      ctx.fillText(`${prefix}${charge.q.toFixed(1)}`, x, y);
    }
  }

  function draw(next: FieldLinesSnapshot): void {
    if (!ctx) return;
    const width = surface.cssWidth;
    const height = surface.cssHeight;
    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, blend(theme, '#eff6ff', '#020617'));
    gradient.addColorStop(1, blend(theme, '#dbeafe', '#0f172a'));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    drawArrows(next);
    drawCharges(next);

    const visuals = getTeachingStandards(mode).rightStage;
    ctx.fillStyle = blend(theme, 'rgba(15,23,42,0.85)', 'rgba(226,232,240,0.88)');
    ctx.font = `600 ${Math.max(12, visuals.secondaryFontPx * 0.35)}px "Noto Sans SC", "PingFang SC", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`场景：${next.params.scene}`, 16, 26);
    ctx.fillText(`矢量密度：${Math.round(next.params.density)}`, 16, 46);
  }

  return {
    render(next: FieldLinesSnapshot): void {
      snapshot = next;
      draw(next);
    },
    resize(): void {
      resizeCanvas();
      if (snapshot) {
        draw(snapshot);
      }
    },
    setMode(nextMode: TeachingMode): void {
      mode = nextMode;
      if (snapshot) {
        draw(snapshot);
      }
    },
    setTheme(nextTheme: TeachingTheme): void {
      theme = nextTheme;
      if (snapshot) {
        draw(snapshot);
      }
    },
    dispose(): void {
      snapshot = null;
      canvas = null;
      ctx = null;
    }
  };
}
