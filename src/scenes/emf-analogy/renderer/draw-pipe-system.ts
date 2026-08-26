import type { WaterColors } from './water-colors';

/* ── 细网管（内阻）绘制 ── */
export function drawMeshPipe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  colors: WaterColors
): void {
  // 管体
  ctx.fillStyle = colors.panelBg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = colors.mesh;
  ctx.lineWidth = Math.max(1.5, h * 0.04);
  ctx.strokeRect(x, y, w, h);

  // 网格
  ctx.strokeStyle = colors.mesh;
  ctx.lineWidth = 1;
  const gridSize = Math.max(4, h * 0.25);
  ctx.beginPath();
  for (let gx = x; gx <= x + w; gx += gridSize) {
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
  }
  for (let gy = y; gy <= y + h; gy += gridSize) {
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
  }
  ctx.stroke();

  // 标签
  ctx.fillStyle = colors.textSecondary;
  ctx.font = `600 ${Math.max(9, h * 0.35)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('细网管 (r)', x + w / 2, y + h / 2);
}

/* ── 水管 + 水流动画 ── */

interface WaterParticle {
  t: number; // 0~1 沿管道位置
  yOffset: number; // 垂直偏移
  speedOffset: number;
  size: number;
}

let waterParticles: WaterParticle[] | null = null;

function getWaterParticles(count: number): WaterParticle[] {
  if (!waterParticles || waterParticles.length !== count) {
    waterParticles = Array.from({ length: count }, () => ({
      t: Math.random(),
      yOffset: (Math.random() - 0.5) * 0.6,
      speedOffset: 0.8 + Math.random() * 0.4,
      size: 0.5 + Math.random() * 0.8
    }));
  }
  return waterParticles;
}

export function drawWaterFlow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  speed: number,
  phase: number,
  pressureRatio: number, // 0~1, 压力高低影响颜色
  colors: WaterColors
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;

  const nx = -dy / len;
  const ny = dx / len;

  // 管道背景
  ctx.strokeStyle = colors.pipeBorder;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // 管道填充
  ctx.strokeStyle = colors.pipeFill;
  ctx.lineWidth = width - 4;
  ctx.stroke();

  // 水流动画 — 波浪线主体
  const waveCount = Math.max(2, Math.floor(len / 30));
  const wavePhase = phase * 4;

  ctx.save();
  ctx.beginPath();
  ctx.rect(
    Math.min(x1, x2) - width / 2,
    Math.min(y1, y2) - width / 2,
    Math.abs(dx) + width,
    Math.abs(dy) + width
  );
  ctx.clip();

  // 颜色渐变：高压端 → 低压端
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  const highColor = pressureRatio > 0.5 ? colors.waterHigh : colors.waterMid;
  const lowColor = pressureRatio > 0.2 ? colors.waterMid : colors.waterLow;
  gradient.addColorStop(0, highColor);
  gradient.addColorStop(1, lowColor);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = Math.max(2, width * 0.25);
  ctx.lineCap = 'round';

  for (let w = -1; w <= 1; w += 0.5) {
    const offset = w * width * 0.25;
    ctx.beginPath();
    for (let i = 0; i <= waveCount * 10; i++) {
      const t = i / (waveCount * 10);
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const wave =
        Math.sin(t * waveCount * Math.PI * 2 + wavePhase) * width * 0.12;
      const fx = px + nx * (offset + wave);
      const fy = py + ny * (offset + wave);
      if (i === 0) ctx.moveTo(fx, fy);
      else ctx.lineTo(fx, fy);
    }
    ctx.globalAlpha = 0.4 + Math.abs(w) * 0.2;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 高光粒子
  const particles = getWaterParticles(Math.max(8, Math.floor(len / 15)));
  const flowSpeed = speed * 0.4;

  for (const p of particles) {
    let t = (p.t + phase * flowSpeed * p.speedOffset) % 1;
    if (t < 0) t += 1;

    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const offX = nx * p.yOffset * width * 0.3;
    const offY = ny * p.yOffset * width * 0.3;

    const particleColor = t < 0.5 ? highColor : lowColor;
    ctx.beginPath();
    ctx.arc(px + offX, py + offY, p.size * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = particleColor;
    ctx.globalAlpha = 0.6;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
