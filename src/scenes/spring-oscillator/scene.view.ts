import type { SpringOscillatorSim, Oscillator } from './scene.sim';
import type { TeachingMode } from '../../app/teaching-standards';
import type { TeachingTheme } from '../../app/teaching-demo-shell';
import {
  setCanvasSize,
  fitCanvasToContainer,
  drawGrid
} from '../../core/unified-canvas';
import { Colors, alpha } from '../../core/colors';

export type SpringOscillatorViewOptions = {
  graphCanvas?: HTMLCanvasElement;
  stageCanvas?: HTMLCanvasElement;
  sim?: SpringOscillatorSim;
  mode?: TeachingMode;
  theme?: TeachingTheme;
  onToggleOscillator?: (id: string) => void;
};

// x-t 图表历史数据
const HISTORY_DURATION = 10; // 显示最近 10 秒

// 移动设备检测
function isMobileDevice(): boolean {
  return window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;
}

// 平板设备检测
function isTabletDevice(): boolean {
  const width = window.innerWidth;
  return width >= 768 && width < 1024;
}

// 获取设备类型
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// 帧计数器（用于移动端降采样）
let globalFrameCount = 0;

// 性能优化：是否记录当前帧
function shouldRecordFrame(deviceType: 'mobile' | 'tablet' | 'desktop'): boolean {
  globalFrameCount++;
  if (deviceType === 'mobile') {
    // 移动端：每2帧记录一次（30fps效果）
    return globalFrameCount % 2 === 0;
  }
  // 桌面端和平板：每帧都记录
  return true;
}

// 响应式尺寸配置
function getResponsiveSizes(deviceType: 'mobile' | 'tablet' | 'desktop', cellWidth: number) {
  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  
  // 弹簧最大长度：移动端更短，避免溢出
  const maxSpringLength = isMobile ? Math.min(cellWidth * 0.4, 80) : 
                          isTablet ? Math.min(cellWidth * 0.5, 120) : 
                          Math.min(cellWidth * 0.6, 180);
  
  // 位移缩放：移动端减小，避免小球跑出单元格
  const displacementScale = isMobile ? 2 : isTablet ? 3 : 4;
  
  // 小球半径：移动端更小
  const ballRadius = isMobile ? 14 : isTablet ? 18 : 22;
  
  // 字体大小：移动端更大（更易读）
  const labelFontSize = isMobile ? 14 : 12;
  const paramFontSize = isMobile ? 12 : 9;
  
  // 点击区域最小半径（触摸目标）
  const minClickRadius = isMobile ? 30 : 22;
  
  return {
    maxSpringLength,
    displacementScale,
    ballRadius,
    labelFontSize,
    paramFontSize,
    minClickRadius,
  };
}

