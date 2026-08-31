/**
 * 物体绘制：玻璃棒、丝绸、导体球、接地符号
 */

import { pathRoundRect } from '../../../core/draw-primitives';

// 渐变只随（几何参数, 主题/电荷符号）变化，按 key 复用避免每帧重建
// （参考 emf-analogy/renderer/draw-pipe-system.ts 的 Map 缓存模式）；
// 几何随动画/窗口变化会产生新 key，限制缓存规模防止无限增长。
// CanvasGradient 与具体 canvas 上下文无关，可安全跨帧复用。
const gradientCache = new Map<string, CanvasGradient>();

function getCachedGradient(
  key: string,
  create: () => CanvasGradient
): CanvasGradient {
  let gradient = gradientCache.get(key);
  if (!gradient) {
    if (gradientCache.size > 64) gradientCache.clear();
    gradient = create();
    gradientCache.set(key, gradient);
  }
  return gradient;
}

/** 玻璃棒：棕色渐变 + 纵向纹理 */
export function drawGlassRod(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isDark: boolean,
  s: number
): void {
  ctx.save();

  // 主体渐变
  const grad = getCachedGradient(
    `rod|${x}|${y}|${w}|${h}|${isDark ? 1 : 0}`,
    () => {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      if (isDark) {
        g.addColorStop(0, 'rgba(180,130,70,0.9)');
        g.addColorStop(0.5, 'rgba(160,110,50,0.85)');
        g.addColorStop(1, 'rgba(140,90,30,0.8)');
      } else {
        g.addColorStop(0, 'rgba(210,170,110,0.9)');
        g.addColorStop(0.5, 'rgba(190,150,90,0.85)');
        g.addColorStop(1, 'rgba(170,130,70,0.8)');
      }
      return g;
    }
  );

  ctx.fillStyle = grad;
  pathRoundRect(ctx, x, y, w, h, Math.min(8, h * 0.1));
  ctx.fill();

  // 纵向纹理线
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  ctx.lineWidth = Math.max(0.5, 1 * s);
  const pad = 4 * s;
  for (let i = 1; i < 6; i++) {
    const lx = x + (w * i) / 6;
    ctx.beginPath();
    ctx.moveTo(lx, y + pad);
    ctx.lineTo(lx, y + h - pad);
    ctx.stroke();
  }

  // 边框
  ctx.strokeStyle = isDark ? 'rgba(200,150,80,0.5)' : 'rgba(160,120,60,0.4)';
  ctx.lineWidth = Math.max(1, 1.5 * s);
  pathRoundRect(ctx, x, y, w, h, Math.min(8, h * 0.1));
  ctx.stroke();

  ctx.restore();
}

/** 丝绸：淡紫渐变 + 横向波纹 */
export function drawSilk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isDark: boolean,
  s: number
): void {
  ctx.save();

  const grad = getCachedGradient(
    `silk|${x}|${y}|${w}|${h}|${isDark ? 1 : 0}`,
    () => {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      if (isDark) {
        g.addColorStop(0, 'rgba(150,120,180,0.9)');
        g.addColorStop(0.5, 'rgba(130,100,160,0.85)');
        g.addColorStop(1, 'rgba(110,80,140,0.8)');
      } else {
        g.addColorStop(0, 'rgba(200,180,220,0.9)');
        g.addColorStop(0.5, 'rgba(180,160,200,0.85)');
        g.addColorStop(1, 'rgba(160,140,180,0.8)');
      }
      return g;
    }
  );

  ctx.fillStyle = grad;
  pathRoundRect(ctx, x, y, w, h, Math.min(8, h * 0.1));
  ctx.fill();

  // 横向波纹
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  ctx.lineWidth = Math.max(0.5, 1 * s);
  const pad = 4 * s;
  for (let i = 1; i < 5; i++) {
    const ly = y + (h * i) / 5;
    ctx.beginPath();
    ctx.moveTo(x + pad, ly);
    ctx.lineTo(x + w - pad, ly);
    ctx.stroke();
  }

  ctx.strokeStyle = isDark ? 'rgba(170,140,200,0.5)' : 'rgba(140,120,170,0.4)';
  ctx.lineWidth = Math.max(1, 1.5 * s);
  pathRoundRect(ctx, x, y, w, h, Math.min(8, h * 0.1));
  ctx.stroke();

  ctx.restore();
}

