import type { SpringOscillatorSim, Oscillator } from './scene.sim';
import type { TeachingMode } from '../../app/teaching-standards';
import { applyHiDpiCanvasMetrics, computeHiDpiCanvasMetrics } from '../../core/high-dpi-canvas';
import type { TeachingTheme } from '../../app/teaching-demo-shell';

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

export function createSpringOscillatorView(options: SpringOscillatorViewOptions = {}) {
  let graphCanvas = options.graphCanvas ?? null;
  let stageCanvas = options.stageCanvas ?? null;
  let graphCtx = graphCanvas?.getContext('2d') ?? null;
  let stageCtx = stageCanvas?.getContext('2d') ?? null;
  let sim = options.sim ?? null;

  let theme: TeachingTheme = options.theme ?? 'dark';
  let onToggleOscillator = options.onToggleOscillator;
  
  let graphSurface = computeHiDpiCanvasMetrics({
    cssWidth: 400,
    cssHeight: 300,
    devicePixelRatio: 1
  });
  
  let stageSurface = computeHiDpiCanvasMetrics({
    cssWidth: 800,
    cssHeight: 600,
    devicePixelRatio: 1
  });

  // 每个振子的历史轨迹
  const history: Map<string, Array<{ t: number; x: number }>> = new Map();
  
  // 点击区域记录（用于检测点击小球）
  const clickAreas: Array<{ id: string; x: number; y: number; r: number }> = [];

  function resizeGraphCanvas(): void {
    if (!graphCanvas) return;
    const rect = graphCanvas.getBoundingClientRect();
    const width = Math.max(200, Math.floor(rect.width || 400));
    const height = Math.max(150, Math.floor(rect.height || 300));
    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    graphSurface = computeHiDpiCanvasMetrics({
      cssWidth: width,
      cssHeight: height,
      devicePixelRatio: dpr
    });
    if (graphCtx) {
      applyHiDpiCanvasMetrics(graphCanvas, graphCtx, graphSurface);
    }
  }

  function resizeStageCanvas(): void {
    if (!stageCanvas) return;
    const rect = stageCanvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width || 800));
    const height = Math.max(200, Math.floor(rect.height || 600));
    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    stageSurface = computeHiDpiCanvasMetrics({
      cssWidth: width,
      cssHeight: height,
      devicePixelRatio: dpr
    });
    if (stageCtx) {
      applyHiDpiCanvasMetrics(stageCanvas, stageCtx, stageSurface);
    }
  }

  function getThemeColors() {
    const isDark = theme === 'dark';
    return {
      bg: isDark ? '#0f172a' : '#f8fafc',
      grid: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(100, 116, 139, 0.12)',
      axis: isDark ? '#38bdf8' : '#3b82f6',
      text: isDark ? '#f1f5f9' : '#1e293b',
      textSecondary: isDark ? '#94a3b8' : '#64748b',
      panelBg: isDark ? '#1e293b' : '#f1f5f9',
      border: isDark ? 'rgba(148, 163, 184, 0.2)' : '#cbd5e1'
    };
  }

  // 绘制 x-t 图表
  function drawGraph(): void {
    if (!graphCtx || !graphCanvas || !sim) return;
    
    const colors = getThemeColors();
    const width = graphSurface.cssWidth;
    const height = graphSurface.cssHeight;
    
    graphCtx.clearRect(0, 0, width, height);
    graphCtx.fillStyle = colors.bg;
    graphCtx.fillRect(0, 0, width, height);
    
    // 边距
    const margin = { top: 35, right: 15, bottom: 35, left: 45 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // 坐标轴
    graphCtx.strokeStyle = colors.axis;
    graphCtx.lineWidth = 2;
    graphCtx.beginPath();
    // Y轴
    graphCtx.moveTo(margin.left, margin.top);
    graphCtx.lineTo(margin.left, height - margin.bottom);
    // X轴 (t轴，在y=0位置)
    const zeroY = margin.top + chartHeight / 2;
    graphCtx.moveTo(margin.left, zeroY);
    graphCtx.lineTo(width - margin.right, zeroY);
    graphCtx.stroke();
    
    // 网格线
    graphCtx.strokeStyle = colors.grid;
    graphCtx.lineWidth = 1;
    graphCtx.beginPath();
    // 水平网格线
    for (let i = 1; i < 5; i++) {
      const y = margin.top + (chartHeight * i) / 5;
      graphCtx.moveTo(margin.left, y);
      graphCtx.lineTo(width - margin.right, y);
    }
    // 垂直网格线
    for (let i = 1; i <= 5; i++) {
      const x = margin.left + (chartWidth * i) / 5;
      graphCtx.moveTo(x, margin.top);
      graphCtx.lineTo(x, height - margin.bottom);
    }
    graphCtx.stroke();
    
    // 标签
    graphCtx.fillStyle = colors.text;
    graphCtx.font = `bold 12px "Noto Sans SC", sans-serif`;
    graphCtx.textAlign = 'center';
    graphCtx.fillText('t (s)', width - margin.right - 20, zeroY + 18);
    graphCtx.textAlign = 'right';
    graphCtx.fillText('x (m)', margin.left - 8, margin.top + 12);
    
    // 时间刻度 - 使用 sim.globalTime
    const tEnd = sim.globalTime;
    const tStart = Math.max(0, tEnd - HISTORY_DURATION);
    graphCtx.textAlign = 'center';
    graphCtx.fillStyle = colors.textSecondary;
    graphCtx.font = `11px "Noto Sans SC", sans-serif`;
    for (let i = 0; i <= 5; i++) {
      const t = tStart + (tEnd - tStart) * (i / 5);
      const x = margin.left + (chartWidth * i) / 5;
      graphCtx.fillText(t.toFixed(1), x, height - margin.bottom + 16);
    }
    
    // 位移刻度
    graphCtx.textAlign = 'right';
    const maxDisplayX = 20; // 显示范围 ±20m
    for (let i = -2; i <= 2; i++) {
      const y = zeroY - (i / 2) * (chartHeight / 2);
      if (y >= margin.top && y <= height - margin.bottom) {
        graphCtx.fillText(String(i * 10), margin.left - 6, y + 4);
      }
    }
    
    // 绘制每个振子的轨迹
    if (sim.oscillators.length === 0) return;
    
    const ctx = graphCtx;
    
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
        // x 坐标：时间在 [tStart, tEnd] 范围内映射
        const xRatio = (point.t - tStart) / (tEnd - tStart || 1);
        const px = margin.left + xRatio * chartWidth;
        // y 坐标：位移映射
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
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // 内圈
      ctx.fillStyle = osc.color;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
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

  // 绘制单个振子（垂直排列，一行一个）
  function drawOscillatorRow(
    ctx: CanvasRenderingContext2D,
    osc: Oscillator,
    index: number,
    total: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const colors = getThemeColors();
    
    // 每个振子占一行（垂直排列）
    const rowHeight = canvasHeight / total;
    const rowY = index * rowHeight;
    const centerY = rowY + rowHeight / 2;
    const centerX = canvasWidth / 2;
    
    // 绘制分隔线（除了第一个）
    if (index > 0) {
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(10, rowY);
      ctx.lineTo(canvasWidth - 10, rowY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // 振子编号和参数（左侧）
    ctx.fillStyle = osc.color;
    ctx.font = `bold 14px "Noto Sans SC", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`振子 ${index + 1}`, 15, rowY + 25);
    
    ctx.fillStyle = colors.textSecondary;
    ctx.font = `11px "Noto Sans SC", sans-serif`;
    ctx.fillText(`k=${osc.params.k}  m=${osc.params.m}  x₀=${osc.params.x0.toFixed(1)}m`, 15, rowY + 42);
    
    // 状态指示
    ctx.fillStyle = osc.isPlaying ? '#51cf66' : colors.textSecondary;
    ctx.font = `11px "Noto Sans SC", sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(osc.isPlaying ? '▶ 运行中' : '⏸ 已暂停', canvasWidth - 15, rowY + 25);
    
    const isHorizontal = osc.params.orientation === 'horizontal';
    
    // 绘制区域参数
    const drawWidth = canvasWidth * 0.7;
    const springLength = Math.min(drawWidth * 0.4, 150);
    const maxDisplacement = Math.max(10, Math.abs(osc.params.x0));
    const scale = (springLength * 0.5) / maxDisplacement;
    const displacement = osc.state.x * scale;
    
    if (isHorizontal) {
      // ===== 水平弹簧振子 =====
      // 平衡位置（中心偏右）
      const equilibriumX = centerX + 30;
      const massX = equilibriumX + displacement;
      const fixedX = equilibriumX - springLength;
      
      // 绘制平衡位置虚线
      ctx.strokeStyle = colors.grid;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(equilibriumX, centerY - 35);
      ctx.lineTo(equilibriumX, centerY + 45);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // 标注
      ctx.fillStyle = colors.textSecondary;
      ctx.font = `10px "Noto Sans SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('平衡', equilibriumX, centerY + 58);
      
      // 固定端（墙面）
      ctx.fillStyle = colors.text;
      ctx.fillRect(fixedX - 5, centerY - 30, 5, 60);
      // 墙面装饰
      ctx.strokeStyle = colors.text;
      ctx.lineWidth = 2;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(fixedX - 7, centerY + i * 7);
        ctx.lineTo(fixedX - 3, centerY + i * 7 + 3);
        ctx.stroke();
      }
      
      // 弹簧
      const springEndX = massX - 22;
      if (springEndX > fixedX + 10) {
        drawSpring(ctx, fixedX, centerY, springEndX, centerY, 10, 14, osc.color);
      }
      
      // 小球
      const ballRadius = 22;
      ctx.fillStyle = osc.color;
      ctx.beginPath();
      ctx.arc(massX, centerY, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // 光泽
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(massX - 7, centerY - 7, 7, 0, Math.PI * 2);
      ctx.fill();
      
      // 记录点击区域
      clickAreas.push({ id: osc.id, x: massX, y: centerY, r: ballRadius + 6 });
      
      // 相位标记
      const markerAngle = osc.state.phase;
      const markerX = massX + Math.cos(markerAngle) * 10;
      const markerY = centerY + Math.sin(markerAngle) * 10;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(markerX, markerY, 5, 0, Math.PI * 2);
      ctx.fill();
      
      // 暂停状态
      if (!osc.isPlaying) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.arc(massX, centerY, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(massX - 5, centerY - 8, 3, 16);
        ctx.fillRect(massX + 2, centerY - 8, 3, 16);
      }
      
      // 实时数据（右侧）
      ctx.fillStyle = colors.text;
      ctx.font = `bold 13px "Noto Sans SC", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`x = ${osc.state.x.toFixed(2)} m`, canvasWidth - 100, centerY + 5);
      
    } else {
      // ===== 竖直弹簧振子 =====
      // 在行的中间绘制
      const drawCenterX = centerX + 20;
      const equilibriumY = centerY + 20;
      const massY = equilibriumY - displacement;
      const fixedY = equilibriumY - springLength;
      
      // 平衡位置虚线
      ctx.strokeStyle = colors.grid;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(drawCenterX - 50, equilibriumY);
      ctx.lineTo(drawCenterX + 50, equilibriumY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // 标注
      ctx.fillStyle = colors.textSecondary;
      ctx.font = `10px "Noto Sans SC", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('平衡', drawCenterX + 38, equilibriumY - 4);
      
      // 天花板
      ctx.fillStyle = colors.text;
      ctx.fillRect(drawCenterX - 40, fixedY - 5, 80, 5);
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(drawCenterX + i * 10, fixedY - 5);
        ctx.lineTo(drawCenterX + i * 10 + 2, fixedY - 8);
        ctx.stroke();
      }
      
      // 弹簧
      const springEndY = massY - 22;
      if (springEndY > fixedY + 10) {
        drawSpring(ctx, drawCenterX, fixedY, drawCenterX, springEndY, 10, 14, osc.color);
      }
      
      // 小球
      const ballRadius = 22;
      ctx.fillStyle = osc.color;
      ctx.beginPath();
      ctx.arc(drawCenterX, massY, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // 光泽
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(drawCenterX - 7, massY - 7, 7, 0, Math.PI * 2);
      ctx.fill();
      
      // 记录点击区域
      clickAreas.push({ id: osc.id, x: drawCenterX, y: massY, r: ballRadius + 6 });
      
      // 相位标记
      const markerAngle = osc.state.phase;
      const markerX = drawCenterX + Math.cos(markerAngle) * 10;
      const markerY = massY + Math.sin(markerAngle) * 10;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(markerX, markerY, 5, 0, Math.PI * 2);
      ctx.fill();
      
      // 暂停状态
      if (!osc.isPlaying) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.arc(drawCenterX, massY, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(drawCenterX - 5, massY - 8, 3, 16);
        ctx.fillRect(drawCenterX + 2, massY - 8, 3, 16);
      }
      
      // 实时数据
      ctx.fillStyle = colors.text;
      ctx.font = `bold 13px "Noto Sans SC", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`x = ${osc.state.x.toFixed(2)} m`, canvasWidth - 100, centerY + 5);
    }
  }

  // 绘制展示区
  function drawStage(): void {
    if (!stageCtx || !stageCanvas || !sim) return;
    
    const colors = getThemeColors();
    const width = stageSurface.cssWidth;
    const height = stageSurface.cssHeight;
    
    // 清空点击区域
    clickAreas.length = 0;
    
    stageCtx.clearRect(0, 0, width, height);
    stageCtx.fillStyle = colors.bg;
    stageCtx.fillRect(0, 0, width, height);
    
    if (sim.oscillators.length === 0) {
      // 空状态提示
      stageCtx.fillStyle = colors.textSecondary;
      stageCtx.font = '18px "Noto Sans SC", sans-serif';
      stageCtx.textAlign = 'center';
      stageCtx.fillText('点击"添加振子"开始演示', width / 2, height / 2 - 20);
      stageCtx.font = '14px "Noto Sans SC", sans-serif';
      stageCtx.fillText('点击小球可开始/暂停运动', width / 2, height / 2 + 20);
      return;
    }
    
    // 绘制提示
    stageCtx.fillStyle = colors.textSecondary;
    stageCtx.font = '13px "Noto Sans SC", sans-serif';
    stageCtx.textAlign = 'left';
    stageCtx.fillText('💡 点击小球开始/暂停运动', 15, 22);
    
    // 垂直排列绘制所有振子（一行一个）
    sim.oscillators.forEach((osc, index) => {
      drawOscillatorRow(stageCtx!, osc, index, sim!.oscillators.length, width, height);
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
    const x = (clientX - rect.left) * (stageSurface.cssWidth / rect.width);
    const y = (clientY - rect.top) * (stageSurface.cssHeight / rect.height);
    
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
      // 更新历史数据
      const currentSim = sim;
      if (currentSim) {
        const globalTime = currentSim.globalTime;
        currentSim.oscillators.forEach(osc => {
          let hist = history.get(osc.id);
          if (!hist) {
            hist = [];
            history.set(osc.id, hist);
          }
          hist.push({ t: globalTime, x: osc.state.x });
          
          // 清理过期数据
          const cutoff = globalTime - HISTORY_DURATION;
          while (hist.length > 0 && hist[0].t < cutoff) {
            hist.shift();
          }
          // 限制最大点数
          if (hist.length > 600) {
            hist.splice(0, hist.length - 600);
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
