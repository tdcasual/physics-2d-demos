import type { SpringOscillatorSim } from './scene.sim';
import type { TeachingMode } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import { setCanvasSize, sizeCanvasToFill } from '../../core/canvas-sizing';
import { Colors } from '../../core/colors';
import { drawOscillatorCell } from './renderer/draw-oscillator';
import {
  drawGraph,
  updateHistory,
  createEmptyChartState,
  createGraphCanvas,
  type ChartState
} from './renderer/draw-graph';
import type { ClickArea } from './renderer/types';

import type { DemoRenderHints } from '../../platform/demo-profile';
import { calculateGridLayout, getDeviceType } from './view-layout';

/** 弹簧振子视图构造选项 */
export type SpringOscillatorViewOptions = {
  graphCanvas?: HTMLCanvasElement;
  stageCanvas?: HTMLCanvasElement;
  sim?: SpringOscillatorSim;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  theme?: TeachingTheme;
  onToggleOscillator?: (id: string) => void;
};

/**
 * 创建弹簧振子视图实例
 *
 * 负责管理舞台 Canvas 与图表 Canvas 的渲染、事件绑定及生命周期。
 * 返回的视图对象包含 `render`、`resize`、`dispose` 等标准接口，
 * 供 {@link createSceneShell} 调用。
 *
 * @param options - 视图构造选项
 * @returns 视图控制对象
 */
