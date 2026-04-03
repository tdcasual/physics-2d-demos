/**
 * LineChart - 通用折线图渲染器
 *
 * 支持：
 * - 多系列数据叠加
 * - 自适应坐标轴与标签密度
 * - 高DPI 清晰渲染（hairline 细线）
 * - 主题切换
 * - 响应式边距（根据画布尺寸动态调整）
 */

import type { ChartCanvasState } from './chart-canvas';
import type { ChartTheme } from './chart-theme';

export interface LineChartSeries {
  id: string;
  label?: string;
  color: string;
  data: Array<{ x: number; y: number }>;
  /** 是否显示数据点 */
  showPoints?: boolean;
}

export interface LineChartOptions {
  state: ChartCanvasState;
  theme: ChartTheme;
  series: LineChartSeries[];
  /**
   * X轴显示范围 [min, max]，不提供则自动计算
   */
  xDomain?: [number, number];
  /**
   * Y轴显示范围 [min, max]，不提供则自动计算
   */
  yDomain?: [number, number];
  /**
   * 边距
   */
  margin?: { top: number; right: number; bottom: number; left: number };
  /**
   * X轴标题
   */
  xLabel?: string;
  /**
   * Y轴标题
   */
  yLabel?: string;
  /**
   * 是否显示网格
   */
  showGrid?: boolean;
  /**
   * Y轴基线（如 0），用于对齐网格
   */
  yBaseLine?: number;
}

