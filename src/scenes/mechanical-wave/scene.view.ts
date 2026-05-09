/**
 * 机械波 — Canvas 渲染器
 *
 * 绘制横波波形、质点、速度/加速度矢量、观测点 P
 */

import type { TeachingTheme } from '../../platform/standards';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import type { MechanicalWaveState } from './scene.sim';
import { waveY, waveVelocity, waveAcceleration } from './scene.sim';

export type CreateMechanicalWaveViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
};

const PALETTE = {
  dark: {
    bg: '#0f172a',
    grid: '#1e293b',
    axis: '#94a3b8',
    text: '#e2e8f0',
    label: '#94a3b8',
    wave: '#3b82f6',
    micro: '#9ca3af',
    particle: '#374151',
    velocity: '#10b981',
    accel: '#ef4444',
    pointP: '#f59e0b',
    pointPDash: '#f59e0b',
  },
  light: {
    bg: '#f8fafc',
    grid: '#e2e8f0',
    axis: '#374151',
    text: '#1e293b',
    label: '#64748b',
    wave: '#3b82f6',
    micro: '#9ca3af',
    particle: '#374151',
    velocity: '#10b981',
    accel: '#ef4444',
    pointP: '#f59e0b',
    pointPDash: '#f59e0b',
  },
};

