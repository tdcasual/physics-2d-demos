import type { WaterColors } from './water-colors';

/* ── 水泵绘制 ── */
export function drawPump(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  rotation: number,
  colors: WaterColors
): void {
  const r = size * 0.45;

  // 泵体外壳
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = colors.pumpBody;
  ctx.fill();
  ctx.strokeStyle = colors.pipeBorder;
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.stroke();

  // 旋转叶片
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = colors.pumpBlade;
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 3);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.55, r * 0.18, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // 中心轴
  ctx.beginPath();
  ctx.arc(x, y, r * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = colors.text;
  ctx.fill();

  // 标签
  ctx.fillStyle = colors.textSecondary;
  ctx.font = `600 ${Math.max(9, size * 0.18)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('水泵 (E)', x, y + r + size * 0.1);
}

/* ── 水轮机（外阻）绘制 ── */
export function drawTurbine(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  rotation: number,
  loadRatio: number, // 0~1, 阻力越大转得越慢
  colors: WaterColors
): void {
  const r = size * 0.4;

  // 外壳
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = colors.panelBg;
  ctx.fill();
  ctx.strokeStyle = colors.turbine;
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.stroke();

  // 水轮叶片
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = colors.turbine;
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.15, -r * 0.75);
    ctx.lineTo(r * 0.15, -r * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // 阻力指示（叶片颜色深浅）
  const resistanceAlpha = 0.3 + loadRatio * 0.5;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(148,163,184,${resistanceAlpha})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 标签
  ctx.fillStyle = colors.textSecondary;
  ctx.font = `600 ${Math.max(9, size * 0.18)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('水轮机 (R)', x, y + r + size * 0.1);
}

/* ── 阀门（开关）绘制 ── */
export function drawValve(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  isOpen: boolean,
  colors: WaterColors
): void {
  const w = size * 0.35;
  const h = size * 0.5;

  // 阀体
  ctx.fillStyle = colors.panelBg;
  ctx.fillRect(x - w, y - h * 0.5, w * 2, h);
  ctx.strokeStyle = colors.pipeBorder;
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.strokeRect(x - w, y - h * 0.5, w * 2, h);

  // 手柄
  ctx.save();
  ctx.translate(x, y);
  const handleAngle = isOpen ? -Math.PI / 4 : 0;
  ctx.rotate(handleAngle);
  ctx.fillStyle = isOpen ? colors.valveOpen : colors.valveClosed;
  ctx.fillRect(-size * 0.04, -h * 0.55, size * 0.08, h * 0.55);
  ctx.beginPath();
  ctx.arc(0, -h * 0.55, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 状态指示
  ctx.fillStyle = isOpen ? colors.valveOpen : colors.valveClosed;
  ctx.font = `700 ${Math.max(10, size * 0.2)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isOpen ? '开' : '关', x, y);

  // 标签
  ctx.fillStyle = colors.textSecondary;
  ctx.font = `600 ${Math.max(9, size * 0.18)}px sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText('阀门 (S)', x, y + h * 0.6 + size * 0.05);
}
