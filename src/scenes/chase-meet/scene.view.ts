import type { ChaseMeetSnapshot, ChaseMeetState } from './scene.sim';
import type { TeachingMode } from '../../app/teaching-standards';
import { getTeachingStandards } from '../../app/teaching-standards';
import type { TeachingTheme } from '../../app/teaching-demo-shell';
import { applyHiDpiCanvasMetrics, computeHiDpiCanvasMetrics } from '../../core/high-dpi-canvas';

export type CreateChaseMeetViewOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function blendColor(theme: TeachingTheme, light: string, dark: string): string {
  return theme === 'light' ? light : dark;
}

function drawSeries(
  ctx: CanvasRenderingContext2D,
  samples: ChaseMeetSnapshot['samples'],
  currentTime: number,
  xMap: (t: number) => number,
  yMap: (sample: ChaseMeetSnapshot['samples'][number]) => number,
  color: string,
  strokeWidth: number
): void {
  let started = false;
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = color;
  ctx.beginPath();

  for (const sample of samples) {
    if (sample.t > currentTime) break;
    const x = xMap(sample.t);
    const y = yMap(sample);
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }

  if (started) {
    ctx.stroke();
  }
}

export function createChaseMeetView(options: CreateChaseMeetViewOptions = {}) {
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  let mode: TeachingMode = options.mode ?? 'normal';
  let theme: TeachingTheme = options.theme ?? 'dark';
  let lastSnapshot: ChaseMeetSnapshot | null = null;
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

  function drawBackdrop(width: number, height: number): void {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, blendColor(theme, '#eef4ff', '#020617'));
    gradient.addColorStop(1, blendColor(theme, '#dbe5f2', '#0b1220'));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function splitLayout(width: number, height: number): {
    motion: Rect;
    xGraph: Rect;
    vGraph: Rect;
  } {
    const gap = Math.round(width * 0.016);
    const outerPad = Math.max(16, Math.round(width * 0.015));
    const motionHeight = Math.max(170, Math.round(height * 0.5));
    const graphTop = outerPad + motionHeight + gap;
    const graphHeight = Math.max(110, height - graphTop - outerPad);
    const graphWidth = Math.max(140, Math.floor((width - outerPad * 2 - gap) / 2));

    return {
      motion: {
        x: outerPad,
        y: outerPad,
        width: width - outerPad * 2,
        height: motionHeight
      },
      xGraph: {
        x: outerPad,
        y: graphTop,
        width: graphWidth,
        height: graphHeight
      },
      vGraph: {
        x: outerPad + graphWidth + gap,
        y: graphTop,
        width: graphWidth,
        height: graphHeight
      }
    };
  }

  function drawMotionRect(snapshot: ChaseMeetSnapshot, rect: Rect): void {
    if (!ctx) return;
    const readability = getTeachingStandards(mode).rightStage;
    const strokeWidth = readability.majorStrokePx;
    const minorStroke = readability.minorStrokePx;
    const pointRadius = readability.markerRadiusPx;

    ctx.fillStyle = blendColor(theme, 'rgba(255,255,255,0.74)', 'rgba(2,6,23,0.72)');
    ctx.strokeStyle = blendColor(theme, 'rgba(30,41,59,0.18)', 'rgba(148,163,184,0.25)');
    ctx.lineWidth = Math.max(1, minorStroke * 0.4);
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

    const axisY = rect.y + rect.height * 0.58;
    const axisPad = Math.max(20, rect.width * 0.03);
    const minX = snapshot.bounds.minX;
    const maxX = snapshot.bounds.maxX;
    const range = Math.max(1, maxX - minX);

    const toAxisX = (x: number): number => rect.x + axisPad + ((x - minX) / range) * (rect.width - axisPad * 2);

    ctx.strokeStyle = blendColor(theme, 'rgba(30,41,59,0.5)', 'rgba(226,232,240,0.35)');
    ctx.lineWidth = Math.max(2, strokeWidth * 0.55);
    ctx.beginPath();
    ctx.moveTo(rect.x + axisPad, axisY);
    ctx.lineTo(rect.x + rect.width - axisPad, axisY);
    ctx.stroke();

    const ticks = 8;
    ctx.fillStyle = blendColor(theme, '#334155', '#cbd5e1');
    ctx.font = `600 ${Math.max(11, readability.secondaryFontPx * 0.42)}px "Noto Sans SC", "PingFang SC", sans-serif`;
    ctx.textAlign = 'center';
    for (let i = 0; i <= ticks; i += 1) {
      const ratio = i / ticks;
      const worldX = minX + range * ratio;
      const x = rect.x + axisPad + (rect.width - axisPad * 2) * ratio;
      ctx.beginPath();
      ctx.moveTo(x, axisY - 6);
      ctx.lineTo(x, axisY + 6);
      ctx.stroke();
      ctx.fillText(worldX.toFixed(1), x, axisY + 20);
    }

    const drawObject = (x: number, label: string, color: string): void => {
      ctx.beginPath();
      ctx.fillStyle = color.replace('1)', '0.2)');
      ctx.arc(x, axisY, pointRadius * 1.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(x, axisY, pointRadius * 1.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = Math.max(2, minorStroke * 0.7);
      ctx.strokeStyle = blendColor(theme, '#0f172a', '#e2e8f0');
      ctx.stroke();

      ctx.fillStyle = blendColor(theme, '#0f172a', '#f8fafc');
      ctx.font = `700 ${Math.max(13, readability.primaryFontPx * 0.38)}px "Noto Sans SC", "PingFang SC", sans-serif`;
      ctx.fillText(label, x, axisY - pointRadius * 1.8);
    };

    const xA = toAxisX(snapshot.state.xA);
    const xB = toAxisX(snapshot.state.xB);

    drawObject(xA, 'A', 'rgba(96,165,250,1)');
    drawObject(xB, 'B', 'rgba(248,113,113,1)');

    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = Math.max(2, minorStroke * 0.6);
    ctx.strokeStyle = blendColor(theme, 'rgba(30,64,175,0.7)', 'rgba(148,163,184,0.7)');
    ctx.beginPath();
    ctx.moveTo(xA, axisY);
    ctx.lineTo(xB, axisY);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = blendColor(theme, '#0f172a', '#f8fafc');
    ctx.font = `600 ${Math.max(12, readability.secondaryFontPx * 0.44)}px "Noto Sans SC", "PingFang SC", sans-serif`;
    ctx.fillText(`距离 = ${snapshot.state.distance.toFixed(2)} m`, (xA + xB) * 0.5, axisY - pointRadius * 2.7);

    ctx.textAlign = 'left';
    ctx.font = `600 ${Math.max(12, readability.secondaryFontPx * 0.42)}px "Noto Sans SC", "PingFang SC", sans-serif`;
    ctx.fillText(`t = ${snapshot.state.t.toFixed(2)} s`, rect.x + 14, rect.y + 22);
    ctx.fillText(snapshot.state.meetMessage, rect.x + 14, rect.y + 42);
  }

  function drawGraphRect(
    snapshot: ChaseMeetSnapshot,
    rect: Rect,
    title: string,
    yLabel: string,
    mapValue: (sample: ChaseMeetSnapshot['samples'][number]) => number,
    valueDomain: { min: number; max: number },
    colors: { a: string; b: string },
    markerState: ChaseMeetState
  ): void {
    if (!ctx) return;
    const readability = getTeachingStandards(mode).rightStage;
    const padL = Math.max(36, rect.width * 0.12);
    const padR = Math.max(10, rect.width * 0.05);
    const padT = Math.max(18, rect.height * 0.12);
    const padB = Math.max(24, rect.height * 0.18);

    const minT = 0;
    const maxT = snapshot.params.totalTime;
    const rangeT = Math.max(0.001, maxT - minT);
    const rangeV = Math.max(0.001, valueDomain.max - valueDomain.min);

    const toX = (t: number): number => rect.x + padL + ((t - minT) / rangeT) * (rect.width - padL - padR);
    const toY = (value: number): number =>
      rect.y + padT + ((valueDomain.max - value) / rangeV) * (rect.height - padT - padB);

    ctx.fillStyle = blendColor(theme, 'rgba(255,255,255,0.74)', 'rgba(2,6,23,0.72)');
    ctx.strokeStyle = blendColor(theme, 'rgba(30,41,59,0.18)', 'rgba(148,163,184,0.25)');
    ctx.lineWidth = Math.max(1, readability.minorStrokePx * 0.35);
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

    ctx.strokeStyle = blendColor(theme, 'rgba(71,85,105,0.7)', 'rgba(148,163,184,0.8)');
    ctx.lineWidth = Math.max(1.5, readability.minorStrokePx * 0.45);
    ctx.beginPath();
    ctx.moveTo(rect.x + padL, rect.y + padT);
    ctx.lineTo(rect.x + padL, rect.y + rect.height - padB);
    ctx.lineTo(rect.x + rect.width - padR, rect.y + rect.height - padB);
    ctx.stroke();

    const gridStep = Math.max(1, Math.round(snapshot.params.totalTime / 5));
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = blendColor(theme, 'rgba(148,163,184,0.35)', 'rgba(148,163,184,0.28)');
    ctx.fillStyle = blendColor(theme, '#475569', '#94a3b8');
    ctx.font = `500 ${Math.max(10, readability.secondaryFontPx * 0.32)}px "Noto Sans SC", "PingFang SC", sans-serif`;
    ctx.textAlign = 'center';
    for (let t = 0; t <= snapshot.params.totalTime + 0.001; t += gridStep) {
      const x = toX(t);
      ctx.beginPath();
      ctx.moveTo(x, rect.y + padT);
      ctx.lineTo(x, rect.y + rect.height - padB);
      ctx.stroke();
      ctx.fillText(`${t.toFixed(0)}`, x, rect.y + rect.height - 7);
    }
    ctx.restore();

    drawSeries(
      ctx,
      snapshot.samples,
      markerState.t,
      toX,
      (sample) => toY(mapValue(sample)),
      colors.a,
      Math.max(2, readability.majorStrokePx * 0.35)
    );

    drawSeries(
      ctx,
      snapshot.samples,
      markerState.t,
      toX,
      (sample) => {
        if (yLabel.startsWith('x')) {
          return toY(sample.xB);
        }
        return toY(sample.vB);
      },
      colors.b,
      Math.max(2, readability.majorStrokePx * 0.35)
    );

    const markerX = toX(markerState.t);
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = blendColor(theme, 'rgba(30,41,59,0.6)', 'rgba(226,232,240,0.75)');
    ctx.lineWidth = Math.max(1.5, readability.minorStrokePx * 0.45);
    ctx.beginPath();
    ctx.moveTo(markerX, rect.y + padT);
    ctx.lineTo(markerX, rect.y + rect.height - padB);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = blendColor(theme, '#1e293b', '#cbd5e1');
    ctx.textAlign = 'left';
    ctx.font = `600 ${Math.max(11, readability.secondaryFontPx * 0.33)}px "Noto Sans SC", "PingFang SC", sans-serif`;
    ctx.fillText(title, rect.x + 10, rect.y + 16);
    ctx.fillText(yLabel, rect.x + 10, rect.y + 32);
  }

  function draw(snapshot: ChaseMeetSnapshot): void {
    if (!ctx) return;
    const width = surface.cssWidth;
    const height = surface.cssHeight;
    const layout = splitLayout(width, height);
    const maxSpeed = Math.max(1, snapshot.bounds.maxSpeed * 1.1);

    drawBackdrop(width, height);
    drawMotionRect(snapshot, layout.motion);
    drawGraphRect(
      snapshot,
      layout.xGraph,
      '位置-时间 图像',
      'x / m',
      (sample) => sample.xA,
      { min: snapshot.bounds.minX, max: snapshot.bounds.maxX },
      { a: blendColor(theme, '#2563eb', '#60a5fa'), b: blendColor(theme, '#dc2626', '#f87171') },
      snapshot.state
    );
    drawGraphRect(
      snapshot,
      layout.vGraph,
      '速度-时间 图像',
      'v / (m/s)',
      (sample) => sample.vA,
      { min: -maxSpeed, max: maxSpeed },
      { a: blendColor(theme, '#2563eb', '#60a5fa'), b: blendColor(theme, '#dc2626', '#f87171') },
      snapshot.state
    );
  }

  return {
    render(snapshot: ChaseMeetSnapshot): void {
      lastSnapshot = snapshot;
      draw(snapshot);
    },
    reset(): void {
      if (lastSnapshot) {
        draw(lastSnapshot);
      }
    },
    attachCanvas(nextCanvas: HTMLCanvasElement): void {
      canvas = nextCanvas;
      ctx = canvas.getContext('2d');
      resizeCanvas();
      if (lastSnapshot) {
        draw(lastSnapshot);
      }
    },
    resize(): void {
      resizeCanvas();
      if (lastSnapshot) {
        draw(lastSnapshot);
      }
    },
    setMode(nextMode: TeachingMode): void {
      mode = nextMode;
      if (lastSnapshot) {
        draw(lastSnapshot);
      }
    },
    setTheme(nextTheme: TeachingTheme): void {
      theme = nextTheme;
      if (lastSnapshot) {
        draw(lastSnapshot);
      }
    },
    dispose(): void {
      lastSnapshot = null;
      canvas = null;
      ctx = null;
    }
  };
}
