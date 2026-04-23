import type { EmfAnalogySnapshot } from '../scene.sim';
import type { TeachingTheme } from '../../../platform/standards';

export type WaterDrawOptions = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  snapshot: EmfAnalogySnapshot;
  theme: TeachingTheme;
  phase: number;
  responsiveScale: number;
};

/* ── 颜色主题 ── */
function waterColors(theme: TeachingTheme) {
  const isDark = theme === 'dark';
  return {
    bg: isDark ? '#0b1220' : '#f0f9ff',
    pipeBorder: isDark ? '#3b82f6' : '#60a5fa',
    pipeFill: isDark ? 'rgba(30,58,138,0.35)' : 'rgba(191,219,254,0.45)',
    waterHigh: isDark ? '#3b82f6' : '#2563eb',
    waterMid: isDark ? '#60a5fa' : '#3b82f6',
    waterLow: isDark ? '#93c5fd' : '#60a5fa',
    pumpBody: isDark ? '#1e3a5f' : '#dbeafe',
    pumpBlade: isDark ? '#60a5fa' : '#3b82f6',
    turbine: isDark ? '#475569' : '#94a3b8',
    valveOpen: isDark ? '#4ade80' : '#16a34a',
    valveClosed: isDark ? '#f87171' : '#dc2626',
    mesh: isDark ? '#64748b' : '#94a3b8',
    text: isDark ? '#e2e8f0' : '#1e2937',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    gaugeFace: isDark ? '#0f172a' : '#ffffff',
    gaugeBorder: isDark ? '#475569' : '#cbd5e1',
    gaugeNeedle: isDark ? '#f87171' : '#dc2626',
    panelBg: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.92)',
    panelBorder: isDark ? '#334155' : '#e2e8f0'
  };
}