function niceNumber(range: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction: number;
  if (round) {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * Math.pow(10, exponent);
}

function calculateTicks(min: number, max: number, maxTicks: number = 5): { min: number; max: number; step: number; values: number[] } {
  const range = niceNumber(max - min, false);
  const step = niceNumber(range / (maxTicks - 1), true);
  const graphMin = Math.floor(min / step) * step;
  const graphMax = Math.ceil(max / step) * step;
  const values: number[] = [];
  for (let v = graphMin; v <= graphMax + step * 0.001; v += step) {
    values.push(parseFloat(v.toFixed(10)));
  }
  return { min: graphMin, max: graphMax, step, values };
}

export function renderLineChart(options: LineChartOptions): void {
  const { state, theme, series, margin, xLabel, yLabel, showGrid = true, yBaseLine = 0 } = options;
  const { ctx, cssWidth: width, cssHeight: height, hairlineWidth } = state;

  if (!series.length) return;

  // 自适应边距
  const m = margin ?? {
    top: height < 250 ? 16 : 24,
    right: width < 350 ? 10 : 16,
    bottom: height < 250 ? 28 : 36,
    left: width < 350 ? 36 : 44
  };

  const chartWidth = Math.max(50, width - m.left - m.right);
  const chartHeight = Math.max(30, height - m.top - m.bottom);

  // 清空
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  // 计算数据域
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;

  for (const s of series) {
    for (const p of s.data) {
      xMin = Math.min(xMin, p.x);
      xMax = Math.max(xMax, p.x);
      yMin = Math.min(yMin, p.y);
      yMax = Math.max(yMax, p.y);
    }
  }

  if (!isFinite(xMin)) { xMin = 0; xMax = 1; }
  if (!isFinite(yMin)) { yMin = 0; yMax = 1; }

  const finalXDomain: [number, number] = options.xDomain ?? [xMin, xMax || xMin + 1];
  let finalYDomain: [number, number] = options.yDomain ?? [yMin, yMax || yMin + 1];

  // 如果Y域很窄，给一个最小范围避免扁平
  if (finalYDomain[1] - finalYDomain[0] < 0.001) {
    const mid = (finalYDomain[0] + finalYDomain[1]) / 2;
    finalYDomain = [mid - 0.5, mid + 0.5];
  }

  const xScale = chartWidth / (finalXDomain[1] - finalXDomain[0]);
  const yScale = chartHeight / (finalYDomain[1] - finalYDomain[0]);

  function mapX(x: number): number {
    return m.left + (x - finalXDomain[0]) * xScale;
  }

  function mapY(y: number): number {
    return m.top + chartHeight - (y - finalYDomain[0]) * yScale;
  }

  // 根据画布宽度决定刻度数量
  const xTickCount = width < 300 ? 3 : width < 500 ? 4 : 5;
  const yTickCount = height < 250 ? 3 : height < 400 ? 4 : 5;

  const xTicks = calculateTicks(finalXDomain[0], finalXDomain[1], xTickCount);
  const yTicks = calculateTicks(finalYDomain[0], finalYDomain[1], yTickCount);

  // 绘制网格
  if (showGrid) {
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = hairlineWidth;
    ctx.beginPath();

    // 垂直网格
    for (const xv of xTicks.values) {
      const x = mapX(xv);
      if (x >= m.left && x <= m.left + chartWidth) {
        ctx.moveTo(x, m.top);
        ctx.lineTo(x, m.top + chartHeight);
      }
    }

    // 水平网格
    for (const yv of yTicks.values) {
      const y = mapY(yv);
      if (y >= m.top && y <= m.top + chartHeight) {
        ctx.moveTo(m.left, y);
        ctx.lineTo(m.left + chartWidth, y);
      }
    }

    ctx.stroke();
  }

  // 绘制坐标轴
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = hairlineWidth * 1.5;
  ctx.beginPath();
  // X轴
  ctx.moveTo(m.left, m.top + chartHeight);
  ctx.lineTo(m.left + chartWidth, m.top + chartHeight);
  // Y轴
  ctx.moveTo(m.left, m.top);
  ctx.lineTo(m.left, m.top + chartHeight);
  ctx.stroke();

  // 绘制基线（如 y=0）
  const baseY = mapY(yBaseLine);
  if (baseY >= m.top && baseY <= m.top + chartHeight) {
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = hairlineWidth;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(m.left, baseY);
    ctx.lineTo(m.left + chartWidth, baseY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 刻度标签
  ctx.fillStyle = theme.textSecondary;
  ctx.textBaseline = 'middle';
  ctx.font = `${height < 250 ? 10 : 11}px "Noto Sans SC", sans-serif`;

  // X轴标签
  ctx.textAlign = 'center';
  for (const xv of xTicks.values) {
    const x = mapX(xv);
    if (x >= m.left - 5 && x <= m.left + chartWidth + 5) {
      const text = Number.isInteger(xv) ? String(xv) : xv.toFixed(1);
      ctx.fillText(text, x, m.top + chartHeight + (height < 250 ? 12 : 16));
    }
  }

  // Y轴标签
  ctx.textAlign = 'right';
  for (const yv of yTicks.values) {
    const y = mapY(yv);
    if (y >= m.top - 5 && y <= m.top + chartHeight + 5) {
      const text = Number.isInteger(yv) ? String(yv) : yv.toFixed(1);
      ctx.fillText(text, m.left - 6, y);
    }
  }

  // 轴标题
  if (xLabel) {
    ctx.fillStyle = theme.text;
    ctx.font = `bold ${height < 250 ? 10 : 11}px "Noto Sans SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(xLabel, m.left + chartWidth - 20, m.top + chartHeight / 2 + 14);
  }

  if (yLabel) {
    ctx.fillStyle = theme.text;
    ctx.font = `bold ${height < 250 ? 10 : 11}px "Noto Sans SC", sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(yLabel, m.left - 6, m.top + 8);
  }

  // 绘制数据系列
  for (const s of series) {
    if (s.data.length < 2) continue;

    ctx.strokeStyle = s.color;
    ctx.lineWidth = Math.max(hairlineWidth * 2, 1.5);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();

    let first = true;
    for (const p of s.data) {
      const x = mapX(p.x);
      const y = mapY(p.y);
      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // 数据点
    if (s.showPoints) {
      ctx.fillStyle = s.color;
      for (const p of s.data) {
        const x = mapX(p.x);
        const y = mapY(p.y);
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