export function createSpringOscillatorView(
  options: SpringOscillatorViewOptions = {}
) {
  let graphCanvas = options.graphCanvas ?? null;
  let stageCanvas = options.stageCanvas ?? null;
  let graphCtx = graphCanvas?.getContext('2d') ?? null;
  let stageCtx = stageCanvas?.getContext('2d') ?? null;
  let sim = options.sim ?? null;

  let theme: TeachingTheme = options.theme ?? 'dark';
  // demoHints reserved for future demo profile integration
  let onToggleOscillator = options.onToggleOscillator;

  let graphWidth = 400;
  let graphHeight = 300;
  let stageWidth = 800;
  let stageHeight = 600;
  let responsiveScale = 1;

  // 图表 Canvas 状态
  let chartCanvasDisposer: (() => void) | null = null;
  let chartState: ChartState = createEmptyChartState();

  // 每个振子的历史轨迹
  const history: Map<string, Array<{ t: number; x: number }>> = new Map();

  // 点击区域记录
  const clickAreas: ClickArea[] = [];

  // 帧计数器（实例级，用于移动端降采样）
  let frameCount = 0;

  function resizeGraphCanvas(): void {
    if (chartCanvasDisposer) return;
    if (!graphCanvas || !graphCtx) return;
    const parent = graphCanvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const newWidth = Math.max(200, Math.floor(rect.width || 400));
    const newHeight = Math.max(150, Math.floor(rect.height || 300));

    if (newWidth !== graphWidth || newHeight !== graphHeight) {
      graphWidth = newWidth;
      graphHeight = newHeight;
      setCanvasSize(graphCanvas, graphWidth, graphHeight, false);
    }
  }

  function resizeStageCanvas(): void {
    if (!stageCanvas || !stageCtx) return;
    const newCtx = sizeCanvasToFill(stageCanvas);
    if (newCtx) {
      stageCtx = newCtx;
    }
    const rect = stageCanvas.getBoundingClientRect();
    stageWidth = Math.max(200, Math.floor(rect.width || 800));
    stageHeight = Math.max(150, Math.floor(rect.height || 600));
    responsiveScale = parseFloat(stageCanvas.dataset.responsiveScale || '1');
  }

  function drawStage(): void {
    if (!stageCtx || !stageCanvas || !sim) return;

    const isDark = theme === 'dark';
    const width = stageWidth;
    const height = stageHeight;

    clickAreas.length = 0;
    stageCtx.clearRect(0, 0, width, height);
    stageCtx.fillStyle = isDark ? Colors.darkBg : Colors.bg;
    stageCtx.fillRect(0, 0, width, height);

    const ctx = stageCtx;

    if (sim.oscillators.length === 0) {
      const s = responsiveScale;
      ctx.fillStyle = Colors.gray;
      ctx.font = `${Math.round(16 * s)}px "Noto Sans SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('点击"添加振子"开始演示', width / 2, height / 2 - 15 * s);
      ctx.font = `${Math.round(13 * s)}px "Noto Sans SC", sans-serif`;
      ctx.fillText('点击小球可开始/暂停运动', width / 2, height / 2 + 15 * s);
      return;
    }

    const total = sim.oscillators.length;
    const layout = calculateGridLayout(total, stageWidth, responsiveScale);
    const cellW = width / layout.cols;
    const cellH = height / layout.rows;

    // 网格分隔线
    ctx.strokeStyle = isDark
      ? 'rgba(128,128,128,0.15)'
      : 'rgba(128,128,128,0.25)';
    ctx.lineWidth = 1 * responsiveScale;

    for (let i = 1; i < layout.cols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellW, 0);
      ctx.lineTo(i * cellW, height);
      ctx.stroke();
    }
    for (let i = 1; i < layout.rows; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellH);
      ctx.lineTo(width, i * cellH);
      ctx.stroke();
    }

    // 绘制所有振子
    sim.oscillators.forEach((osc, index) => {
      const col = index % layout.cols;
      const row = Math.floor(index / layout.cols);
      const cellX = col * cellW;
      const cellY = row * cellH;
      const area = drawOscillatorCell(
        ctx,
        osc,
        index,
        cellX,
        cellY,
        cellW,
        cellH,
        theme,
        { responsiveScale }
      );
      clickAreas.push(area);
    });
  }

  function handlePointerDown(event: PointerEvent): void {
    if (!stageCanvas || clickAreas.length === 0) return;

    const rect = stageCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (stageWidth / rect.width);
    const y = (event.clientY - rect.top) * (stageHeight / rect.height);

    for (const area of clickAreas) {
      if (
        x >= area.left &&
        x <= area.right &&
        y >= area.top &&
        y <= area.bottom
      ) {
        event.preventDefault();
        onToggleOscillator?.(area.id);
        return;
      }
    }
  }

  function bindEvents(): void {
    if (!stageCanvas) return;
    stageCanvas.style.touchAction = 'none';
    stageCanvas.addEventListener('pointerdown', handlePointerDown);
  }

  function unbindEvents(): void {
    if (!stageCanvas) return;
    stageCanvas.removeEventListener('pointerdown', handlePointerDown);
  }

  bindEvents();

  function drawChart(): void {
    const ctx = chartState.ctx || graphCtx;
    const cssWidth = chartState.cssWidth || graphWidth;
    const cssHeight = chartState.cssHeight || graphHeight;
    if (!ctx || cssWidth <= 0 || cssHeight <= 0 || !sim) return;

    drawGraph(
      ctx,
      sim,
      history,
      theme,
      cssWidth,
      cssHeight,
      chartState.dpr || 1,
      chartState.hairlineWidth || 1,
      chartState.canvas || graphCanvas!
    );
  }

  return {
    render(): void {
      const currentSim = sim;
      if (currentSim) {
        const deviceType = getDeviceType(responsiveScale);
        const result = updateHistory(
          currentSim,
          history,
          deviceType,
          frameCount
        );
        frameCount = result.newFrameCount;
      }

      drawChart();

      drawStage();
    },

    reset(): void {
      history.clear();
      frameCount = 0;
      drawStage();
    },

    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      if (chartCanvasDisposer) {
        chartCanvasDisposer();
        chartCanvasDisposer = null;
      }

      graphCanvas = canvas;
      graphCtx = canvas.getContext('2d');

      const parent = canvas.parentElement;
      if (parent) {
        const { state, dispose } = createGraphCanvas(parent, (s) => {
          chartState = s;
          drawChart();
        });
        chartCanvasDisposer = dispose;
        chartState = state;
      } else {
        resizeGraphCanvas();
      }
      drawChart();
    },

    attachStageCanvas(canvas: HTMLCanvasElement): void {
      unbindEvents();
      stageCanvas = canvas;
      stageCtx = canvas.getContext('2d');
      resizeStageCanvas();
      bindEvents();
    },

    resize(): void {
      resizeGraphCanvas();
      resizeStageCanvas();
    },

    setMode(_mode?: TeachingMode, _hints?: DemoRenderHints): void {
      // no-op for now
    },

    setTheme(nextTheme: TeachingTheme): void {
      theme = nextTheme;
    },

    setSim(nextSim: SpringOscillatorSim): void {
      sim = nextSim;
    },

    setOnToggleOscillator(callback: (id: string) => void): void {
      onToggleOscillator = callback;
    },

    removeOscillatorHistory(id: string): void {
      history.delete(id);
    },

    dispose(): void {
      unbindEvents();
      history.clear();
      clickAreas.length = 0;
      if (chartCanvasDisposer) {
        chartCanvasDisposer();
        chartCanvasDisposer = null;
      }
      chartState = createEmptyChartState();
      graphCanvas = null;
      stageCanvas = null;
      graphCtx = null;
      stageCtx = null;
      sim = null;
    }
  };
}