/* ── 水泵绘制 ── */
function drawPump(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  rotation: number,
  colors: ReturnType<typeof waterColors>
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
function drawTurbine(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  rotation: number,
  loadRatio: number, // 0~1, 阻力越大转得越慢
  colors: ReturnType<typeof waterColors>
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
function drawValve(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  isOpen: boolean,
  colors: ReturnType<typeof waterColors>
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

/* ── 细网管（内阻）绘制 ── */
function drawMeshPipe(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  colors: ReturnType<typeof waterColors>
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

function drawWaterFlow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  width: number,
  speed: number,
  phase: number,
  pressureRatio: number, // 0~1, 压力高低影响颜色
  colors: ReturnType<typeof waterColors>
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
      const wave = Math.sin(t * waveCount * Math.PI * 2 + wavePhase) * width * 0.12;
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

/* ── 压力表 ── */
function drawPressureGauge(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number,
  value: number,
  maxValue: number,
  label: string,
  colors: ReturnType<typeof waterColors>
): void {
  // 表盘
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = colors.gaugeFace;
  ctx.fill();
  ctx.strokeStyle = colors.gaugeBorder;
  ctx.lineWidth = Math.max(1.5, radius * 0.06);
  ctx.stroke();

  // 刻度
  ctx.strokeStyle = colors.textSecondary;
  ctx.lineWidth = Math.max(1, radius * 0.025);
  for (let i = 0; i <= 5; i++) {
    const angle = Math.PI * (0.75 + (i / 5) * 1.5);
    const r1 = radius * 0.72;
    const r2 = radius * 0.82;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
    ctx.stroke();
  }

  // 指针
  const ratio = Math.min(1, Math.max(0, value / maxValue));
  const angle = Math.PI * (0.75 + ratio * 1.5);
  const nx = cx + Math.cos(angle) * radius * 0.6;
  const ny = cy + Math.sin(angle) * radius * 0.6;

  ctx.strokeStyle = colors.gaugeNeedle;
  ctx.lineWidth = Math.max(2, radius * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = colors.text;
  ctx.fill();

  // 数值
  ctx.fillStyle = colors.text;
  ctx.font = `700 ${Math.max(10, radius * 0.28)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value.toFixed(2), cx, cy + radius * 0.15);

  // 标签
  ctx.fillStyle = colors.textSecondary;
  ctx.font = `500 ${Math.max(8, radius * 0.18)}px sans-serif`;
  ctx.fillText(label, cx, cy + radius * 0.45);
}

/* ── 主绘制函数 ── */

export function drawWaterAnalogy(options: WaterDrawOptions): void {
  const { ctx, width, height, snapshot, theme, phase, responsiveScale } = options;
  const colors = waterColors(theme);
  const s = responsiveScale;

  // 背景
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  // 布局计算
  const cx = width / 2;
  const cy = height / 2;
  const pipeY = cy;

  const componentSize = Math.min(width * 0.13, height * 0.18, 70 * s);
  const pipeWidth = Math.max(14, 20 * s);

  // 元件水平分布
  const pumpX = width * 0.15;
  const turbineX = width * 0.42;
  const valveX = width * 0.68;
  const meshX = width * 0.88;
  const meshW = Math.max(20, 28 * s);

  // 动画参数
  const currentI = snapshot.state.currentI;
  const isOn = snapshot.state.isSystemOn;
  const flowSpeed = isOn ? currentI * 2.5 : 0;
  const rotationSpeed = isOn ? currentI * 4 : 0.1;

  // ── 绘制水管回路 ──

  // 上水管：泵 → 水轮机
  drawWaterFlow(
    ctx,
    pumpX + componentSize * 0.4, pipeY - pipeWidth / 2,
    turbineX - componentSize * 0.4, pipeY - pipeWidth / 2,
    pipeWidth, flowSpeed, phase,
    1.0, // 高压
    colors
  );

  // 上水管：水轮机 → 阀门
  drawWaterFlow(
    ctx,
    turbineX + componentSize * 0.4, pipeY - pipeWidth / 2,
    valveX - componentSize * 0.3, pipeY - pipeWidth / 2,
    pipeWidth, flowSpeed, phase,
    0.6, // 中压（经过外阻后）
    colors
  );

  // 上水管：阀门 → 细网管
  drawWaterFlow(
    ctx,
    valveX + componentSize * 0.3, pipeY - pipeWidth / 2,
    meshX - meshW * 0.5, pipeY - pipeWidth / 2,
    pipeWidth, flowSpeed, phase,
    0.5, // 中低压
    colors
  );

  // 回水管：细网管 → 泵
  drawWaterFlow(
    ctx,
    meshX + meshW * 0.5, pipeY + pipeWidth / 2,
    pumpX - componentSize * 0.4, pipeY + pipeWidth / 2,
    pipeWidth, flowSpeed, phase + 0.5,
    0.2, // 低压（经过内阻后）
    colors
  );

  // 连接弯头（简化用半圆）
  ctx.strokeStyle = colors.pipeBorder;
  ctx.lineWidth = pipeWidth;
  ctx.lineCap = 'round';

  // 泵入口弯头
  ctx.beginPath();
  ctx.moveTo(pumpX - componentSize * 0.4, pipeY + pipeWidth / 2);
  ctx.lineTo(pumpX - componentSize * 0.4, pipeY);
  ctx.lineTo(pumpX - componentSize * 0.4, pipeY - pipeWidth / 2);
  ctx.stroke();

  // 细网管出口弯头
  ctx.beginPath();
  ctx.moveTo(meshX + meshW * 0.5, pipeY - pipeWidth / 2);
  ctx.lineTo(meshX + meshW * 0.5 + componentSize * 0.2, pipeY - pipeWidth / 2);
  ctx.lineTo(meshX + meshW * 0.5 + componentSize * 0.2, pipeY + pipeWidth / 2);
  ctx.lineTo(meshX + meshW * 0.5, pipeY + pipeWidth / 2);
  ctx.stroke();

  // ── 绘制元件 ──

  // 水泵
  drawPump(ctx, pumpX, pipeY, componentSize, phase * rotationSpeed * 2, colors);

  // 水轮机（外阻）— 转速与电流成正比，但阻力越大转速越慢
  const externalR = snapshot.state.externalR;
  const loadRatio = externalR === Infinity ? 1 : Math.min(1, externalR / 5);
  drawTurbine(ctx, turbineX, pipeY, componentSize, phase * rotationSpeed, loadRatio, colors);

  // 阀门（开关）
  drawValve(ctx, valveX, pipeY, componentSize, snapshot.state.isSystemOn, colors);

  // 细网管（内阻）
  drawMeshPipe(
    ctx,
    meshX - meshW / 2,
    pipeY - componentSize * 0.25,
    meshW,
    componentSize * 0.5,
    colors
  );

  // ── 压力表 ──
  const gaugeR = componentSize * 0.38;

  // 泵出口压力（高压 = 电动势）
  drawPressureGauge(
    ctx,
    pumpX + componentSize * 0.9,
    pipeY - componentSize * 0.7,
    gaugeR,
    snapshot.state.emf,
    2.0,
    '泵出口压力',
    colors
  );

  // 水轮机后压力（路端电压）
  drawPressureGauge(
    ctx,
    turbineX + componentSize * 0.9,
    pipeY - componentSize * 0.7,
    gaugeR,
    snapshot.state.terminalVoltage,
    2.0,
    '路端压力',
    colors
  );

  // 细网管后压力（低压）
  drawPressureGauge(
    ctx,
    meshX + meshW * 0.8,
    pipeY + componentSize * 0.7,
    gaugeR,
    snapshot.state.internalDrop,
    1.0,
    '内阻压降',
    colors
  );

  // ── 底部数据面板 ──
  const panelW = Math.min(width * 0.88, 460 * s);
  const panelH = Math.max(40, 50 * s);
  const panelX = cx - panelW / 2;
  const panelY = height - panelH - Math.max(10, 14 * s);

  ctx.fillStyle = colors.panelBg;
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = colors.panelBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  const cols = 4;
  const colW = panelW / cols;
  const items = [
    { label: '水泵压力 E', value: `${snapshot.state.emf.toFixed(2)} V` },
    {
      label: '路端压力 U',
      value: `${snapshot.state.terminalVoltage.toFixed(2)} V`
    },
    {
      label: '内阻压降 Ir',
      value: `${snapshot.state.internalDrop.toFixed(2)} V`
    },
    { label: '水流速 I', value: `${snapshot.state.currentI.toFixed(2)} A` }
  ];

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  items.forEach((item, i) => {
    const ix = panelX + colW * i + colW / 2;
    const iy = panelY + panelH / 2;

    ctx.fillStyle = colors.textSecondary;
    ctx.font = `500 ${Math.max(9, 11 * s)}px sans-serif`;
    ctx.fillText(item.label, ix, iy - panelH * 0.18);

    ctx.fillStyle = colors.text;
    ctx.font = `700 ${Math.max(12, 15 * s)}px sans-serif`;
    ctx.fillText(item.value, ix, iy + panelH * 0.18);
  });
}
