/**
 * 抛体运动视图 - 使用统一框架
 * 优化 Canvas 尺寸计算和绘制逻辑
 */

import type { ProjectileState } from './scene.sim';
import { Colors, getThemeColors } from '../../core/colors';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import { drawGrid, drawBall, drawTrail } from '../../core/unified-canvas';

export type CreateProjectileViewOptions = {
  canvas: HTMLCanvasElement;
  theme?: 'light' | 'dark';
  mode?: 'normal' | 'presentation';
};

export function createProjectileView(options: CreateProjectileViewOptions) {
  const canvas = options.canvas ?? document.createElement('canvas');
  let theme: 'light' | 'dark' = options.theme ?? 'dark';
  let mode: 'normal' | 'presentation' = options.mode ?? 'normal';
  let ctx: CanvasRenderingContext2D | null = null;
  let width = 0;
  let height = 0;
  let scale = 1;
  let trail: Array<{ x: number; y: number }> = [];
  // let lastState: ProjectileState | null = null;

  // 坐标系配置
  const originX = 60;
  const originY = () => height - 60;

  function resize(): void {
    // 使用新的 fill 策略：canvas 完全填满容器
    // 抛体运动需要最大化利用屏幕空间
    ctx = sizeCanvasToFill(canvas);

    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;

    // 计算缩放比例（用于坐标映射）
    scale = Math.min(width / 800, height / 600);
    scale = Math.max(0.5, Math.min(2, scale));
  }

  function worldToScreen(state: ProjectileState): { x: number; y: number } {
    // 计算缩放比例以适应画布
    const maxX = Math.max(50, ...trail.map((p) => p.x), state.x);
    const maxY = Math.max(30, ...trail.map((p) => p.y), state.y);

    const scaleX = (width - originX - 40) / maxX;
    const scaleY = (height - 100) / maxY;
    const s = Math.min(scaleX, scaleY);

    return {
      x: originX + state.x * s,
      y: originY() - state.y * s
    };
  }

  function drawAxes(): void {
    if (!ctx) return;
    const colors = getThemeColors(theme);

    // 根据屏幕尺寸调整线条粗细
    const isMobile = width < 500;
    const lineWidth = isMobile ? 1.5 : 2;
    const fontSize = isMobile ? 10 : 12;
    const labelOffset = isMobile ? 14 : 20;

    ctx.save();
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = lineWidth;

    // Y轴
    ctx.beginPath();
    ctx.moveTo(originX, 20);
    ctx.lineTo(originX, originY());
    ctx.stroke();

    // X轴
    ctx.beginPath();
    ctx.moveTo(originX, originY());
    ctx.lineTo(width - 20, originY());
    ctx.stroke();

    // 箭头
    ctx.fillStyle = colors.secondary;
    // X轴箭头
    ctx.beginPath();
    ctx.moveTo(width - 20, originY());
    ctx.lineTo(width - 30, originY() - 5);
    ctx.lineTo(width - 30, originY() + 5);
    ctx.fill();
    // Y轴箭头
    ctx.beginPath();
    ctx.moveTo(originX, 20);
    ctx.lineTo(originX - 5, 30);
    ctx.lineTo(originX + 5, 30);
    ctx.fill();

    // 标签
    ctx.font = `500 ${fontSize}px Satoshi, Noto Sans SC, sans-serif`;
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'center';
    ctx.fillText('x', width - labelOffset, originY() + (isMobile ? 14 : 20));
    ctx.fillText('y', originX - (isMobile ? 10 : 15), isMobile ? 22 : 25);

    ctx.restore();
  }

  function drawBackground(): void {
    if (!ctx) return;
    const colors = getThemeColors(theme);

    // 背景
    ctx.fillStyle = colors.canvasBg;
    ctx.fillRect(0, 0, width, height);

    // 网格 - 使用统一工具
    drawGrid(
      ctx,
      width,
      height,
      {
        originX,
        originY: originY(),
        showGrid: true,
        showAxes: false // 我们自己画轴
      },
      theme === 'dark'
    );
  }

  function drawTrajectory(): void {
    if (!ctx || trail.length < 2) return;

    // 计算缩放
    const maxX = Math.max(50, ...trail.map((p) => p.x));
    const maxY = Math.max(30, ...trail.map((p) => p.y));
    const scaleX = (width - originX - 40) / maxX;
    const scaleY = (height - 100) / maxY;
    const s = Math.min(scaleX, scaleY);

    // 转换轨迹点为屏幕坐标
    const points = trail.map((p) => ({
      x: originX + p.x * s,
      y: originY() - p.y * s
    }));

    // 根据屏幕尺寸调整轨迹线宽
    const isMobile = width < 500;
    const trailWidth = isMobile ? 2 : 3;

    // 使用统一工具绘制轨迹
    drawTrail(ctx, points, Colors.coral, trailWidth);
  }

  function drawProjectile(state: ProjectileState): void {
    if (!ctx) return;
    const pos = worldToScreen(state);

    // 根据屏幕尺寸调整小球大小
    const isMobile = width < 500;
    const ballRadius = isMobile ? 5 : 8;

    // 使用统一工具绘制高亮小球
    drawBall(
      ctx,
      pos.x,
      pos.y,
      ballRadius * Math.max(0.8, scale),
      Colors.coral
    );
  }

  function drawUI(): void {
    // Canvas 内不再绘制数据面板，使用 HTML 数据区替代
    // 这样可以支持拖动、折叠等交互功能
  }

  function render(state: ProjectileState): void {
    // 如果 ctx 不存在或 Canvas 尺寸为 0，尝试 resize
    if (!ctx || width === 0 || height === 0) {
      resize();
      if (!ctx || width === 0 || height === 0) return;
    }

    // 更新轨迹
    trail.push({ x: state.x, y: state.y });
    if (trail.length > 800) {
      trail = trail.slice(-800);
    }

    // 绘制
    drawBackground();
    drawAxes();
    drawTrajectory();
    drawProjectile(state);
    drawUI();
  }

  function reset(): void {
    trail = [];
  }

  // 初始化
  resize();

  return {
    render,
    reset,
    resize,
    setTheme(newTheme: 'light' | 'dark') {
      theme = newTheme;
    },
    setMode(newMode: 'normal' | 'presentation') {
      mode = newMode;
      void mode;
    },
    dispose() {
      // 清理资源（如果需要）
    }
  };
}