export function createMechanicalWaveView(options: CreateMechanicalWaveViewOptions = {}) {
  let canvas = options.canvas ?? null;
  let ctx: CanvasRenderingContext2D | null = null;
  let theme: TeachingTheme = options.theme ?? 'dark';
  let modeScale = 1;
  let cssW = 800;
  let cssH = 400;
  let responsiveScale = 1;

  // 世界坐标范围
  const WORLD_X_MIN = 0;
  const WORLD_X_MAX = 12;
  const WORLD_Y_MIN = -12;
  const WORLD_Y_MAX = 12;

  const MARGIN_LEFT = 55;
  const MARGIN_RIGHT = 30;
  const MARGIN_TOP = 30;
  const MARGIN_BOTTOM = 35;

  let onPointSelectCallback: ((x: number) => void) | null = null;

  function resizeCanvas(): void {
    if (!canvas) return;
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;
    const rect = canvas.getBoundingClientRect();
    cssW = rect.width;
    cssH = rect.height;
    responsiveScale = parseFloat(canvas.dataset.responsiveScale || '1');
  }

  function worldToPixelX(x: number): number {
    const drawW = cssW - MARGIN_LEFT - MARGIN_RIGHT;
    return MARGIN_LEFT + ((x - WORLD_X_MIN) / (WORLD_X_MAX - WORLD_X_MIN)) * drawW;
  }

  function worldToPixelY(y: number): number {
    const drawH = cssH - MARGIN_TOP - MARGIN_BOTTOM;
    const midY = MARGIN_TOP + drawH / 2;
    return midY - (y / (WORLD_Y_MAX - WORLD_Y_MIN)) * drawH;
  }

  function pixelToWorldX(px: number): number {
    const drawW = cssW - MARGIN_LEFT - MARGIN_RIGHT;
    return WORLD_X_MIN + ((px - MARGIN_LEFT) / drawW) * (WORLD_X_MAX - WORLD_X_MIN);
  }

  function drawScene(state: MechanicalWaveState): void {
    const c = ctx;
    if (!c || !canvas) return;
    const p = PALETTE[theme === 'dark' ? 'dark' : 'light'];
    const { amplitude, wavelength, period, direction, showMicroShift } = state.params;
    const dir = direction === 'right' ? 1 : -1;
    const t = state.time;
    const fs = Math.max(11, 12 * responsiveScale * modeScale);

    c.clearRect(0, 0, cssW, cssH);
    c.fillStyle = p.bg;
    c.fillRect(0, 0, cssW, cssH);

    // 坐标轴
    const originPx = worldToPixelX(0);
    const originPy = worldToPixelY(0);
    const axisEndX = worldToPixelX(WORLD_X_MAX);
    const axisTopY = worldToPixelY(WORLD_Y_MAX);
    const axisBotY = worldToPixelY(WORLD_Y_MIN);

    // 网格
    c.strokeStyle = p.grid;
    c.lineWidth = 1;
    for (let x = 0; x <= 12; x++) {
      const px = worldToPixelX(x);
      c.beginPath();
      c.moveTo(px, axisTopY);
      c.lineTo(px, axisBotY);
      c.stroke();
    }

    // X 轴
    c.strokeStyle = p.axis;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(originPx, originPy);
    c.lineTo(axisEndX + 10, originPy);
    c.stroke();
    // 箭头
    c.fillStyle = p.axis;
    c.beginPath();
    c.moveTo(axisEndX + 10, originPy);
    c.lineTo(axisEndX + 2, originPy - 4);
    c.lineTo(axisEndX + 2, originPy + 4);
    c.closePath();
    c.fill();

    // Y 轴
    c.beginPath();
    c.moveTo(originPx, axisBotY);
    c.lineTo(originPx, axisTopY - 5);
    c.stroke();
    c.beginPath();
    c.moveTo(originPx, axisTopY - 5);
    c.lineTo(originPx - 4, axisTopY + 3);
    c.lineTo(originPx + 4, axisTopY + 3);
    c.closePath();
    c.fill();

    // 刻度标签
    c.font = `${fs}px sans-serif`;
    c.fillStyle = p.label;
    c.textAlign = 'center';
    for (let i = 0; i <= 12; i++) {
      const px = worldToPixelX(i);
      c.beginPath();
      c.moveTo(px, originPy - 3);
      c.lineTo(px, originPy + 3);
      c.stroke();
      if (i > 0) c.fillText(String(i), px, originPy + 16);
    }
    c.textAlign = 'right';
    const aPx = worldToPixelY(amplitude);
    const naPx = worldToPixelY(-amplitude);
    c.fillText('A', originPx - 8, aPx + 4);
    c.fillText('-A', originPx - 8, naPx + 4);
    c.fillText('0', originPx - 8, originPy + 4);

    c.textAlign = 'left';
    c.fillStyle = p.label;
    c.fillText('x/m', axisEndX - 15, originPy + 28);
    c.textAlign = 'center';
    c.fillText('y/cm', originPx - 5, axisTopY - 10);

    // 微移对比波形
    if (showMicroShift) {
      const deltaT = 0.2;
      c.beginPath();
      c.strokeStyle = p.micro;
      c.lineWidth = 1.5;
      c.setLineDash([5, 5]);
      for (let x = WORLD_X_MIN; x <= WORLD_X_MAX; x += 0.02) {
        const y = waveY(x, t + deltaT, amplitude, wavelength, period, dir);
        const px = worldToPixelX(x);
        const py = worldToPixelY(y);
        if (x === WORLD_X_MIN) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.stroke();
      c.setLineDash([]);
    }

    // 主波形
    c.beginPath();
    c.strokeStyle = p.wave;
    c.lineWidth = Math.max(2.5, 3 * responsiveScale);
    for (let x = WORLD_X_MIN; x <= WORLD_X_MAX; x += 0.01) {
      const y = waveY(x, t, amplitude, wavelength, period, dir);
      const px = worldToPixelX(x);
      const py = worldToPixelY(y);
      if (x === WORLD_X_MIN) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();

    // 质点 + 矢量
    const particlePositions = [0, 1, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const vScale = 0.15;
    const aScale = 0.02;
    const dotR = Math.max(3, 4 * responsiveScale);

    for (const x of particlePositions) {
      const y = waveY(x, t, amplitude, wavelength, period, dir);
      const px = worldToPixelX(x);
      const py = worldToPixelY(y);

      c.beginPath();
      c.arc(px, py, dotR, 0, Math.PI * 2);
      c.fillStyle = p.particle;
      c.fill();

      // 速度矢量（绿色）
      const v = waveVelocity(x, t, amplitude, wavelength, period, dir);
      const vLen = v * vScale * responsiveScale;
      if (Math.abs(vLen) > 0.5) {
        drawArrow(c, px, py, px, py - vLen, p.velocity, 2);
      }

      // 加速度矢量（红色）
      const a = waveAcceleration(y, period);
      const aLen = a * aScale * responsiveScale;
      if (Math.abs(aLen) > 0.5) {
        drawArrow(c, px, py, px, py - aLen, p.accel, 2);
      }
    }

    // 观测点 P
    const pPx = worldToPixelX(state.pointPX);
    const pPy = worldToPixelY(state.pointPY);

    // 虚线到平衡位置
    c.beginPath();
    c.setLineDash([3, 3]);
    c.strokeStyle = p.pointPDash;
    c.lineWidth = 1;
    c.moveTo(pPx, pPy);
    c.lineTo(pPx, originPy);
    c.stroke();
    c.setLineDash([]);

    // P 点圆圈
    c.beginPath();
    c.arc(pPx, pPy, Math.max(5, 7 * responsiveScale), 0, Math.PI * 2);
    c.strokeStyle = p.pointP;
    c.lineWidth = Math.max(2, 2.5 * responsiveScale);
    c.stroke();

    // P 标签
    c.fillStyle = p.pointP;
    c.font = `bold ${fs}px sans-serif`;
    c.textAlign = 'left';
    c.fillText('P', pPx + 10, pPy - 8);

    // 图例
    const legendY = axisBotY + 22;
    c.font = `${Math.max(10, 11 * responsiveScale)}px sans-serif`;
    c.textAlign = 'left';
    c.fillStyle = p.velocity;
    c.fillText('→ 振动速度', MARGIN_LEFT, legendY);
    c.fillStyle = p.accel;
    c.fillText('→ 加速度', MARGIN_LEFT + 90, legendY);
    if (showMicroShift) {
      c.fillStyle = p.label;
      c.fillText('--- Δt 微移', MARGIN_LEFT + 170, legendY);
    }
  }

  function drawArrow(
    c: CanvasRenderingContext2D,
    x1: number, y1: number,
    x2: number, y2: number,
    color: string, width: number
  ): void {
    const headLen = 6;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
    c.beginPath();
    c.moveTo(x2, y2);
    c.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    c.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    c.closePath();
    c.fill();
  }

  // ── Canvas 交互 ──
  function handleClick(e: PointerEvent): void {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const wx = pixelToWorldX(px);
    if (wx >= WORLD_X_MIN && wx <= WORLD_X_MAX) {
      onPointSelectCallback?.(wx);
    }
  }

  function attachEvents(): void {
    if (!canvas) return;
    canvas.addEventListener('pointerdown', handleClick);
    canvas.style.cursor = 'crosshair';
  }

  function detachEvents(): void {
    if (!canvas) return;
    canvas.removeEventListener('pointerdown', handleClick);
  }

  if (canvas) {
    resizeCanvas();
    attachEvents();
  }

  return {
    render(state: MechanicalWaveState): void {
      resizeCanvas();
      drawScene(state);
    },
    resize(): void {
      resizeCanvas();
    },
    setTheme(t: TeachingTheme): void {
      theme = t;
    },
    setMode(m: string): void {
      modeScale = m === 'presentation' ? 1.4 : 1;
    },
    setOnPointSelect(cb: (x: number) => void): void {
      onPointSelectCallback = cb;
    },
    dispose(): void {
      detachEvents();
      canvas = null;
      ctx = null;
    },
  };
}
