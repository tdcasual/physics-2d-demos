import {
  capacitorVelocityAt,
  motionEndTime,
  resistorTerminalVelocity,
  resistorVelocityAt,
  rodModelConstants as C,
  type RodParams,
  type RodState
} from '../scene.sim';
import { mapX, text, type Palette, type PlotBox } from './draw-helpers';

export function plotBox(width: number, height: number, scale: number): PlotBox {
  return {
    left: Math.max(36 * scale, width * 0.11),
    right: width - Math.max(28 * scale, width * 0.07),
    top: Math.max(32 * scale, height * 0.26),
    bottom: height - Math.max(24 * scale, height * 0.16)
  };
}

export function plotChrome(
  width: number,
  height: number,
  scale: number
): {
  box: PlotBox;
  title: { x: number; y: number };
  yUnit: { x: number; y: number };
} {
  const box = plotBox(width, height, scale);
  const titleY = Math.max(12 * scale, 10);
  return {
    box,
    title: {
      x: Math.max(8 * scale, 8),
      y: titleY
    },
    yUnit: {
      x: box.left + 6 * scale,
      y: Math.max(
        titleY + Math.max(16 * scale, 14),
        box.top - Math.max(12 * scale, 12)
      )
    }
  };
}

function modelEndTime(params: RodParams, model: RodParams['model']): number {
  return motionEndTime({ ...params, model });
}

export function plotTimeMax(params: RodParams): number {
  const span = Math.max(
    modelEndTime(params, 'resistor'),
    modelEndTime(params, 'capacitor')
  );
  return Math.min(C.timeMax, Math.max(1, span * 1.15));
}

export function velocityAxisMax(params: RodParams): number {
  const tPlot = plotTimeMax(params);
  const tRes = Math.min(tPlot, modelEndTime(params, 'resistor'));
  const tCap = Math.min(tPlot, modelEndTime(params, 'capacitor'));
  const peak = Math.max(
    resistorVelocityAt(params, tRes),
    capacitorVelocityAt(params, tCap)
  );
  return Math.max(2, peak * 1.2);
}

function timeTickStep(tMax: number): number {
  if (tMax <= 1.2) return 0.2;
  if (tMax <= 2.5) return 0.5;
  if (tMax <= 6) return 1;
  return 2;
}

function formatTick(value: number, digits: number): string {
  return String(Number(value.toFixed(digits)));
}

