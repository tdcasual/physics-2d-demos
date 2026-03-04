import type { TeachingMode } from '../../app/teaching-standards';
import { getTeachingStandards } from '../../app/teaching-standards';
import type { TeachingTheme } from '../../app/teaching-demo-shell';
import { applyHiDpiCanvasMetrics, computeHiDpiCanvasMetrics } from '../../core/high-dpi-canvas';
import type { VtIntegralSnapshot } from './scene.sim';

export type CreateVtIntegralViewOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
};

function blend(theme: TeachingTheme, light: string, dark: string): string {
  return theme === 'light' ? light : dark;
}

function drawMetricBox(
  ctx: CanvasRenderingContext2D,
  theme: TeachingTheme,
  x: number,
  y: number,
  lines: string[],
  fontSize: number
): void {
  const width = 330;
  const lineHeight = Math.max(20, fontSize * 1.2);
  const height = 16 + lines.length * lineHeight;
  ctx.fillStyle = blend(theme, 'rgba(255,255,255,0.8)', 'rgba(15,23,42,0.72)');
  ctx.strokeStyle = blend(theme, 'rgba(148,163,184,0.45)', 'rgba(148,163,184,0.35)');
  ctx.lineWidth = 1.5;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = blend(theme, '#1e293b', '#cbd5e1');
  ctx.font = `600 ${fontSize}px "Noto Sans SC", "PingFang SC", sans-serif`;
  ctx.textAlign = 'left';
  lines.forEach((line, index) => {
    ctx.fillText(line, x + 12, y + 22 + index * lineHeight);
  });
}

