import type { EmfAnalogySnapshot } from '../scene.sim';
import type { TeachingTheme } from '../../../platform/standards';

export type CircuitDrawOptions = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  snapshot: EmfAnalogySnapshot;
  theme: TeachingTheme;
  phase: number;
  responsiveScale: number;
};

/* ── 颜色主题 ── */
function themeColors(theme: TeachingTheme) {
  const isDark = theme === 'dark';
  return {
    bg: isDark ? '#0b1220' : '#f8fafc',
    wire: isDark ? '#94a3b8' : '#475569',
    wireActive: isDark ? '#60a5fa' : '#2563eb',
    component: isDark ? '#e2e8f0' : '#1e2937',
    componentFill: isDark ? '#1e293b' : '#ffffff',
    electron: isDark ? '#38bdf8' : '#0ea5e9',
    electronDim: isDark ? '#334155' : '#cbd5e1',
    text: isDark ? '#e2e8f0' : '#1e2937',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    accent: isDark ? '#4ade80' : '#16a34a',
    danger: isDark ? '#f87171' : '#dc2626',
    panelBg: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.9)',
    panelBorder: isDark ? '#334155' : '#e2e8f0'
  };
}

/* ── 辅助：绘制圆角矩形 ── */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/* ── 电路符号绘制 ── */

/** 电池符号 (长线正极 + 短线负极) */
function drawBattery(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  colors: ReturnType<typeof themeColors>
): void {
  const longW = size * 0.7;
  const shortW = size * 0.35;
  const gap = size * 0.12;

  ctx.strokeStyle = colors.component;
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.lineCap = 'round';

  // 正极（长线）
  ctx.beginPath();
  ctx.moveTo(x - longW / 2, y - gap);
  ctx.lineTo(x + longW / 2, y - gap);
  ctx.stroke();

  // 负极（短线）
  ctx.beginPath();
  ctx.moveTo(x - shortW / 2, y + gap);
  ctx.lineTo(x + shortW / 2, y + gap);
  ctx.stroke();

  // 引线
  ctx.lineWidth = Math.max(1.5, size * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.6);
  ctx.lineTo(x, y - gap);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + gap);
  ctx.lineTo(x, y + size * 0.6);
  ctx.stroke();

  // 标签
  ctx.fillStyle = colors.textSecondary;
  ctx.font = `600 ${Math.max(9, size * 0.18)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('E', x + longW / 2 + size * 0.15, y - gap);
}

/** 电阻符号 (锯齿矩形) */
function drawResistor(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  colors: ReturnType<typeof themeColors>,
  label: string
): void {
  const zigzagH = h * 0.35;
  const zigzagCount = 8;
  const step = w / zigzagCount;

  ctx.strokeStyle = colors.component;
  ctx.lineWidth = Math.max(2, h * 0.06);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= zigzagCount; i++) {
    const px = x + i * step;
    const py = y + (i % 2 === 0 ? 0 : zigzagH);
    ctx.lineTo(px, py);
  }
  ctx.stroke();

  // 引线
  ctx.lineWidth = Math.max(1.5, h * 0.04);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y - zigzagH * 0.3);
  ctx.lineTo(x + w / 2, y - h * 0.45);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + zigzagH * 0.3);
  ctx.lineTo(x + w / 2, y + h * 0.45);
  ctx.stroke();

  // 标签
  ctx.fillStyle = colors.textSecondary;
  ctx.font = `600 ${Math.max(9, h * 0.18)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(label, x + w / 2, y + h * 0.5);
}