export function drawGraphs(
  ctx: CanvasRenderingContext2D,
  state: RodState,
  width: number,
  height: number,
  p: Palette,
  scale: number,
  font: (n: number) => number
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(0, 0, width, height);
  const chrome = plotChrome(width, height, scale);
  const box = chrome.box;
  const tMax = plotTimeMax(state.params);
  const vMax = velocityAxisMax(state.params);
  text(
    ctx,
    'v–t 对比',
    chrome.title.x,
    chrome.title.y,
    p.ink,
    font(13),
    'left',
    700
  );
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  const tStep = timeTickStep(tMax);
  const tDigits = tStep < 1 ? 1 : 0;
  for (let t = 0; t < tMax - tStep * 0.45; t += tStep) {
    const x = mapX(t, box.left, box.right, 0, tMax);
    ctx.beginPath();
    ctx.moveTo(x, box.top);
    ctx.lineTo(x, box.bottom);
    ctx.stroke();
    text(
      ctx,
      formatTick(t, tDigits),
      x,
      box.bottom + 12 * scale,
      p.muted,
      font(10),
      'center',
      600
    );
  }
  {
    const x = mapX(tMax, box.left, box.right, 0, tMax);
    ctx.beginPath();
    ctx.moveTo(x, box.top);
    ctx.lineTo(x, box.bottom);
    ctx.stroke();
    text(
      ctx,
      formatTick(tMax, tDigits),
      x,
      box.bottom + 12 * scale,
      p.muted,
      font(10),
      'center',
      600
    );
  }
  const yTicks = 5;
  const vDigits = vMax >= 10 ? 0 : 1;
  for (let i = 0; i <= yTicks; i += 1) {
    const v = (vMax * i) / yTicks;
    const y = mapX(v, box.bottom, box.top, 0, vMax);
    ctx.beginPath();
    ctx.moveTo(box.left, y);
    ctx.lineTo(box.right, y);
    ctx.stroke();
    text(
      ctx,
      formatTick(v, vDigits),
      box.left - 6 * scale,
      y,
      p.muted,
      font(10),
      'right',
      600
    );
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = Math.max(1.4, 1.6 * scale);
  ctx.beginPath();
  ctx.moveTo(box.left, box.top - 4 * scale);
  ctx.lineTo(box.left, box.bottom);
  ctx.lineTo(box.right + 8 * scale, box.bottom);
  ctx.stroke();
  text(
    ctx,
    'v / (m·s⁻¹)',
    chrome.yUnit.x,
    chrome.yUnit.y,
    p.ink,
    font(11),
    'left',
    700
  );
  text(
    ctx,
    't / s',
    box.right + 6 * scale,
    box.bottom,
    p.ink,
    font(11),
    'left',
    700
  );

  const n = 120;
  const drawCurve = (
    color: string,
    fn: (time: number) => number,
    endTime: number,
    active: boolean
  ): void => {
    ctx.strokeStyle = color;
    ctx.lineWidth = active
      ? Math.max(2.6, 3.2 * scale)
      : Math.max(1.6, 2 * scale);
    ctx.setLineDash(active ? [] : [7 * scale, 4 * scale]);
    ctx.beginPath();
    const span = Math.max(0, Math.min(tMax, endTime));
    for (let i = 0; i <= n; i += 1) {
      const t = (span * i) / n;
      const x = mapX(t, box.left, box.right, 0, tMax);
      const y = mapX(Math.max(0, fn(t)), box.bottom, box.top, 0, vMax);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  drawCurve(
    p.gold,
    (t) => resistorVelocityAt(state.params, t),
    modelEndTime(state.params, 'resistor'),
    state.params.model === 'resistor'
  );
  drawCurve(
    p.teal,
    (t) => capacitorVelocityAt(state.params, t),
    modelEndTime(state.params, 'capacitor'),
    state.params.model === 'capacitor'
  );

  const terminal = resistorTerminalVelocity(state.params);
  if (terminal > 0 && terminal <= vMax) {
    const y = mapX(terminal, box.bottom, box.top, 0, vMax);
    ctx.strokeStyle = p.red;
    ctx.lineWidth = Math.max(1.2, 1.6 * scale);
    ctx.setLineDash([6 * scale, 4 * scale]);
    ctx.beginPath();
    ctx.moveTo(box.left, y);
    ctx.lineTo(box.right, y);
    ctx.stroke();
    ctx.setLineDash([]);
    text(
      ctx,
      `vₘ=${terminal.toFixed(2)}`,
      box.right - 4 * scale,
      y - 10 * scale,
      p.red,
      font(10),
      'right',
      700
    );
  }

  const cursorX = mapX(state.time, box.left, box.right, 0, tMax);
  const cursorY = mapX(
    Math.max(0, state.velocity),
    box.bottom,
    box.top,
    0,
    vMax
  );
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = Math.max(1.2, 1.6 * scale);
  ctx.setLineDash([4 * scale, 3 * scale]);
  ctx.beginPath();
  ctx.moveTo(cursorX, box.top);
  ctx.lineTo(cursorX, box.bottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.arc(cursorX, cursorY, 4.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  const legendY = box.top + 8 * scale;
  const legendX = box.left + Math.max(8 * scale, width * 0.22);
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = Math.max(2, 2.4 * scale);
  ctx.beginPath();
  ctx.moveTo(legendX, legendY);
  ctx.lineTo(legendX + 16 * scale, legendY);
  ctx.stroke();
  text(
    ctx,
    '电阻棒 趋于 vₘ',
    legendX + 20 * scale,
    legendY,
    p.gold,
    font(11),
    'left',
    700
  );
  ctx.setLineDash([6 * scale, 4 * scale]);
  ctx.strokeStyle = p.teal;
  ctx.beginPath();
  ctx.moveTo(legendX + width * 0.28, legendY);
  ctx.lineTo(legendX + width * 0.28 + 16 * scale, legendY);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '电容棒 匀加速',
    legendX + width * 0.28 + 20 * scale,
    legendY,
    p.teal,
    font(11),
    'left',
    700
  );
}
