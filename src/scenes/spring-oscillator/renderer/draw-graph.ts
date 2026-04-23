import type { SpringOscillatorSim } from '../scene.sim';
import type { TeachingTheme } from '../../../platform/standards';
import {
  createChartCanvas,
  getChartTheme,
  renderLineChart,
  type LineChartSeries
} from '../../../core/chart';
import type { OscillatorHistory } from './types';

const HISTORY_DURATION = 10; // 显示最近 10 秒

export interface ChartState {
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  cssWidth: number;
  cssHeight: number;
  dpr: number;
  hairlineWidth: number;
}

export function createEmptyChartState(): ChartState {
  return {
    canvas: null,
    ctx: null,
    cssWidth: 0,
    cssHeight: 0,
    dpr: 1,
    hairlineWidth: 1
  };
}

export function createGraphCanvas(
  parent: HTMLElement,
  onResize: (state: ChartState) => void
): { state: ChartState; dispose: () => void } {
  const { state, dispose } = createChartCanvas(
    { container: parent, autoCreate: false },
    (s) => {
      onResize({
        canvas: s.canvas,
        ctx: s.ctx,
        cssWidth: s.cssWidth,
        cssHeight: s.cssHeight,
        dpr: s.dpr,
        hairlineWidth: s.hairlineWidth
      });
    }
  );
  return {
    state: {
      canvas: state.canvas,
      ctx: state.ctx,
      cssWidth: state.cssWidth,
      cssHeight: state.cssHeight,
      dpr: state.dpr,
      hairlineWidth: state.hairlineWidth
    },
    dispose
  };
}

export function drawGraph(
  ctx: CanvasRenderingContext2D,
  sim: SpringOscillatorSim,
  history: Map<string, OscillatorHistory>,
  theme: TeachingTheme,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
  hairlineWidth: number,
  canvas: HTMLCanvasElement
): void {
  const tEnd = sim.globalTime;
  const tStart = Math.max(0, tEnd - HISTORY_DURATION);

  // 组装系列数据
  const series: LineChartSeries[] = [];
  sim.oscillators.forEach((osc) => {
    const hist = history.get(osc.id);
    if (!hist || hist.length < 2) return;
    series.push({
      id: osc.id,
      color: osc.color,
      data: hist.map((p) => ({ x: p.t, y: p.x }))
    });
  });

  const chartTheme = getChartTheme(theme);

  renderLineChart({
    state: {
      ctx,
      cssWidth,
      cssHeight,
      dpr,
      hairlineWidth,
      canvas
    },
    theme: chartTheme,
    series,
    xDomain: [tStart, tEnd || tStart + 1],
    yDomain: [-20, 20],
    xLabel: 't (s)',
    yLabel: 'x (m)',
    showGrid: true,
    yBaseLine: 0
  });

  // 绘制当前位置点（外圈白 + 内圈彩）
  const margin = {
    top: cssHeight < 250 ? 16 : 24,
    right: cssWidth < 350 ? 10 : 16,
    bottom: cssHeight < 250 ? 28 : 36,
    left: cssWidth < 350 ? 36 : 44
  };
  const chartW = Math.max(50, cssWidth - margin.left - margin.right);
  const chartH = Math.max(30, cssHeight - margin.top - margin.bottom);
  const xScale = chartW / (tEnd - tStart || 1);
  const yScale = chartH / 40; // [-20, 20] => 40

  series.forEach((s) => {
    const last = s.data[s.data.length - 1];
    const px = margin.left + (last.x - tStart) * xScale;
    const py = margin.top + chartH / 2 - last.y * yScale;

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function updateHistory(
  sim: SpringOscillatorSim,
  history: Map<string, OscillatorHistory>,
  deviceType: 'mobile' | 'tablet' | 'desktop',
  frameCount: number
): { shouldRecord: boolean; newFrameCount: number } {
  const newFrameCount = frameCount + 1;
  // 移动端每2帧记录一次
  const shouldRecord = deviceType === 'mobile' ? newFrameCount % 2 === 0 : true;

  const globalTime = sim.globalTime;

  sim.oscillators.forEach((osc) => {
    // 暂停的振子：不添加新数据点，只限制最大点数
    if (!osc.isPlaying) {
      const hist = history.get(osc.id);
      if (hist && hist.length > 600) {
        hist.splice(0, hist.length - 600);
      }
      return;
    }

    let hist = history.get(osc.id);
    if (!hist) {
      hist = [];
      history.set(osc.id, hist);
    }

    if (shouldRecord) {
      // 避免重复记录同一时间点的数据
      if (hist.length === 0 || hist[hist.length - 1].t !== globalTime) {
        hist.push({ t: globalTime, x: osc.state.x });
      }
    }

    // 清理过期数据
    const cutoff = globalTime - HISTORY_DURATION;
    while (hist.length > 0 && hist[0].t < cutoff) {
      hist.shift();
    }

    // 限制最大点数
    const maxPoints = deviceType === 'mobile' ? 300 : 600;
    if (hist.length > maxPoints) {
      hist.splice(0, hist.length - maxPoints);
    }
  });

  return { shouldRecord, newFrameCount };
}
