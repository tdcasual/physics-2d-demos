import type { ProjectileState } from './scene.sim';
import { getTeachingStandards, type TeachingMode } from '../../app/teaching-standards';
import { applyHiDpiCanvasMetrics, computeHiDpiCanvasMetrics } from '../../core/high-dpi-canvas';
import type { TeachingTheme } from '../../app/teaching-demo-shell';
import { Colors, alpha } from '../../core/colors';

export type CreateProjectileViewOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
};

export function createProjectileView(options: CreateProjectileViewOptions = {}) {
  let lastState: ProjectileState | null = null;
  let trail: Array<Pick<ProjectileState, 'x' | 'y'>> = [];
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  let mode: TeachingMode = options.mode ?? 'normal';
  let theme: TeachingTheme = options.theme ?? 'dark';
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
    ctx.strokeStyle = theme === 'dark' ? Colors.mintLight : Colors.mint;
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
    ctx.strokeStyle = Colors.coral;
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
    ctx.fillStyle = Colors.coral;
    ctx.beginPath();
    ctx.arc(tipX, tipY, pointRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawText(
    state: ProjectileState,
    width: number,
    primaryFontSize: number,
    secondaryFontSize: number
  ): void {
    if (!ctx) return;
    const boxWidth = Math.max(280, Math.round(primaryFontSize * 8.2));
    const lineGap = Math.round(secondaryFontSize * 1.35);
    const boxHeight = Math.round(primaryFontSize + lineGap * 2 + 28);
    const boxX = width - boxWidth - 24;
    const boxY = 16;

    ctx.fillStyle = theme === 'dark' ? alpha(Colors.darkCard, 0.85) : alpha(Colors.white, 0.9);
    ctx.strokeStyle = theme === 'dark' ? alpha(Colors.gray, 0.3) : alpha(Colors.coral, 0.2);
    ctx.lineWidth = Math.max(2, Math.round(primaryFontSize * 0.14));
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 12);
    ctx.fill();
    ctx.stroke();

    const textColor = theme === 'dark' ? Colors.darkText : Colors.dark;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.font = `700 ${primaryFontSize}px "Noto Sans SC", "PingFang SC", sans-serif`;
    ctx.fillText(`t=${state.t.toFixed(2)}s`, boxX + 16, boxY + primaryFontSize + 6);
    ctx.font = `700 ${secondaryFontSize}px "Noto Sans SC", "PingFang SC", sans-serif`;
    ctx.fillText(`x=${state.x.toFixed(2)}m`, boxX + 16, boxY + primaryFontSize + 10 + lineGap);
    ctx.fillText(`y=${state.y.toFixed(2)}m`, boxX + 16, boxY + primaryFontSize + 10 + lineGap * 2);
  }

  function draw(state: ProjectileState): void {
    if (!ctx || !canvas) return;
    const standards = getTeachingStandards(mode);
    const visuals = standards.rightStage;
    const width = surface.cssWidth;
    const height = surface.cssHeight;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = theme === 'dark' ? Colors.darkBg : Colors.bg;
    ctx.fillRect(0, 0, width, height);
    drawAxes(width, height, visuals.majorStrokePx);
    drawTrail(width, height, visuals.majorStrokePx, visuals.markerRadiusPx);
    drawText(state, width, visuals.primaryFontPx, visuals.secondaryFontPx);
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
    setTheme(nextTheme: TeachingTheme): void {
      theme = nextTheme;
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
