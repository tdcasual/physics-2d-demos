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

function scene1Palette(theme: TeachingTheme): {
  axis: string;
  zeroLine: string;
  curve: string;
  areaStroke: string;
} {
  if (theme === 'light') {
    return {
      axis: '#1f2937',
      zeroLine: 'rgba(100, 116, 139, 0.6)',
      curve: '#0d6efd',
      areaStroke: 'rgba(40, 167, 69, 0.8)'
    };
  }
  return {
    axis: '#cbd5e1',
    zeroLine: 'rgba(148, 163, 184, 0.7)',
    curve: '#66a9ff',
    areaStroke: 'rgba(52, 211, 153, 0.92)'
  };
}

function scene1Velocity(t: number): number {
  return 2 + 3 * t;
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
    if (next.params.scene === 'scene1') {
      const palette = scene1Palette(theme);
      const panelInset = 9;
      const panelX = panelInset;
      const panelY = panelInset;
      const panelW = width - panelInset * 2;
      const panelH = height - panelInset * 2;
      const margin = { left: 50, right: 20, top: 30, bottom: 40 };
      const plotW = panelW - margin.left - margin.right;
      const plotH = panelH - margin.top - margin.bottom;

      ctx.fillStyle = blend(theme, '#f9fbff', '#020817');
      ctx.fillRect(panelX, panelY, panelW, panelH);
      ctx.strokeStyle = blend(theme, 'rgba(148,163,184,0.52)', '#1e293b');
      ctx.lineWidth = 1.2;
      ctx.strokeRect(panelX, panelY, panelW, panelH);
      const samples = 200;
      const points: Array<{ t: number; v: number }> = [];
      let minV = Infinity;
      let maxV = -Infinity;

      for (let i = 0; i <= samples; i += 1) {
        const t = (next.params.time * i) / samples;
        const v = scene1Velocity(t);
        points.push({ t, v });
        minV = Math.min(minV, v);
        maxV = Math.max(maxV, v);
      }

      minV = Math.min(minV, 0);
      maxV = Math.max(maxV, 0.1);
      const pad = (maxV - minV) * 0.1 + 1e-6;
      minV -= pad;
      maxV += pad;

      const xToPx = (t: number) => panelX + margin.left + (t / next.params.time) * plotW;
      const yToPx = (v: number) => panelY + margin.top + (maxV - v) * (plotH / (maxV - minV));

      ctx.strokeStyle = palette.axis;
      ctx.lineWidth = Math.max(visuals.majorStrokePx * 1.15, visuals.majorStrokePx);
      ctx.beginPath();
      ctx.moveTo(panelX + margin.left, panelY + margin.top);
      ctx.lineTo(panelX + margin.left, panelY + panelH - margin.bottom);
      ctx.lineTo(panelX + panelW - margin.right, panelY + panelH - margin.bottom);
      ctx.stroke();

      const zeroY = yToPx(0);
      ctx.strokeStyle = palette.zeroLine;
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = Math.max(visuals.minorStrokePx * 1.15, visuals.minorStrokePx);
      ctx.beginPath();
      ctx.moveTo(panelX + margin.left, zeroY);
      ctx.lineTo(panelX + panelW - margin.right, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = palette.curve;
      ctx.lineWidth = Math.max(visuals.majorStrokePx * 1.25, visuals.majorStrokePx);
      ctx.beginPath();
      points.forEach((point, index) => {
        const x = xToPx(point.t);
        const y = yToPx(point.v);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = '#ff6b6b';
      points.forEach((point, index) => {
        if (index % 20 !== 0 && index !== points.length - 1) return;
        const x = xToPx(point.t);
        const y = yToPx(point.v);
        ctx.beginPath();
        ctx.arc(x, y, visuals.markerRadiusPx, 0, Math.PI * 2);
        ctx.fill();
      });

      const dt = next.params.time / next.params.rects;
      ctx.fillStyle = 'rgba(40, 167, 69, 0.25)';
      ctx.strokeStyle = palette.areaStroke;
      ctx.lineWidth = Math.max(visuals.minorStrokePx * 1.2, visuals.minorStrokePx);
      for (let i = 0; i < next.params.rects; i += 1) {
        const t0 = i * dt;
        const t1 = t0 + dt;
        let vSample = 0;
        if (next.params.method === 'left') vSample = scene1Velocity(t0);
        else if (next.params.method === 'right') vSample = scene1Velocity(t1);
        else if (next.params.method === 'mid') vSample = scene1Velocity(t0 + dt / 2);
        else vSample = 0.5 * (scene1Velocity(t0) + scene1Velocity(t1));

        const x = xToPx(t0);
        const w = xToPx(t1) - xToPx(t0);
        const y = yToPx(Math.max(vSample, 0));
        const h = yToPx(Math.min(vSample, 0)) - y;
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.fill();
        ctx.stroke();
      }
      return;
    }

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
      const y = baseY - scene1Velocity(t * next.params.time) * (height * 0.045);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
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
    if (next.params.scene === 'scene1') {
      ctx.fillStyle = blend(theme, '#f8fbff', '#020617');
      ctx.fillRect(0, 0, width, height);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, blend(theme, '#eef2ff', '#020617'));
      gradient.addColorStop(1, blend(theme, '#e0e7ff', '#0f172a'));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

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

    if (next.params.scene !== 'scene1') {
      drawMetricBox(
        ctx,
        theme,
        width - 360,
        16,
        [`场景：${next.params.scene}`, ...lines],
        Math.max(12, visuals.secondaryFontPx * 0.34)
      );
    }
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