/** 导体球：金属质感 */
export function drawConductor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  isDark: boolean,
  s: number
): void {
  ctx.save();

  // 金属径向渐变
  const grad = getCachedGradient(
    `conductor|${x}|${y}|${r}|${isDark ? 1 : 0}`,
    () => {
      const g = ctx.createRadialGradient(
        x - r * 0.3,
        y - r * 0.3,
        r * 0.1,
        x,
        y,
        r
      );
      if (isDark) {
        g.addColorStop(0, 'rgba(180,190,200,0.95)');
        g.addColorStop(0.4, 'rgba(120,130,140,0.9)');
        g.addColorStop(1, 'rgba(70,80,90,0.85)');
      } else {
        g.addColorStop(0, 'rgba(220,225,230,0.95)');
        g.addColorStop(0.4, 'rgba(170,175,180,0.9)');
        g.addColorStop(1, 'rgba(120,125,130,0.85)');
      }
      return g;
    }
  );

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // 边框
  ctx.strokeStyle = isDark ? 'rgba(160,170,180,0.5)' : 'rgba(130,135,140,0.4)';
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.stroke();

  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** 接地符号：标准三线 */
export function drawGround(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  isDark: boolean
): void {
  ctx.save();
  ctx.strokeStyle = isDark ? 'rgba(226,232,240,0.7)' : 'rgba(71,85,105,0.7)';
  ctx.lineWidth = Math.max(1.5, size * 0.08);
  ctx.lineCap = 'round';

  // 竖线
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + size * 0.3);
  ctx.stroke();

  // 顶部横线
  ctx.beginPath();
  ctx.moveTo(x - size * 0.15, y + size * 0.3);
  ctx.lineTo(x + size * 0.15, y + size * 0.3);
  ctx.stroke();

  // 中间横线（略短）
  ctx.beginPath();
  ctx.moveTo(x - size * 0.1, y + size * 0.42);
  ctx.lineTo(x + size * 0.1, y + size * 0.42);
  ctx.stroke();

  // 底部横线（最短）
  ctx.beginPath();
  ctx.moveTo(x - size * 0.05, y + size * 0.54);
  ctx.lineTo(x + size * 0.05, y + size * 0.54);
  ctx.stroke();

  ctx.restore();
}

/** 带电球体：带颜色 glow */
export function drawChargedSphere(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  charge: number,
  isDark: boolean,
  s: number
): void {
  ctx.save();

  const isPositive = charge > 0;
  const glowColor = isPositive
    ? isDark
      ? 'rgba(239,68,68,0.35)'
      : 'rgba(239,68,68,0.25)'
    : isDark
      ? 'rgba(59,130,246,0.35)'
      : 'rgba(59,130,246,0.25)';
  const coreColor = isPositive
    ? isDark
      ? 'rgba(220,60,60,0.9)'
      : 'rgba(220,60,60,0.85)'
    : isDark
      ? 'rgba(50,110,220,0.9)'
      : 'rgba(50,110,220,0.85)';

  // 外发光
  ctx.shadowBlur = r * 0.5;
  ctx.shadowColor = glowColor;

  // 主体
  const grad = getCachedGradient(
    `sphere|${x}|${y}|${r}|${isPositive ? 1 : 0}|${isDark ? 1 : 0}`,
    () => {
      const g = ctx.createRadialGradient(
        x - r * 0.2,
        y - r * 0.2,
        r * 0.1,
        x,
        y,
        r
      );
      g.addColorStop(
        0,
        isPositive ? 'rgba(255,150,150,0.9)' : 'rgba(150,180,255,0.9)'
      );
      g.addColorStop(1, coreColor);
      return g;
    }
  );

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // 边框
  ctx.strokeStyle = isPositive
    ? isDark
      ? 'rgba(239,68,68,0.6)'
      : 'rgba(220,50,50,0.5)'
    : isDark
      ? 'rgba(59,130,246,0.6)'
      : 'rgba(40,100,220,0.5)';
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.stroke();

  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // 电荷数值
  const fontSize = Math.max(10, Math.round(Math.max(12, r * 0.5) * s));
  ctx.fillStyle = 'white';
  ctx.font = `bold ${fontSize}px "Noto Sans SC", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = charge > 0 ? `+${charge}` : String(charge);
  ctx.fillText(label, x, y + 1);

  ctx.restore();
}
