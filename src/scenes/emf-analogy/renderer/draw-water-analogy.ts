import type { EmfAnalogySnapshot } from '../scene.sim';
import type { TeachingTheme } from '../../../platform/standards';
import { waterColors, type WaterColors } from './water-colors';
import { drawPump, drawTurbine, drawValve } from './draw-hydraulic-components';
import { drawMeshPipe, drawWaterFlow } from './draw-pipe-system';

export type WaterDrawOptions = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  snapshot: EmfAnalogySnapshot;
  theme: TeachingTheme;
  phase: number;
  responsiveScale: number;
};

/* ── 压力表 ── */
function drawPressureGauge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  value: number,
  maxValue: number,
  label: string,
  colors: WaterColors
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
  const { ctx, width, height, snapshot, theme, phase, responsiveScale } =
    options;
  const colors = waterColors(theme);
  const s = responsiveScale;

  // 背景
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  // 布局计算
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
    pumpX + componentSize * 0.4,
    pipeY - pipeWidth / 2,
    turbineX - componentSize * 0.4,
    pipeY - pipeWidth / 2,
    pipeWidth,
    flowSpeed,
    phase,
    1.0, // 高压
    'pipe-pump-turbine',
    colors
  );

  // 上水管：水轮机 → 阀门
  drawWaterFlow(
    ctx,
    turbineX + componentSize * 0.4,
    pipeY - pipeWidth / 2,
    valveX - componentSize * 0.3,
    pipeY - pipeWidth / 2,
    pipeWidth,
    flowSpeed,
    phase,
    0.6, // 中压（经过外阻后）
    'pipe-turbine-valve',
    colors
  );

  // 上水管：阀门 → 细网管
  drawWaterFlow(
    ctx,
    valveX + componentSize * 0.3,
    pipeY - pipeWidth / 2,
    meshX - meshW * 0.5,
    pipeY - pipeWidth / 2,
    pipeWidth,
    flowSpeed,
    phase,
    0.5, // 中低压
    'pipe-valve-mesh',
    colors
  );

  // 回水管：细网管 → 泵
  drawWaterFlow(
    ctx,
    meshX + meshW * 0.5,
    pipeY + pipeWidth / 2,
    pumpX - componentSize * 0.4,
    pipeY + pipeWidth / 2,
    pipeWidth,
    flowSpeed,
    phase + 0.5,
    0.2, // 低压（经过内阻后）
    'pipe-mesh-pump',
    colors
  );

  // 连接弯头（圆弧过渡）
  ctx.strokeStyle = colors.pipeBorder;
  ctx.lineWidth = pipeWidth;
  ctx.lineCap = 'round';

  const elbowR = pipeWidth * 1.2;

  // 泵入口弯头（左侧 U 形）
  const pumpElbowX = pumpX - componentSize * 0.4;
  ctx.beginPath();
  ctx.moveTo(pumpElbowX, pipeY + pipeWidth / 2);
  ctx.arcTo(pumpElbowX, pipeY, pumpElbowX - elbowR, pipeY, elbowR);
  ctx.arcTo(
    pumpElbowX - elbowR,
    pipeY,
    pumpElbowX - elbowR,
    pipeY - pipeWidth / 2,
    elbowR
  );
  ctx.lineTo(pumpElbowX, pipeY - pipeWidth / 2);
  ctx.stroke();

  // 细网管出口弯头（右侧 U 形）
  const meshElbowX = meshX + meshW * 0.5;
  ctx.beginPath();
  ctx.moveTo(meshElbowX, pipeY - pipeWidth / 2);
  ctx.arcTo(
    meshElbowX + elbowR,
    pipeY - pipeWidth / 2,
    meshElbowX + elbowR,
    pipeY,
    elbowR
  );
  ctx.arcTo(
    meshElbowX + elbowR,
    pipeY,
    meshElbowX,
    pipeY + pipeWidth / 2,
    elbowR
  );
  ctx.stroke();

  // ── 绘制元件 ──

  // 水泵
  drawPump(ctx, pumpX, pipeY, componentSize, phase * rotationSpeed * 2, colors);

  // 水轮机（外阻）— 转速与电流成正比，但阻力越大转速越慢
  const externalR = snapshot.state.externalR;
  const loadRatio = externalR === Infinity ? 1 : Math.min(1, externalR / 5);
  drawTurbine(
    ctx,
    turbineX,
    pipeY,
    componentSize,
    phase * rotationSpeed,
    loadRatio,
    colors
  );

  // 阀门（开关）
  drawValve(
    ctx,
    valveX,
    pipeY,
    componentSize,
    snapshot.state.isSystemOn,
    colors
  );

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
}
