/**
 * 波的干涉 — 视图层
 *
 * 主画布：网格、坐标轴、双波、合成波、观察线（多条）、图例
 * 独立图表画布：各观察点的振动历史 X-t 曲线
 */

import type { WaveState, WaveParams } from './scene.sim';
import { WAVE_SPEED, DOMAIN_MAX, computeInterference } from './scene.sim';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
export {
  createXtGraphRenderer,
  type XtGraphRenderer
} from './xt-graph-renderer';
import type { DemoRenderHints } from '../../platform/demo-profile';

export type CreateWaveInterferenceViewOptions = {
  canvas: HTMLCanvasElement;
  theme?: 'light' | 'dark';
  mode?: 'normal' | 'presentation';
  demoHints?: DemoRenderHints;
};

/** 观察点颜色池 */
export const OBSERVER_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4' // cyan
];

export function getObserverColor(index: number): string {
  return OBSERVER_COLORS[index % OBSERVER_COLORS.length];
}

export function createWaveInterferenceView(
  options: CreateWaveInterferenceViewOptions
) {
  const canvas = options.canvas;
  let ctx: CanvasRenderingContext2D | null = null;

  let theme: 'light' | 'dark' = options.theme ?? 'light';
  let width = 0;
  let height = 0;
  let responsiveScale = 1;

  let scaleX = 1;
  let scaleY = 1;
  let viewDomainMax = DOMAIN_MAX;
  let originX = 50;
  let originY = 0;

  // Observer interaction state
  let isDragging = false;
  let dragIndex = -1; // -1 = primary observer
  let currentObserverX = 15;
  let onObserverMove: ((index: number, x: number) => void) | null = null;

  const PULSE_WIDTH = 4;
  const PULSE_PERIOD = 8;
  const PULSE_DELAY = 2;

  function pulseEnvelope(x: number, center: number, width: number): number {
    const sigma = width / 3;
    return Math.exp(-Math.pow((x - center) / sigma, 2));
  }

  function resize(): void {
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;

    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    responsiveScale = parseFloat(canvas.dataset.responsiveScale || '1');

    // Adaptive domain: narrow screens show fewer meters for clearer wave rendering
    // Threshold ~1.08 corresponds to short edge ~432px (tablet portrait)
    viewDomainMax = responsiveScale < 1.08 ? 20 : DOMAIN_MAX;
    originX = 50 * responsiveScale;
    scaleX = (width - originX * 2) / viewDomainMax;
    // Reduced vertical margin to give wave more display height on mobile
    scaleY = (height / 2 - 22 * responsiveScale) / 16;
    originY = height / 2;
  }

  function worldToPixelX(x: number): number {
    return originX + x * scaleX;
  }

  function worldToPixelY(y: number): number {
    return originY - y * scaleY;
  }

  function pixelToWorldX(px: number): number {
    return (px - originX) / scaleX;
  }

  function getColors() {
    const isDark = theme === 'dark';
    return {
      bg: isDark ? '#0f172a' : '#ffffff',
      grid: isDark ? '#1e293b' : '#f3f4f6',
      axis: isDark ? '#94a3b8' : '#374151',
      label: isDark ? '#cbd5e1' : '#6b7280',
      text: isDark ? '#e2e8f0' : '#1f2937',
      wave1: '#3b82f6',
      wave2: '#ef4444',
      interference: '#8b5cf6'
    };
  }

  function drawMainCanvas(state: WaveState): void {
    if (!ctx || width === 0 || height === 0) return;

    const colors = getColors();
    const params = state.params;
    const t = state.time;

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let m = 0; m <= viewDomainMax; m += 5) {
      const x = worldToPixelX(m);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // X-axis
    const rightMargin = 30 * responsiveScale;
    ctx.strokeStyle = colors.axis;
    ctx.lineWidth = 2 * responsiveScale;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(width - rightMargin, originY);
    ctx.stroke();

    // Arrow
    ctx.beginPath();
    ctx.moveTo(width - rightMargin, originY);
    ctx.lineTo(
      width - rightMargin - 10 * responsiveScale,
      originY - 5 * responsiveScale
    );
    ctx.lineTo(
      width - rightMargin - 10 * responsiveScale,
      originY + 5 * responsiveScale
    );
    ctx.closePath();
    ctx.fillStyle = colors.axis;
    ctx.fill();

    // Labels
    ctx.fillStyle = colors.label;
    ctx.font = `${12 * responsiveScale}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(
      'x (m)',
      width - rightMargin - 20 * responsiveScale,
      originY + 25 * responsiveScale
    );
    for (let i = 0; i <= viewDomainMax; i += 5) {
      const x = worldToPixelX(i);
      ctx.fillText(
        i.toString(),
        x - 5 * responsiveScale,
        originY + 20 * responsiveScale
      );
    }

    const phaseRad = (params.phaseDiff * Math.PI) / 180;
    const k1 = (2 * Math.PI * params.freq1) / WAVE_SPEED;
    const k2 = (2 * Math.PI * params.freq2) / WAVE_SPEED;
    const omega1 = 2 * Math.PI * params.freq1;
    const omega2 = 2 * Math.PI * params.freq2;

    let pulseCenter1: number | undefined;
    let pulseCenter2: number | undefined;
    if (params.isPulseMode) {
      pulseCenter1 = WAVE_SPEED * (t % PULSE_PERIOD) - PULSE_WIDTH / 2;
      const t2 = (t - PULSE_DELAY + PULSE_PERIOD * 10) % PULSE_PERIOD;
      pulseCenter2 = viewDomainMax + PULSE_WIDTH / 2 - WAVE_SPEED * t2;
    }

    if (params.mode === 'head-on') {
      if (params.showWave1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
        ctx.lineWidth = 3 * responsiveScale;
        ctx.setLineDash([4, 4]);
        for (let x = 0; x <= viewDomainMax; x += 0.05) {
          const env = params.isPulseMode
            ? pulseEnvelope(x, pulseCenter1!, PULSE_WIDTH)
            : 1;
          const y = params.amp1 * Math.sin(k1 * x - omega1 * t) * env;
          const px = worldToPixelX(x);
          const py = worldToPixelY(y);
          if (x === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = colors.wave1;
        ctx.beginPath();
        ctx.arc(worldToPixelX(0), originY, 6 * responsiveScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText('A', worldToPixelX(0) - 3, originY + 20 * responsiveScale);
      }

      if (params.showWave2) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 3 * responsiveScale;
        ctx.setLineDash([4, 4]);
        for (let x = 0; x <= viewDomainMax; x += 0.05) {
          const env = params.isPulseMode
            ? pulseEnvelope(x, pulseCenter2!, PULSE_WIDTH)
            : 1;
          const y =
            params.amp2 *
            Math.sin(k2 * (viewDomainMax - x) - omega2 * t + phaseRad) *
            env;
          const px = worldToPixelX(x);
          const py = worldToPixelY(y);
          if (x === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = colors.wave2;
        ctx.beginPath();
        ctx.arc(
          worldToPixelX(viewDomainMax),
          originY,
          6 * responsiveScale,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.fillText(
          'B',
          worldToPixelX(viewDomainMax) - 3,
          originY + 20 * responsiveScale
        );
      }

      if (params.showInterference) {
        ctx.beginPath();
        ctx.strokeStyle = colors.interference;
        ctx.lineWidth = 4 * responsiveScale;
        for (let x = 0; x <= viewDomainMax; x += 0.05) {
          const env1 = params.isPulseMode
            ? pulseEnvelope(x, pulseCenter1!, PULSE_WIDTH)
            : 1;
          const env2 = params.isPulseMode
            ? pulseEnvelope(x, pulseCenter2!, PULSE_WIDTH)
            : 1;
          const y1 = params.amp1 * Math.sin(k1 * x - omega1 * t) * env1;
          const y2 =
            params.amp2 *
            Math.sin(k2 * (viewDomainMax - x) - omega2 * t + phaseRad) *
            env2;
          const y = y1 + y2;
          const px = worldToPixelX(x);
          const py = worldToPixelY(y);
          if (x === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    } else {
      if (params.showWave1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
        ctx.lineWidth = 2.5 * responsiveScale;
        ctx.setLineDash([5, 5]);
        for (let x = 0; x <= viewDomainMax; x += 0.05) {
          const y = params.amp1 * Math.sin(k1 * x - omega1 * t);
          const px = worldToPixelX(x);
          const py = worldToPixelY(y);
          if (x === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (params.showWave2) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 2.5 * responsiveScale;
        ctx.setLineDash([5, 5]);
        for (let x = 0; x <= viewDomainMax; x += 0.05) {
          const y = params.amp2 * Math.sin(k2 * x - omega2 * t + phaseRad);
          const px = worldToPixelX(x);
          const py = worldToPixelY(y);
          if (x === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (params.showInterference) {
        ctx.beginPath();
        ctx.strokeStyle = colors.interference;
        ctx.lineWidth = 4 * responsiveScale;
        for (let x = 0; x <= viewDomainMax; x += 0.05) {
          const y1 = params.amp1 * Math.sin(k1 * x - omega1 * t);
          const y2 = params.amp2 * Math.sin(k2 * x - omega2 * t + phaseRad);
          const y = y1 + y2;
          const px = worldToPixelX(x);
          const py = worldToPixelY(y);
          if (x === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }

    // Ghost trail for primary observer
    drawGhostTrail(state);

    // Draw all observer lines
    drawObserverLines(state);

    // Legend
    drawLegend(params);
  }

  function drawObserverLines(state: WaveState): void {
    if (!ctx) return;
    const params = state.params;

    // Primary observer
    drawSingleObserverLine(params.observerX, 0, isDragging && dragIndex === -1);

    // Additional observers
    for (let i = 0; i < params.observers.length; i++) {
      drawSingleObserverLine(
        params.observers[i],
        i + 1,
        isDragging && dragIndex === i
      );
    }
  }

  function drawSingleObserverLine(
    x: number,
    colorIndex: number,
    isActive: boolean
  ): void {
    if (!ctx) return;
    const color = getObserverColor(colorIndex);
    const obsPixelX = worldToPixelX(x);

    ctx.strokeStyle = color;
    ctx.lineWidth = (isActive ? 3 : 2) * responsiveScale;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(obsPixelX, 10 * responsiveScale);
    ctx.lineTo(obsPixelX, height - 10 * responsiveScale);
    ctx.stroke();
    ctx.setLineDash([]);

    // Marker
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(obsPixelX, 15 * responsiveScale);
    ctx.lineTo(obsPixelX - 6 * responsiveScale, 25 * responsiveScale);
    ctx.lineTo(obsPixelX + 6 * responsiveScale, 25 * responsiveScale);
    ctx.closePath();
    ctx.fill();

    // Coordinate label
    ctx.font = `bold ${11 * responsiveScale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = getColors().text;
    const labelY = 38 * responsiveScale + colorIndex * 14 * responsiveScale;
    ctx.fillText(`x=${x.toFixed(2)}m`, obsPixelX, labelY);
    ctx.textAlign = 'left';
  }

  function drawGhostTrail(state: WaveState): void {
    if (!ctx || state.ghostTrail.length < 2) return;

    const obsPixelX = worldToPixelX(state.params.observerX);

    state.ghostTrail.forEach((point, i) => {
      const alpha = (i / state.ghostTrail.length) * 0.6;
      const radius = (2 + (i / state.ghostTrail.length) * 4) * responsiveScale;
      const py = worldToPixelY(point.y);

      const interference = computeInterference(state.params, point.x, point.t);
      let color: string;
      if (interference.intensityPct > 200)
        color = `rgba(239, 68, 68, ${alpha})`;
      else if (interference.intensityPct < 50)
        color = `rgba(59, 130, 246, ${alpha})`;
      else color = `rgba(139, 92, 246, ${alpha})`;

      ctx!.fillStyle = color;
      ctx!.beginPath();
      ctx!.arc(obsPixelX, py, radius, 0, Math.PI * 2);
      ctx!.fill();
    });
  }

  function drawLegend(params: WaveParams): void {
    if (!ctx) return;

    let y = 30 * responsiveScale;
    const startX = 60 * responsiveScale;
    ctx.font = `${12 * responsiveScale}px sans-serif`;

    if (params.mode === 'head-on') {
      if (params.showWave1) {
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(startX, y, 4 * responsiveScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = getColors().text;
        ctx.fillText(
          `源A (左): ${params.freq1.toFixed(1)}Hz →`,
          startX + 12 * responsiveScale,
          y + 4 * responsiveScale
        );
        y += 22 * responsiveScale;
      }
      if (params.showWave2) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(startX, y, 4 * responsiveScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = getColors().text;
        ctx.fillText(
          `源B (右): ${params.freq2.toFixed(1)}Hz ←`,
          startX + 12 * responsiveScale,
          y + 4 * responsiveScale
        );
        y += 22 * responsiveScale;
      }
    } else {
      if (params.showWave1) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
        ctx.lineWidth = 1.5 * responsiveScale;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + 30 * responsiveScale, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = getColors().text;
        ctx.fillText(
          `波1: ${params.freq1.toFixed(1)}Hz`,
          startX + 40 * responsiveScale,
          y + 4 * responsiveScale
        );
        y += 22 * responsiveScale;
      }
      if (params.showWave2) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 1.5 * responsiveScale;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + 30 * responsiveScale, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = getColors().text;
        ctx.fillText(
          `波2: ${params.freq2.toFixed(1)}Hz`,
          startX + 40 * responsiveScale,
          y + 4 * responsiveScale
        );
        y += 22 * responsiveScale;
      }
    }

    if (params.showInterference) {
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 4 * responsiveScale;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + 30 * responsiveScale, y);
      ctx.stroke();
      ctx.fillStyle = getColors().text;
      ctx.font = `bold ${12 * responsiveScale}px sans-serif`;
      ctx.fillText(
        '合成波',
        startX + 40 * responsiveScale,
        y + 4 * responsiveScale
      );
    }
  }

  function render(state: WaveState): void {
    if (!ctx || width === 0 || height === 0) {
      resize();
      if (!ctx || width === 0 || height === 0) return;
    }

    currentObserverX = state.params.observerX;
    drawMainCanvas(state);
  }

  function reset(): void {
    // No persistent trail in view itself
  }

  function setTheme(newTheme: 'light' | 'dark'): void {
    theme = newTheme;
  }

  function setMode(
    _newMode: 'normal' | 'presentation',
    _hints?: DemoRenderHints
  ): void {
    // no-op for now
  }

  // Canvas interaction for observer dragging
  function findNearestObserver(
    px: number,
    state?: WaveState
  ): { index: number; dist: number } {
    const primaryDist = Math.abs(px - worldToPixelX(currentObserverX));
    let best = { index: -1, dist: primaryDist };

    if (state) {
      for (let i = 0; i < state.params.observers.length; i++) {
        const d = Math.abs(px - worldToPixelX(state.params.observers[i]));
        if (d < best.dist) {
          best = { index: i, dist: d };
        }
      }
    }
    return best;
  }

  function handlePointerDown(event: PointerEvent): void {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (width / rect.width);
    const physX = pixelToWorldX(x);

    if (physX >= 0 && physX <= viewDomainMax) {
      const nearest = findNearestObserver(x);
      if (nearest.dist < 20 * responsiveScale) {
        isDragging = true;
        dragIndex = nearest.index;
        canvas.style.cursor = 'col-resize';
      } else {
        onObserverMove?.(-1, Math.max(0, Math.min(viewDomainMax, physX)));
      }
    }
  }

  function handlePointerMove(event: PointerEvent): void {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (width / rect.width);

    if (isDragging) {
      let physX = pixelToWorldX(x);
      physX = Math.max(0, Math.min(viewDomainMax, physX));
      onObserverMove?.(dragIndex, physX);
    } else {
      const nearest = findNearestObserver(x);
      if (nearest.dist < 15 * responsiveScale) {
        canvas.style.cursor = 'col-resize';
      } else {
        canvas.style.cursor = 'crosshair';
      }
    }
  }

  function handlePointerUp(): void {
    if (isDragging) {
      isDragging = false;
      dragIndex = -1;
      if (canvas) canvas.style.cursor = 'crosshair';
    }
  }

  canvas.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);

  resize();

  return {
    render,
    reset,
    resize,
    setTheme,
    setMode,
    setOnObserverMove(callback: (index: number, x: number) => void): void {
      onObserverMove = callback;
    },
    dispose(): void {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      ctx = null;
    }
  };
}

export type WaveInterferenceView = ReturnType<
  typeof createWaveInterferenceView
>;