/** 开关符号 */
function drawSwitch(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  isOn: boolean,
  colors: ReturnType<typeof themeColors>
): void {
  const gap = size * 0.08;

  ctx.strokeStyle = colors.component;
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.lineCap = 'round';

  // 左触点
  ctx.beginPath();
  ctx.moveTo(x - size * 0.35, y);
  ctx.lineTo(x - gap, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x - gap, y, size * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = colors.component;
  ctx.fill();

  // 右触点
  ctx.beginPath();
  ctx.moveTo(x + gap, y);
  ctx.lineTo(x + size * 0.35, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + gap, y, size * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // 闸刀
  ctx.beginPath();
  ctx.moveTo(x - gap, y);
  if (isOn) {
    ctx.lineTo(x + gap, y);
    ctx.strokeStyle = colors.accent;
  } else {
    ctx.lineTo(x + gap, y - size * 0.35);
    ctx.strokeStyle = colors.danger;
  }
  ctx.stroke();

  // 标签
  ctx.fillStyle = colors.textSecondary;
  ctx.font = `600 ${Math.max(9, size * 0.18)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(isOn ? 'S (闭合)' : 'S (断开)', x, y + size * 0.25);
}

/** 电表（圆形表盘 + 指针） */
function drawMeter(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number,
  value: number,
  maxValue: number,
  label: string,
  unit: string,
  colors: ReturnType<typeof themeColors>
): void {
  // 表盘背景
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = colors.componentFill;
  ctx.fill();
  ctx.strokeStyle = colors.component;
  ctx.lineWidth = Math.max(1.5, radius * 0.06);
  ctx.stroke();

  // 刻度弧
  ctx.strokeStyle = colors.textSecondary;
  ctx.lineWidth = Math.max(1, radius * 0.03);
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.78, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();

  // 指针
  const ratio = Math.min(1, Math.max(0, value / maxValue));
  const angle = Math.PI * (0.75 + ratio * 1.5);
  const nx = cx + Math.cos(angle) * radius * 0.65;
  const ny = cy + Math.sin(angle) * radius * 0.65;

  ctx.strokeStyle = colors.danger;
  ctx.lineWidth = Math.max(2, radius * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.stroke();

  // 中心点
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = colors.component;
  ctx.fill();

  // 数值
  ctx.fillStyle = colors.text;
  ctx.font = `700 ${Math.max(10, radius * 0.28)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value.toFixed(2), cx, cy + radius * 0.15);

  // 单位标签
  ctx.fillStyle = colors.textSecondary;
  ctx.font = `500 ${Math.max(8, radius * 0.18)}px sans-serif`;
  ctx.fillText(`${label} (${unit})`, cx, cy + radius * 0.42);
}

/* ── 电子流动动画 ── */

const ELECTRON_COUNT = 24;
const electronPositions: number[] = Array.from(
  { length: ELECTRON_COUNT },
  (_, i) => i / ELECTRON_COUNT
);

/** 沿折线绘制流动的电子 */
function drawElectronsOnPath(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  speed: number,
  phase: number,
  responsiveScale: number,
  colors: ReturnType<typeof themeColors>
): void {
  if (points.length < 2) return;

  // 计算路径总长度和各段长度
  const segments: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const len = Math.hypot(
      points[i + 1].x - points[i].x,
      points[i + 1].y - points[i].y
    );
    segments.push(len);
    totalLen += len;
  }
  if (totalLen < 1) return;

  const r = Math.max(2, 3 * responsiveScale);

  for (let i = 0; i < ELECTRON_COUNT; i++) {
    let t = (electronPositions[i] + phase * speed * 0.3) % 1;
    if (t < 0) t += 1;

    const dist = t * totalLen;
    let accumulated = 0;
    let segIndex = 0;
    for (let s = 0; s < segments.length; s++) {
      if (accumulated + segments[s] >= dist) {
        segIndex = s;
        break;
      }
      accumulated += segments[s];
    }

    const segT = segments[segIndex] > 0
      ? (dist - accumulated) / segments[segIndex]
      : 0;
    const p0 = points[segIndex];
    const p1 = points[segIndex + 1];
    const ex = p0.x + (p1.x - p0.x) * segT;
    const ey = p0.y + (p1.y - p0.y) * segT;

    // 电子亮度：在开关闭合且电流>0时显示，否则暗淡
    const brightness = speed > 0.05 ? 1 : 0.25;
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.fillStyle = speed > 0.05
      ? colors.electron
      : colors.electronDim;
    ctx.globalAlpha = brightness;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/* ── 主绘制函数 ── */

export function drawCircuit(options: CircuitDrawOptions): void {
  const { ctx, width, height, snapshot, theme, phase, responsiveScale } = options;
  const colors = themeColors(theme);
  const s = responsiveScale;

  // 背景
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  // 居中布局计算
  const cx = width / 2;
  const cy = height / 2;
  const circuitW = Math.min(width * 0.82, 700 * s);
  const circuitH = Math.min(height * 0.72, 420 * s);
  const left = cx - circuitW / 2;
  const right = cx + circuitW / 2;
  const top = cy - circuitH / 2;
  const bottom = cy + circuitH / 2;

  const padX = circuitW * 0.12;
  const padY = circuitH * 0.15;

  // 元件位置
  const batteryX = left + padX;
  const batteryY = cy;
  const extResX = cx;
  const extResY = top + padY;
  const switchX = right - padX;
  const switchY = cy;
  const intResX = cx;
  const intResY = bottom - padY;

  const componentSize = Math.min(circuitW * 0.1, circuitH * 0.12, 56 * s);

  // 导线连接点（顺时针）
  const pathPoints = [
    { x: batteryX, y: top + padY },      // 电池上 → 外阻左
    { x: extResX - componentSize * 0.5, y: top + padY },
    { x: extResX + componentSize * 0.5, y: top + padY },
    { x: right - padX, y: top + padY },   // 外阻右 → 开关上
    { x: switchX, y: switchY - componentSize * 0.5 },
    { x: switchX, y: switchY + componentSize * 0.5 },
    { x: right - padX, y: bottom - padY }, // 开关下 → 内阻右
    { x: intResX + componentSize * 0.5, y: bottom - padY },
    { x: intResX - componentSize * 0.5, y: bottom - padY },
    { x: left + padX, y: bottom - padY },  // 内阻左 → 电池下
    { x: batteryX, y: batteryY + componentSize * 0.5 },
    { x: batteryX, y: batteryY - componentSize * 0.5 }
  ];

  // 绘制导线
  ctx.strokeStyle = snapshot.state.isSystemOn && snapshot.state.currentI > 0
    ? colors.wireActive
    : colors.wire;
  ctx.lineWidth = Math.max(2, 3 * s);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
  for (let i = 1; i < pathPoints.length; i++) {
    ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
  }
  ctx.closePath();
  ctx.stroke();

  // 电子流动动画
  if (snapshot.state.isSystemOn) {
    drawElectronsOnPath(
      ctx,
      pathPoints,
      snapshot.state.currentI,
      phase,
      s,
      colors
    );
  }

  // 绘制电池
  drawBattery(ctx, batteryX, batteryY, componentSize, colors);

  // 绘制外电阻
  drawResistor(
    ctx,
    extResX - componentSize * 0.5,
    extResY - componentSize * 0.15,
    componentSize,
    componentSize * 0.45,
    colors,
    `R = ${snapshot.state.externalR === Infinity ? '∞' : snapshot.state.externalR.toFixed(1)}Ω`
  );

  // 绘制开关
  drawSwitch(ctx, switchX, switchY, componentSize, snapshot.state.isSystemOn, colors);

  // 绘制内阻
  drawResistor(
    ctx,
    intResX - componentSize * 0.5,
    intResY - componentSize * 0.15,
    componentSize,
    componentSize * 0.45,
    colors,
    `r = ${snapshot.state.internalR}Ω`
  );

  // 绘制电流表（串联在电路中，放在电池和外阻之间）
  const ammeterX = batteryX + (extResX - batteryX) * 0.5;
  const ammeterY = top + padY - componentSize * 0.7;
  drawMeter(
    ctx,
    ammeterX,
    ammeterY,
    componentSize * 0.45,
    snapshot.state.currentI,
    3.5,
    'A',
    'A',
    colors
  );

  // 绘制电压表（并联在外电阻两端）
  const voltmeterX = extResX + componentSize * 1.8;
  const voltmeterY = extResY;
  drawMeter(
    ctx,
    voltmeterX,
    voltmeterY,
    componentSize * 0.45,
    snapshot.state.terminalVoltage,
    1.5,
    'V',
    'V',
    colors
  );

  // 电压表引线
  ctx.strokeStyle = colors.textSecondary;
  ctx.lineWidth = Math.max(1, s);
  ctx.setLineDash([4 * s, 3 * s]);
  ctx.beginPath();
  ctx.moveTo(voltmeterX, voltmeterY + componentSize * 0.5);
  ctx.lineTo(voltmeterX, extResY + componentSize * 0.35);
  ctx.lineTo(extResX + componentSize * 0.5, extResY + componentSize * 0.35);
  ctx.stroke();
  ctx.setLineDash([]);

  // 底部公式面板
  const panelW = Math.min(circuitW * 0.7, 380 * s);
  const panelH = Math.max(36, 44 * s);
  const panelX = cx - panelW / 2;
  const panelY = height - panelH - Math.max(12, 16 * s);

  roundRect(ctx, panelX, panelY, panelW, panelH, 8 * s);
  ctx.fillStyle = colors.panelBg;
  ctx.fill();
  ctx.strokeStyle = colors.panelBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = colors.text;
  ctx.font = `500 ${Math.max(12, 15 * s)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const prefix = `I = E/(R+r) = ${snapshot.state.emf.toFixed(1)}/(${snapshot.state.externalR === Infinity ? '∞' : snapshot.state.externalR.toFixed(1)}+${snapshot.state.internalR}) = `;
  ctx.fillText(prefix, cx - panelW * 0.08, panelY + panelH * 0.5);

  const value = snapshot.state.currentI.toFixed(2) + ' A';
  ctx.fillStyle = colors.accent;
  ctx.font = `700 ${Math.max(12, 15 * s)}px monospace`;
  ctx.fillText(value, cx + panelW * 0.32, panelY + panelH * 0.5);
}
