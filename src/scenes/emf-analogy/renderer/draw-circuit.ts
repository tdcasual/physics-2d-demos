import type { EmfAnalogySnapshot } from '../scene.sim';
import type { TeachingTheme } from '../../../platform/standards';
import { circuitColors } from './circuit-colors';
import {
  drawBattery,
  drawResistor,
  drawSwitch,
  drawMeter
} from './draw-circuit-components';
import { drawElectronsOnPath } from './draw-electron-flow';

export type CircuitDrawOptions = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  snapshot: EmfAnalogySnapshot;
  theme: TeachingTheme;
  phase: number;
  responsiveScale: number;
};

/* ── 主绘制函数 ── */
export function drawCircuit(options: CircuitDrawOptions): void {
  const { ctx, width, height, snapshot, theme, phase, responsiveScale } =
    options;
  const colors = circuitColors(theme);
  const s = responsiveScale;

  // 背景
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  // 布局计算
  const cx = width / 2;
  const cy = height * 0.4;
  const circuitW = Math.min(width * 0.85, 600 * s);

  const batteryX = cx - circuitW * 0.4;
  const resistorX = cx;
  const switchX = cx + circuitW * 0.35;
  const wireY = cy;

  const componentSize = Math.min(width * 0.1, height * 0.12, 55 * s);
  const wireThickness = Math.max(2, 3 * s);

  const currentI = snapshot.state.currentI;
  const isOn = snapshot.state.isSystemOn;
  const electronSpeed = isOn ? currentI * 2 : 0;

  // ── 绘制导线回路 ──
  ctx.strokeStyle = isOn ? colors.wireActive : colors.wire;
  ctx.lineWidth = wireThickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 上导线：电池 → 电阻
  ctx.beginPath();
  ctx.moveTo(batteryX, wireY - componentSize * 0.5);
  ctx.lineTo(resistorX - componentSize * 0.3, wireY - componentSize * 0.5);
  ctx.stroke();

  // 上导线：电阻 → 开关
  ctx.beginPath();
  ctx.moveTo(resistorX + componentSize * 0.3, wireY - componentSize * 0.5);
  ctx.lineTo(switchX, wireY - componentSize * 0.5);
  ctx.stroke();

  // 下导线：开关 → 电池
  ctx.beginPath();
  ctx.moveTo(switchX, wireY + componentSize * 0.5);
  ctx.lineTo(batteryX, wireY + componentSize * 0.5);
  ctx.stroke();

  // ── 绘制元件 ──

  // 电池
  drawBattery(ctx, batteryX, wireY, componentSize, colors);

  // 外阻
  drawResistor(
    ctx,
    resistorX - componentSize * 0.3,
    wireY - componentSize * 0.15,
    componentSize * 0.6,
    componentSize * 0.3,
    colors,
    'R'
  );

  // 开关
  drawSwitch(
    ctx,
    switchX,
    wireY,
    componentSize,
    snapshot.state.isSystemOn,
    colors
  );

  // 内阻（用短线表示）
  ctx.strokeStyle = colors.component;
  ctx.lineWidth = Math.max(2, componentSize * 0.05);
  ctx.beginPath();
  ctx.moveTo(batteryX - componentSize * 0.2, wireY - componentSize * 0.5);
  ctx.lineTo(batteryX + componentSize * 0.2, wireY - componentSize * 0.5);
  ctx.stroke();
  ctx.fillStyle = colors.textSecondary;
  ctx.font = `600 ${Math.max(8, componentSize * 0.15)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('r', batteryX, wireY - componentSize * 0.65);

  // ── 电子流动动画 ──
  if (isOn && currentI > 0.01) {
    // 上路径（电池→电阻→开关）
    drawElectronsOnPath(
      ctx,
      [
        { x: batteryX, y: wireY - componentSize * 0.5 },
        { x: resistorX, y: wireY - componentSize * 0.5 },
        { x: switchX, y: wireY - componentSize * 0.5 }
      ],
      electronSpeed,
      phase,
      responsiveScale,
      colors
    );

    // 下路径（开关→电池）
    drawElectronsOnPath(
      ctx,
      [
        { x: switchX, y: wireY + componentSize * 0.5 },
        { x: batteryX, y: wireY + componentSize * 0.5 }
      ],
      electronSpeed,
      phase + 0.5,
      responsiveScale,
      colors
    );
  }

  // ── 电表 ──
  const meterR = componentSize * 0.32;

  // 电流表（串联在电路中）
  drawMeter(
    ctx,
    resistorX,
    wireY + componentSize * 0.9,
    meterR,
    snapshot.state.currentI,
    2.0,
    '电流',
    'A',
    colors
  );

  // 电压表（并联在电阻两端）
  drawMeter(
    ctx,
    resistorX,
    wireY - componentSize * 0.9,
    meterR,
    snapshot.state.terminalVoltage,
    2.0,
    '电压',
    'V',
    colors
  );
}