export function createVtIntegralView(options: CreateVtIntegralViewOptions = {}) {
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  let mode: TeachingMode = options.mode ?? 'normal';
  let theme: TeachingTheme = options.theme ?? 'dark';
  let snapshot: VtIntegralSnapshot | null = null;
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

  function drawCurveDemo(next: VtIntegralSnapshot): void {
    if (!ctx) return;
    const width = surface.cssWidth;
    const height = surface.cssHeight;
    const visuals = getTeachingStandards(mode).rightStage;
    const baseY = height * 0.75;
    const left = 70;
    const right = width - 60;
    const axisWidth = right - left;

    ctx.strokeStyle = blend(theme, '#64748b', '#94a3b8');
    ctx.lineWidth = Math.max(2, visuals.minorStrokePx * 0.4);
    ctx.beginPath();
    ctx.moveTo(left, baseY);
    ctx.lineTo(right, baseY);
    ctx.stroke();

    ctx.strokeStyle = blend(theme, '#2563eb', '#60a5fa');
    ctx.lineWidth = Math.max(2.4, visuals.majorStrokePx * 0.38);
    ctx.beginPath();
    for (let i = 0; i <= 500; i += 1) {
      const t = i / 500;
      const x = left + t * axisWidth;
      const y = baseY - (1 + 0.8 * (t * next.params.time)) * (height * 0.045);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (next.params.scene === 'scene1') {
      const n = next.params.rects;
      const dt = next.params.time / n;
      ctx.fillStyle = blend(theme, 'rgba(30,64,175,0.25)', 'rgba(96,165,250,0.22)');
      for (let i = 0; i < n; i += 1) {
        const t0 = i * dt;
        const t1 = (i + 1) * dt;
        const x0 = left + (t0 / next.params.time) * axisWidth;
        const x1 = left + (t1 / next.params.time) * axisWidth;
        const hVal = 1 + 0.8 * (t0 + t1) * 0.5;
        const hPix = hVal * (height * 0.045);
        ctx.fillRect(x0, baseY - hPix, Math.max(1, x1 - x0), hPix);
      }
    }
  }

  function drawSceneSpecific(next: VtIntegralSnapshot): void {
    if (!ctx) return;
    const width = surface.cssWidth;
    const height = surface.cssHeight;
    const visuals = getTeachingStandards(mode).rightStage;
    const scene = next.params.scene;

    if (scene === 'scene3') {
      const cx = width * 0.28;
      const cy = height * 0.42;
      const r = Math.min(width, height) * 0.2;
      ctx.strokeStyle = blend(theme, '#334155', '#64748b');
      ctx.lineWidth = Math.max(2, visuals.minorStrokePx * 0.35);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = blend(theme, '#2563eb', '#60a5fa');
      ctx.lineWidth = Math.max(2.2, visuals.majorStrokePx * 0.35);
      ctx.beginPath();
      for (let i = 0; i <= next.params.circleN; i += 1) {
        const theta = (i / next.params.circleN) * Math.PI * 2;
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      return;
    }

    if (scene === 'scene4' || scene === 'scene5') {
      const baseX = width * 0.22;
      const baseY = height * 0.68;
      const barW = 48;
      const scale = height * 0.2;
      const trueV = scene === 'scene4' ? next.metrics.surfaceTrue : next.metrics.sphereTrue;
      const approxV = scene === 'scene4' ? next.metrics.surfaceApprox : next.metrics.sphereApprox;
      ctx.fillStyle = blend(theme, '#94a3b8', '#475569');
      ctx.fillRect(baseX, baseY - trueV * scale * 0.12, barW, trueV * scale * 0.12);
      ctx.fillStyle = blend(theme, '#2563eb', '#60a5fa');
      ctx.fillRect(baseX + 70, baseY - approxV * scale * 0.12, barW, approxV * scale * 0.12);
    }
  }

  function draw(next: VtIntegralSnapshot): void {
    if (!ctx) return;
    const width = surface.cssWidth;
    const height = surface.cssHeight;
    const visuals = getTeachingStandards(mode).rightStage;

    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, blend(theme, '#eef2ff', '#020617'));
    gradient.addColorStop(1, blend(theme, '#e0e7ff', '#0f172a'));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    drawCurveDemo(next);
    drawSceneSpecific(next);

    const lines: string[] = [];
    if (next.params.scene === 'scene1') {
      lines.push(`矩形总面积: ${next.metrics.rectArea.toFixed(3)}`);
      lines.push(`积分面积: ${next.metrics.trueArea.toFixed(3)}`);
      lines.push(`绝对误差: ${next.metrics.absErr.toFixed(3)}`);
      lines.push(`相对误差: ${(next.metrics.relErr * 100).toFixed(2)}%`);
    } else if (next.params.scene === 'scene2') {
      lines.push(`曲线振幅: ${next.params.curveAmplitude.toFixed(2)}`);
      lines.push(`曲线长度: ${next.metrics.curveLength.toFixed(3)}`);
      lines.push(`直线距离: ${next.metrics.lineDistance.toFixed(3)}`);
    } else if (next.params.scene === 'scene3') {
      lines.push(`多边形 n: ${next.params.circleN}`);
      lines.push(`周长差: ${next.metrics.circumferenceDiff.toFixed(4)}`);
    } else if (next.params.scene === 'scene4') {
      lines.push(`真实体积: ${next.metrics.surfaceTrue.toFixed(4)}`);
      lines.push(`近似体积: ${next.metrics.surfaceApprox.toFixed(4)}`);
      lines.push(`相对误差: ${(next.metrics.surfaceRelErr * 100).toFixed(2)}%`);
    } else {
      lines.push(`真实体积: ${next.metrics.sphereTrue.toFixed(4)}`);
      lines.push(`近似体积: ${next.metrics.sphereApprox.toFixed(4)}`);
      lines.push(`相对误差: ${(next.metrics.sphereRelErr * 100).toFixed(2)}%`);
    }

    drawMetricBox(
      ctx,
      theme,
      width - 360,
      16,
      [`场景：${next.params.scene}`, ...lines],
      Math.max(12, visuals.secondaryFontPx * 0.34)
    );
  }

  return {
    render(next: VtIntegralSnapshot): void {
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
