/**
 * 多普勒效应 — Canvas 渲染器
 *
 * 绘制波环、波源、观察者，支持拖拽交互
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import type { DopplerState } from './scene.sim';
import { SOUND_SPEED, CANVAS_MIN, CANVAS_MAX } from './scene.sim';

export type CreateDopplerViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type DragTarget = 'source' | 'observer' | null;

const PALETTE = {
  dark: {
    bg: '#0f172a',
    grid: '#1e293b',
    axis: '#94a3b8',
    text: '#e2e8f0',
    label: '#94a3b8',
    source: '#3b82f6',
    sourceBody: '#60a5fa',
    observer: '#22c55e',
    waveFront: 'rgba(239,68,68,',
    waveBack: 'rgba(59,130,246,',
    flash: 'rgba(251,191,36,0.3)',
    wheel: '#374151',
    headlight: '#fbbf24'
  },
  light: {
    bg: '#f8fafc',
    grid: '#e2e8f0',
    axis: '#374151',
    text: '#1e293b',
    label: '#64748b',
    source: '#3b82f6',
    sourceBody: '#93c5fd',
    observer: '#16a34a',
    waveFront: 'rgba(220,38,38,',
    waveBack: 'rgba(37,99,235,',
    flash: 'rgba(251,191,36,0.35)',
    wheel: '#1f2937',
    headlight: '#f59e0b'
  }
};

export function createDopplerView(options: CreateDopplerViewOptions = {}) {
  let canvas = options.canvas ?? null;
  let ctx: CanvasRenderingContext2D | null = null;
  let theme: TeachingTheme = options.theme ?? 'dark';
  let mode: TeachingMode = options.mode ?? 'normal';
  let demoHints: DemoRenderHints | undefined = options.demoHints;
  let cssW = 800;
  let cssH = 450;
  let responsiveScale = 1;

  // 坐标系参数
  const MARGIN_LEFT = 50;
  const MARGIN_RIGHT = 30;
  const WORLD_MIN = 0;
  const WORLD_MAX = 30;

  // 交互状态
  let dragTarget: DragTarget = null;
  let onDragCallback:
    | ((entity: 'source' | 'observer', x: number) => void)
    | null = null;
  let onPointClickCallback: ((x: number) => void) | null = null;
  // 缓存最近一次渲染的坐标（供交互命中检测）
  let cachedSourceX = 15;
  let cachedObserverX = 25;

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
    return MARGIN_LEFT + ((x - WORLD_MIN) / (WORLD_MAX - WORLD_MIN)) * drawW;
  }

  function pixelToWorldX(px: number): number {
    const drawW = cssW - MARGIN_LEFT - MARGIN_RIGHT;
    return WORLD_MIN + ((px - MARGIN_LEFT) / drawW) * (WORLD_MAX - WORLD_MIN);
  }

  function getLaneY(): number {
    return cssH * 0.55;
  }

  /** 演示模式内容放大系数（normal=1，presentation=renderHints.contentScale） */
  function getContentScale(): number {
    return mode === 'presentation' ? (demoHints?.contentScale ?? 1.5) : 1;
  }

  function drawScene(state: DopplerState): void {
    const c = ctx;
    if (!c || !canvas) return;

    const p = PALETTE[theme === 'dark' ? 'dark' : 'light'];
    const laneY = getLaneY();
    // 演示模式：几何坐标不变，字号/线宽/关键点按 contentScale 放大
    const cs = getContentScale();
    const s = responsiveScale * cs;

    // 清除
    c.clearRect(0, 0, cssW, cssH);
    c.fillStyle = p.bg;
    c.fillRect(0, 0, cssW, cssH);

    // 网格
    c.strokeStyle = p.grid;
    c.lineWidth = 1;
    for (let m = 0; m <= 30; m += 5) {
      const x = worldToPixelX(m);
      c.beginPath();
      c.moveTo(x, 30);
      c.lineTo(x, cssH - 20);
      c.stroke();
    }

    // X 轴
    c.strokeStyle = p.axis;
    c.lineWidth = 2 * cs;
    c.beginPath();
    c.moveTo(MARGIN_LEFT, laneY);
    c.lineTo(cssW - MARGIN_RIGHT, laneY);
    c.stroke();
    // 箭头
    c.fillStyle = p.axis;
    const axEnd = cssW - MARGIN_RIGHT;
    c.beginPath();
    c.moveTo(axEnd, laneY);
    c.lineTo(axEnd - 8 * cs, laneY - 4 * cs);
    c.lineTo(axEnd - 8 * cs, laneY + 4 * cs);
    c.closePath();
    c.fill();

    // 刻度标签
    c.font = `${11 * cs}px sans-serif`;
    c.fillStyle = p.label;
    c.textAlign = 'center';
    for (let i = 0; i <= 30; i += 5) {
      const x = worldToPixelX(i);
      c.fillText(`${i}`, x, laneY + 18 * cs);
    }
    c.textAlign = 'left';
    c.fillText('x (m)', cssW - MARGIN_RIGHT - 35, laneY + 32 * cs);

    // 波环
    for (const ring of state.waveRings) {
      const age = state.time - ring.birthTime;
      const radiusM = SOUND_SPEED * age;
      const radiusPx =
        (radiusM / (WORLD_MAX - WORLD_MIN)) *
        (cssW - MARGIN_LEFT - MARGIN_RIGHT);
      const cx = worldToPixelX(ring.x);
      const cy = laneY;

      if (radiusPx < 1 || radiusPx > cssW * 2) continue;

      // 判断前方/后方
      const sign = state.params.sourceSpeed;
      const isFront =
        sign > 0
          ? ring.x > state.sourceX - age * sign
          : sign < 0
            ? ring.x < state.sourceX - age * sign
            : false;
      const colorBase = isFront ? p.waveFront : p.waveBack;

      // 透明度随半径衰减
      const alpha = Math.max(0.08, 0.6 - radiusM / 80);
      c.beginPath();
      c.arc(cx, cy, radiusPx, 0, Math.PI * 2);
      c.strokeStyle = `${colorBase}${alpha.toFixed(2)})`;
      c.lineWidth = Math.max(1.5, 2.5 * s);
      c.stroke();
    }

    // 波源
    const sx = worldToPixelX(state.sourceX);
    const carW = 32 * s;
    const carH = 24 * s;
    const carTop = laneY - carH / 2 - 4 * cs;

    c.fillStyle = p.source;
    c.fillRect(sx - carW / 2, carTop, carW, carH);
    c.fillStyle = p.sourceBody;
    c.fillRect(
      sx - carW / 2 + 4 * cs,
      carTop - 10 * cs,
      carW - 8 * cs,
      10 * cs
    );
    // 轮子
    c.fillStyle = p.wheel;
    const wheelR = 5 * s;
    c.beginPath();
    c.arc(sx - carW / 4, carTop + carH + 1, wheelR, 0, Math.PI * 2);
    c.arc(sx + carW / 4, carTop + carH + 1, wheelR, 0, Math.PI * 2);
    c.fill();
    // 车灯
    c.fillStyle = p.headlight;
    c.beginPath();
    c.arc(sx, carTop - 3 * cs, 3 * s, 0, Math.PI * 2);
    c.fill();

    // 速度箭头
    if (Math.abs(state.params.sourceSpeed) > 0.1) {
      const dir = state.params.sourceSpeed > 0 ? 1 : -1;
      const arrowX = sx + dir * (carW / 2 + 8 * cs);
      drawArrow(
        c,
        arrowX,
        carTop + carH / 2 - 4 * cs,
        arrowX + dir * 16 * cs,
        carTop + carH / 2 - 4 * cs,
        p.source,
        2 * cs
      );
    }

    c.fillStyle = p.text;
    c.font = `bold ${12 * cs}px sans-serif`;
    c.textAlign = 'center';
    c.fillText('波源', sx, carTop - 16 * cs);
    c.font = `${11 * cs}px sans-serif`;
    c.fillText(
      `${state.params.sourceSpeed.toFixed(1)} m/s`,
      sx,
      laneY + carH / 2 + 20 * cs
    );

    // 观察者
    const ox = worldToPixelX(state.observerX);
    const personR = 8 * s;
    const bodyH = 20 * s;

    // 闪光
    if (state.waveArrived) {
      c.fillStyle = p.flash;
      c.beginPath();
      c.arc(ox, laneY - 12 * cs, 22 * s, 0, Math.PI * 2);
      c.fill();
    }

    c.fillStyle = p.observer;
    c.beginPath();
    c.arc(ox, laneY - bodyH - personR, personR, 0, Math.PI * 2);
    c.fill();
    c.fillRect(ox - 5 * s, laneY - bodyH, 10 * s, bodyH);
    // 腿
    c.strokeStyle = p.observer;
    c.lineWidth = 3 * s;
    c.beginPath();
    c.moveTo(ox - 4 * s, laneY);
    c.lineTo(ox - 4 * s, laneY + 12 * s);
    c.moveTo(ox + 4 * s, laneY);
    c.lineTo(ox + 4 * s, laneY + 12 * s);
    c.stroke();

    // 速度箭头
    if (Math.abs(state.params.observerSpeed) > 0.1) {
      const dir = state.params.observerSpeed > 0 ? 1 : -1;
      const arrowX = ox + dir * 12 * cs;
      drawArrow(
        c,
        arrowX,
        laneY - bodyH / 2,
        arrowX + dir * 16 * cs,
        laneY - bodyH / 2,
        p.observer,
        2 * cs
      );
    }

    c.fillStyle = p.text;
    c.font = `bold ${12 * cs}px sans-serif`;
    c.textAlign = 'center';
    c.fillText('观察者', ox, laneY - bodyH - personR - 10 * cs);
    c.font = `${11 * cs}px sans-serif`;
    c.fillText(
      `${state.params.observerSpeed.toFixed(1)} m/s`,
      ox,
      laneY + 26 * cs
    );
  }

  function drawArrow(
    c: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    width: number
  ): void {
    const headLen = 7;
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
    c.lineTo(
      x2 - headLen * Math.cos(angle - Math.PI / 6),
      y2 - headLen * Math.sin(angle - Math.PI / 6)
    );
    c.lineTo(
      x2 - headLen * Math.cos(angle + Math.PI / 6),
      y2 - headLen * Math.sin(angle + Math.PI / 6)
    );
    c.closePath();
    c.fill();
  }

  // ── Canvas 交互 ──

  function handlePointerDown(e: PointerEvent): void {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // 获取当前 state 需要的坐标
    const srcPx = worldToPixelX(cachedSourceX);
    const obsPx = worldToPixelX(cachedObserverX);
    const laneY = getLaneY();

    const hitRadius = 25 * responsiveScale;
    if (
      Math.abs(px - srcPx) < hitRadius &&
      Math.abs(py - laneY) < hitRadius * 1.5
    ) {
      dragTarget = 'source';
      canvas.setPointerCapture(e.pointerId);
    } else if (
      Math.abs(px - obsPx) < hitRadius &&
      Math.abs(py - laneY) < hitRadius * 1.5
    ) {
      dragTarget = 'observer';
      canvas.setPointerCapture(e.pointerId);
    } else {
      // 点击空白放置观察者
      const wx = pixelToWorldX(px);
      if (wx >= CANVAS_MIN && wx <= CANVAS_MAX) {
        onPointClickCallback?.(wx);
      }
    }
  }

  function handlePointerMove(e: PointerEvent): void {
    if (!canvas || !dragTarget) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const wx = pixelToWorldX(px);
    const clamped = Math.max(CANVAS_MIN, Math.min(CANVAS_MAX, wx));
    onDragCallback?.(dragTarget, clamped);
  }

  function handlePointerUp(): void {
    dragTarget = null;
  }

  function attachEvents(): void {
    if (!canvas) return;
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.style.cursor = 'crosshair';
  }

  function detachEvents(): void {
    if (!canvas) return;
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerup', handlePointerUp);
  }

  // 初始化
  if (canvas) {
    resizeCanvas();
    attachEvents();
  }

  return {
    render(state: DopplerState): void {
      cachedSourceX = state.sourceX;
      cachedObserverX = state.observerX;
      resizeCanvas();
      drawScene(state);
    },
    resize(): void {
      resizeCanvas();
    },
    setTheme(t: TeachingTheme): void {
      theme = t;
    },
    setMode(m: TeachingMode, hints?: DemoRenderHints): void {
      mode = m;
      demoHints = hints;
    },
    setOnDrag(cb: (entity: 'source' | 'observer', x: number) => void): void {
      onDragCallback = cb;
    },
    setOnPointClick(cb: (x: number) => void): void {
      onPointClickCallback = cb;
    },
    dispose(): void {
      detachEvents();
      canvas = null;
      ctx = null;
    }
  };
}