export function createSpringOscillatorView(options: SpringOscillatorViewOptions = {}) {
  let graphCanvas = options.graphCanvas ?? null;
  let stageCanvas = options.stageCanvas ?? null;
  let graphCtx = graphCanvas?.getContext('2d') ?? null;
  let stageCtx = stageCanvas?.getContext('2d') ?? null;
  let sim = options.sim ?? null;

  let theme: TeachingTheme = options.theme ?? 'dark';
  let onToggleOscillator = options.onToggleOscillator;

  let graphWidth = 400;
  let graphHeight = 300;
  let stageWidth = 800;
  let stageHeight = 600;

  // 每个振子的历史轨迹
  const history: Map<string, Array<{ t: number; x: number }>> = new Map();

  // 点击区域记录（用于检测点击小球）
  const clickAreas: Array<{ id: string; x: number; y: number; r: number }> = [];

  function resizeGraphCanvas(): void {
    if (!graphCanvas || !graphCtx) return;
    // 获取父容器（.graph-slot）的尺寸，而不是 canvas 自身的尺寸
    // 这样当父容器变化时，canvas 会正确更新
    const parent = graphCanvas.parentElement;
    if (!parent) return;
    
    // 强制浏览器重排，确保获取最新的尺寸
    parent.getBoundingClientRect();
    
    const rect = parent.getBoundingClientRect();
    const newWidth = Math.max(200, Math.floor(rect.width || 400));
    const newHeight = Math.max(150, Math.floor(rect.height || 300));
    
    // 只有尺寸变化时才重新设置 canvas
    if (newWidth !== graphWidth || newHeight !== graphHeight) {
      graphWidth = newWidth;
      graphHeight = newHeight;
      // 不设置 CSS 尺寸（保持 width: 100%; height: 100%），只更新内部像素尺寸
      setCanvasSize(graphCanvas, graphWidth, graphHeight, false);
    }
  }

  function resizeStageCanvas(): void {
    if (!stageCanvas || !stageCtx) return;
    // 获取父容器（.stage-slot）的尺寸
    const parent = stageCanvas.parentElement;
    if (!parent) return;
    
    // 强制浏览器重排，确保获取最新的尺寸
    parent.getBoundingClientRect();
    
    const rect = parent.getBoundingClientRect();
    const newWidth = Math.max(320, Math.floor(rect.width || 800));
    const newHeight = Math.max(200, Math.floor(rect.height || 600));
    
    // 只有尺寸变化时才重新设置 canvas
    if (newWidth !== stageWidth || newHeight !== stageHeight) {
      stageWidth = newWidth;
      stageHeight = newHeight;
      // 不设置 CSS 尺寸，只更新内部像素尺寸
      setCanvasSize(stageCanvas, stageWidth, stageHeight, false);
    }
  }

  function getThemeColor(light: string, dark: string): string {
    return theme === 'light' ? light : dark;
  }

  // 绘制 x-t 图表
  function drawGraph(): void {
    if (!graphCtx || !graphCanvas || !sim) return;

    const width = graphWidth;
    const height = graphHeight;
    const isDark = theme === 'dark';

    // 清空画布
    graphCtx.clearRect(0, 0, width, height);

    // 背景
    graphCtx.fillStyle = isDark ? Colors.darkBg : Colors.bg;
    graphCtx.fillRect(0, 0, width, height);

    // 边距
    const margin = { top: 25, right: 12, bottom: 28, left: 38 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // 使用 unified-canvas 的网格绘制
    drawGrid(graphCtx, width, height, {
      originX: margin.left,
      originY: margin.top + chartHeight / 2,
      showGrid: true,
      showAxes: true,
      gridColor: isDark ? alpha(Colors.gray, 0.2) : alpha(Colors.grayLight, 0.3),
      axisColor: isDark ? Colors.mintLight : Colors.mint
    }, isDark);

    // 标签
    graphCtx.fillStyle = isDark ? Colors.darkText : Colors.dark;
    graphCtx.font = `bold 11px "Noto Sans SC", sans-serif`;
    graphCtx.textAlign = 'center';
    graphCtx.fillText('t (s)', width - margin.right - 15, margin.top + chartHeight / 2 + 14);
    graphCtx.textAlign = 'right';
    graphCtx.fillText('x (m)', margin.left - 6, margin.top + 8);

    // 时间刻度
    const tEnd = sim.globalTime;
    const tStart = Math.max(0, tEnd - HISTORY_DURATION);
    graphCtx.textAlign = 'center';
    graphCtx.fillStyle = isDark ? Colors.gray : Colors.gray;
    graphCtx.font = `10px "Noto Sans SC", sans-serif`;
    for (let i = 0; i <= 5; i++) {
      const t = tStart + (tEnd - tStart) * (i / 5);
      const x = margin.left + (chartWidth * i) / 5;
      graphCtx.fillText(t.toFixed(1), x, height - margin.bottom + 14);
    }

    // 位移刻度
    graphCtx.textAlign = 'right';
    const maxDisplayX = 20; // 显示范围 ±20m
    for (let i = -2; i <= 2; i++) {
      const y = margin.top + chartHeight / 2 - (i / 2) * (chartHeight / 2);
      if (y >= margin.top && y <= height - margin.bottom) {
        graphCtx.fillText(String(i * 10), margin.left - 4, y + 3);
      }
    }

    // 绘制每个振子的轨迹
    if (sim.oscillators.length === 0) return;

    const ctx = graphCtx;
    const zeroY = margin.top + chartHeight / 2;

    sim.oscillators.forEach(osc => {
      const hist = history.get(osc.id);
      if (!hist || hist.length < 2) return;

      ctx.strokeStyle = osc.color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      for (let i = 0; i < hist.length; i++) {
        const point = hist[i];
        const xRatio = (point.t - tStart) / (tEnd - tStart || 1);
        const px = margin.left + xRatio * chartWidth;
        const yRatio = point.x / maxDisplayX;
        const py = zeroY - yRatio * (chartHeight / 2);

        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      // 绘制当前位置点
      const last = hist[hist.length - 1];
      const xRatio = (last.t - tStart) / (tEnd - tStart || 1);
      const px = margin.left + xRatio * chartWidth;
      const yRatio = last.x / maxDisplayX;
      const py = zeroY - yRatio * (chartHeight / 2);

      // 外圈
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();

      // 内圈
      ctx.fillStyle = osc.color;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 绘制弹簧
  function drawSpring(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    coils: number,
    coilWidth: number,
    color: string
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 5) return;

    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(angle);

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const coilLen = len * 0.85;
    const startOffset = len * 0.075;
    const pointsPerCoil = 4;
    const totalPoints = coils * pointsPerCoil;

    ctx.moveTo(0, 0);
    ctx.lineTo(startOffset, 0);

    for (let i = 0; i <= totalPoints; i++) {
      const t = i / totalPoints;
      const x = startOffset + t * coilLen;
      const waveIndex = i % pointsPerCoil;
      let y = 0;
      if (waveIndex === 1) y = -coilWidth;
      else if (waveIndex === 3) y = coilWidth;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(len, 0);
    ctx.stroke();
    ctx.restore();
  }

  // 计算布局 - 根据设备类型优化
  function calculateGridLayout(total: number): { cols: number; rows: number } {
    const deviceType = getDeviceType();
    
    // 移动端：强制单列，垂直排列
    if (deviceType === 'mobile') {
      return { cols: 1, rows: total };
    }
    
    // 平板：最多2列
    if (deviceType === 'tablet') {
      if (total <= 2) return { cols: 1, rows: total };
      return { cols: 2, rows: Math.ceil(total / 2) };
    }
    
    // 桌面端：原有逻辑
    if (total <= 3) return { cols: 1, rows: total };
    if (total <= 6) return { cols: 2, rows: Math.ceil(total / 2) };
    return { cols: 3, rows: Math.ceil(total / 3) };
  }

  // 绘制单个振子
  function drawOscillatorCell(
    ctx: CanvasRenderingContext2D,
    osc: Oscillator,
    index: number,
    cellX: number,
    cellY: number,
    cellW: number,
    cellH: number
  ): void {
    const isDark = theme === 'dark';
    const centerX = cellX + cellW / 2;
    const centerY = cellY + cellH / 2 + 4;
    const isHorizontal = osc.params.orientation === 'horizontal';

    // 获取响应式尺寸配置
    const deviceType = getDeviceType();
    const sizes = getResponsiveSizes(deviceType, isHorizontal ? cellW : cellH);

    // 紧凑的单元格边距（移动端增加边距）
    const margin = deviceType === 'mobile' 
      ? { top: 28, bottom: 12, left: 12, right: 12 }
      : { top: 22, bottom: 8, left: 8, right: 8 };
    const drawW = cellW - margin.left - margin.right;
    const drawH = cellH - margin.top - margin.bottom;

    // 振子编号和状态（左上角显示）
    ctx.fillStyle = osc.color;
    ctx.font = `bold ${sizes.labelFontSize}px "Noto Sans SC", sans-serif`;
    ctx.textAlign = 'left';
    const statusText = osc.isPlaying ? '▶' : '⏸';
    ctx.fillText(`${index + 1}.${statusText}`, cellX + margin.left, cellY + (deviceType === 'mobile' ? 20 : 16));

    // 参数（右上角）
    ctx.fillStyle = isDark ? Colors.gray : Colors.gray;
    ctx.font = `${sizes.paramFontSize}px "Noto Sans SC", sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(`k=${osc.params.k} m=${osc.params.m}`, cellX + cellW - margin.right, cellY + (deviceType === 'mobile' ? 20 : 16));

    // 根据方向调整绘制参数（响应式尺寸）
    const springLength = Math.min(isHorizontal ? drawW * 0.5 : drawH * 0.5, sizes.maxSpringLength);
    const scale = sizes.displacementScale;
    const displacement = osc.state.x * scale;

    if (isHorizontal) {
      // ===== 水平弹簧振子 =====
      const equilibriumX = centerX + 10;
      const massX = equilibriumX + displacement;
      const fixedX = equilibriumX - springLength;
      const baseY = centerY;

      // 平衡位置虚线（短虚线）
      ctx.strokeStyle = isDark ? alpha(Colors.gray, 0.25) : alpha(Colors.grayLight, 0.4);
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(equilibriumX, baseY - 20);
      ctx.lineTo(equilibriumX, baseY + 25);
      ctx.stroke();
      ctx.setLineDash([]);

      // 固定端（墙面）
      ctx.fillStyle = isDark ? Colors.darkText : Colors.dark;
      ctx.fillRect(fixedX - 3, baseY - 18, 3, 36);
      ctx.strokeStyle = isDark ? Colors.darkText : Colors.dark;
      ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(fixedX - 5, baseY + i * 6);
        ctx.lineTo(fixedX - 2, baseY + i * 6 + 2);
        ctx.stroke();
      }

      // 弹簧（响应式尺寸）
      const springEndX = massX - sizes.ballRadius;
      if (springEndX > fixedX + 8) {
        // 移动端减少线圈数和宽度
        const coils = deviceType === 'mobile' ? 8 : 12;
        const coilWidth = deviceType === 'mobile' ? 12 : 18;
        drawSpring(ctx, fixedX, baseY, springEndX, baseY, coils, coilWidth, osc.color);
      }

      // 小球（响应式尺寸）
      const ballRadius = sizes.ballRadius;
      ctx.fillStyle = osc.color;
      ctx.beginPath();
      ctx.arc(massX, baseY, ballRadius, 0, Math.PI * 2);
      ctx.fill();

      // 光泽
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(massX - ballRadius * 0.25, baseY - ballRadius * 0.25, ballRadius * 0.25, 0, Math.PI * 2);
      ctx.fill();

      // 记录点击区域（确保触摸目标至少 30px）
      const clickCenterX = (fixedX + massX) / 2;
      const clickWidth = massX - fixedX + 40;
      clickAreas.push({ 
        id: osc.id, 
        x: clickCenterX, 
        y: baseY, 
        r: Math.max(clickWidth / 2, sizes.minClickRadius) 
      });

      // 相位标记
      const markerAngle = osc.state.phase;
      const markerX = massX + Math.cos(markerAngle) * 7;
      const markerY = baseY + Math.sin(markerAngle) * 7;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(markerX, markerY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 暂停状态遮罩
      if (!osc.isPlaying) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(massX, baseY, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(massX - 3, baseY - 5, 2, 10);
        ctx.fillRect(massX + 1, baseY - 5, 2, 10);
      }

      // 位移数值（响应式字体）
      ctx.fillStyle = isDark ? Colors.darkText : Colors.dark;
      ctx.font = `bold ${deviceType === 'mobile' ? 13 : 11}px "Noto Sans SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${osc.state.x.toFixed(1)}m`, massX, baseY + ballRadius + (deviceType === 'mobile' ? 16 : 12));

    } else {
      // ===== 竖直弹簧振子 =====
      const drawCenterX = centerX;
      const equilibriumY = centerY + 8;
      const massY = equilibriumY - displacement;
      const fixedY = equilibriumY - springLength;

      // 平衡位置虚线
      ctx.strokeStyle = isDark ? alpha(Colors.gray, 0.25) : alpha(Colors.grayLight, 0.4);
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(drawCenterX - 25, equilibriumY);
      ctx.lineTo(drawCenterX + 25, equilibriumY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 天花板
      ctx.fillStyle = isDark ? Colors.darkText : Colors.dark;
      ctx.fillRect(drawCenterX - 25, fixedY - 3, 50, 3);
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(drawCenterX + i * 8, fixedY - 3);
        ctx.lineTo(drawCenterX + i * 8 + 1, fixedY - 5);
        ctx.stroke();
      }

      // 弹簧（响应式尺寸）
      const springEndY = massY - sizes.ballRadius;
      if (springEndY > fixedY + 8) {
        const coils = deviceType === 'mobile' ? 8 : 12;
        const coilWidth = deviceType === 'mobile' ? 12 : 18;
        drawSpring(ctx, drawCenterX, fixedY, drawCenterX, springEndY, coils, coilWidth, osc.color);
      }

      // 小球（响应式尺寸）
      const ballRadius = sizes.ballRadius;
      ctx.fillStyle = osc.color;
      ctx.beginPath();
      ctx.arc(drawCenterX, massY, ballRadius, 0, Math.PI * 2);
      ctx.fill();

      // 光泽
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(drawCenterX - ballRadius * 0.25, massY - ballRadius * 0.25, ballRadius * 0.25, 0, Math.PI * 2);
      ctx.fill();

      // 记录点击区域（确保触摸目标至少 30px）
      const clickCenterY = (fixedY + massY) / 2;
      const clickHeight = massY - fixedY + 40;
      clickAreas.push({ 
        id: osc.id, 
        x: drawCenterX, 
        y: clickCenterY, 
        r: Math.max(clickHeight / 2, sizes.minClickRadius) 
      });

      // 相位标记
      const markerAngle = osc.state.phase;
      const markerX = drawCenterX + Math.cos(markerAngle) * 7;
      const markerY = massY + Math.sin(markerAngle) * 7;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(markerX, markerY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 暂停状态遮罩
      if (!osc.isPlaying) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(drawCenterX, massY, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(drawCenterX - 3, massY - 5, 2, 10);
        ctx.fillRect(drawCenterX + 1, massY - 5, 2, 10);
      }

      // 位移数值（响应式位置）
      ctx.fillStyle = isDark ? Colors.darkText : Colors.dark;
      ctx.font = `bold ${deviceType === 'mobile' ? 13 : 11}px "Noto Sans SC", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`${osc.state.x.toFixed(1)}m`, drawCenterX + ballRadius + (deviceType === 'mobile' ? 16 : 12), massY + 4);
    }
  }

  // 绘制展示区
  function drawStage(): void {
    if (!stageCtx || !stageCanvas || !sim) return;

    const isDark = theme === 'dark';
    const width = stageWidth;
    const height = stageHeight;

    // 清空点击区域
    clickAreas.length = 0;

    // 清空画布
    stageCtx.clearRect(0, 0, width, height);

    // 背景
    stageCtx.fillStyle = isDark ? Colors.darkBg : Colors.bg;
    stageCtx.fillRect(0, 0, width, height);

    // 获取绘图上下文
    const ctx = stageCtx;

    if (sim.oscillators.length === 0) {
      // 空状态提示
      ctx.fillStyle = isDark ? Colors.gray : Colors.gray;
      ctx.font = '16px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('点击"添加振子"开始演示', width / 2, height / 2 - 15);
      ctx.font = '13px "Noto Sans SC", sans-serif';
      ctx.fillText('点击小球可开始/暂停运动', width / 2, height / 2 + 15);
      return;
    }

    // 计算网格布局
    const total = sim.oscillators.length;
    const layout = calculateGridLayout(total);
    const cellW = width / layout.cols;
    const cellH = height / layout.rows;

    // 绘制网格分隔线
    ctx.strokeStyle = isDark ? alpha(Colors.gray, 0.15) : alpha(Colors.grayLight, 0.25);
    ctx.lineWidth = 1;
    
    // 垂直分隔线
    for (let i = 1; i < layout.cols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellW, 0);
      ctx.lineTo(i * cellW, height);
      ctx.stroke();
    }
    // 水平分隔线
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
      drawOscillatorCell(ctx, osc, index, cellX, cellY, cellW, cellH);
    });
  }

  // 处理点击/触摸事件
  function handlePointerEvent(event: MouseEvent | TouchEvent): void {
    if (!stageCanvas || clickAreas.length === 0) return;

    const rect = stageCanvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if (event instanceof TouchEvent) {
      if (event.touches.length === 0) return;
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = (event as MouseEvent).clientX;
      clientY = (event as MouseEvent).clientY;
    }

    // 计算在canvas中的坐标
    const x = (clientX - rect.left) * (stageWidth / rect.width);
    const y = (clientY - rect.top) * (stageHeight / rect.height);

    // 检查是否点击了某个小球
    for (const area of clickAreas) {
      const dx = x - area.x;
      const dy = y - area.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= area.r) {
        event.preventDefault();
        onToggleOscillator?.(area.id);
        return;
      }
    }
  }

  // 绑定事件
  function bindEvents(): void {
    if (!stageCanvas) return;
    stageCanvas.addEventListener('click', handlePointerEvent);
    stageCanvas.addEventListener('touchstart', handlePointerEvent, { passive: false });
  }

  function unbindEvents(): void {
    if (!stageCanvas) return;
    stageCanvas.removeEventListener('click', handlePointerEvent);
    stageCanvas.removeEventListener('touchstart', handlePointerEvent);
  }

  bindEvents();

  return {
    render(): void {
      // 更新历史数据 - 只在振子运动时记录
      const currentSim = sim;
      if (currentSim) {
        const globalTime = currentSim.globalTime;
        currentSim.oscillators.forEach(osc => {
          // 只在振子正在播放时记录历史
          if (!osc.isPlaying) {
            // 振子暂停时，不添加新数据点，只清理过期数据
            const hist = history.get(osc.id);
            if (hist) {
              // 暂停时不清除已有数据，保持显示
              // 只限制最大点数防止内存泄漏
              if (hist.length > 600) {
                hist.splice(0, hist.length - 600);
              }
            }
            return;
          }
          
          let hist = history.get(osc.id);
          if (!hist) {
            hist = [];
            history.set(osc.id, hist);
          }
          
          // 性能优化：移动端降采样
          const deviceType = getDeviceType();
          if (shouldRecordFrame(deviceType)) {
            // 避免重复记录同一时间点的数据
            if (hist.length === 0 || hist[hist.length - 1].t !== globalTime) {
              hist.push({ t: globalTime, x: osc.state.x });
            }
          }

          // 清理过期数据（只清理当前振子的历史，不影响暂停的振子）
          const cutoff = globalTime - HISTORY_DURATION;
          while (hist.length > 0 && hist[0].t < cutoff) {
            hist.shift();
          }
          // 限制最大点数（移动端限制更少）
          const maxPoints = deviceType === 'mobile' ? 300 : 600;
          if (hist.length > maxPoints) {
            hist.splice(0, hist.length - maxPoints);
          }
        });
      }

      drawGraph();
      drawStage();
    },

    reset(): void {
      history.clear();
      drawGraph();
      drawStage();
    },

    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      graphCanvas = canvas;
      graphCtx = canvas.getContext('2d');
      resizeGraphCanvas();
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

    setMode(): void {
      // mode 预留
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
      graphCanvas = null;
      stageCanvas = null;
      graphCtx = null;
      stageCtx = null;
      sim = null;
    }
  };
}
