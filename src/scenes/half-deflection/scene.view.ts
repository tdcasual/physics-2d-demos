import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { halfDeflectionConstants, type HalfDeflectionState } from './scene.sim';

export type CreateHalfDeflectionViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  panelX: PANEL_X,
  panelWidth: PANEL_W,
  panelInset: PANEL_INSET,
  sourceX: SOURCE_X,
  sourceWidth: SOURCE_W,
  sourceHeight: SOURCE_H,
  axisY: AXIS_Y,
  meterX: METER_X,
  meterY: METER_Y,
  meterRadius: METER_R,
  meterFaceWidth: METER_FACE_W,
  meterFaceHeight: METER_FACE_H,
  meterDisplayWidth: METER_DISPLAY_W,
  meterDisplayHeight: METER_DISPLAY_H,
  meterTickOuter: METER_TICK_OUTER,
  resistorX: RESISTOR_X,
  resistorY: RESISTOR_Y,
  resistorWidth: RESISTOR_W,
  resistorHeight: RESISTOR_H,
  boxX: BOX_X,
  boxY: BOX_Y,
  boxWidth: BOX_W,
  boxHeight: BOX_H,
  switchX: SWITCH_X,
  switchY: SWITCH_Y,
  switchWidth: SWITCH_W,
  switchHeight: SWITCH_H,
  auxiliarySwitchX: AUX_SWITCH_X,
  auxiliarySwitchY: AUX_SWITCH_Y,
  sourceY: SOURCE_Y,
  wireLeft: WIRE_LEFT,
  wireRight: WIRE_RIGHT,
  needleLength: NEEDLE_LENGTH,
  titleY: TITLE_Y,
  panelRuleY: PANEL_RULE_Y,
  metricsCardY: METRICS_Y,
  metricsCardHeight: METRICS_H,
  recordCardY: RECORD_Y,
  recordCardHeight: RECORD_H,
  formulaCardY: FORMULA_Y,
  formulaCardHeight: FORMULA_H,
  gridStep: GRID_STEP,
  cardRadius: CARD_RADIUS
} = halfDeflectionConstants;

const GRID_ALPHA = '2b';

type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  soft: string;
  teal: string;
  red: string;
  blue: string;
  gold: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#7a8796',
    border: '#d5dde5',
    grid: '#d5dfe8',
    soft: '#f0f4f7',
    teal: '#2aa597',
    red: '#ed4e55',
    blue: '#377ed0',
    gold: '#e89818'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef3fb',
    muted: '#acb8c9',
    border: '#40506a',
    grid: '#2e405b',
    soft: '#24344d',
    teal: '#39d1b3',
    red: '#fb7185',
    blue: '#70a9ff',
    gold: '#fbbf24'
  }
};

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color: string,
  size: number,
  align: CanvasTextAlign = 'left',
  weight = 600
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number = CARD_RADIUS
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, FIELD_W, BASE_H);
  ctx.strokeStyle = `${p.grid}${GRID_ALPHA}`;
  ctx.lineWidth = 1;
  for (let x = GRID_STEP; x < FIELD_W; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BASE_H);
    ctx.stroke();
  }
  for (let y = GRID_STEP; y < BASE_H; y += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD_W, y);
    ctx.stroke();
  }
}

function drawWire(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(WIRE_LEFT, AXIS_Y);
  ctx.lineTo(WIRE_LEFT, SOURCE_Y);
  ctx.lineTo(WIRE_RIGHT, SOURCE_Y);
  ctx.lineTo(WIRE_RIGHT, AXIS_Y);
  ctx.moveTo(WIRE_LEFT, AXIS_Y);
  ctx.lineTo(METER_X - METER_R, AXIS_Y);
  ctx.moveTo(METER_X + METER_R, AXIS_Y);
  ctx.lineTo(RESISTOR_X - RESISTOR_W / 2, AXIS_Y);
  ctx.stroke();
}

function drawSource(ctx: CanvasRenderingContext2D, p: Palette): void {
  rounded(
    ctx,
    SOURCE_X - SOURCE_W / 2,
    SOURCE_Y - SOURCE_H / 2,
    SOURCE_W,
    SOURCE_H,
    8
  );
  ctx.fillStyle = p.soft;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'E', SOURCE_X - 20, SOURCE_Y, p.ink, 20, 'center', 700);
  text(ctx, '6.0 V', SOURCE_X + 22, SOURCE_Y, p.teal, 14, 'center', 700);
  text(ctx, '+', SOURCE_X - 30, SOURCE_Y - 38, p.red, 17, 'center', 700);
  text(ctx, '−', SOURCE_X + 30, SOURCE_Y - 38, p.blue, 17, 'center', 700);
}

function drawSwitch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  closed: boolean,
  label: string,
  p: Palette
): void {
  rounded(ctx, x - SWITCH_W / 2, y - SWITCH_H / 2, SWITCH_W, SWITCH_H, 10);
  ctx.fillStyle = closed ? p.teal : p.soft;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = closed ? p.panel : p.red;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 28, y + 8);
  ctx.lineTo(closed ? x + 28 : x + 18, y - 8);
  ctx.stroke();
  text(ctx, label, x, y + 34, p.ink, 13, 'center', 700);
}

function drawMeter(
  ctx: CanvasRenderingContext2D,
  state: HalfDeflectionState,
  p: Palette
): void {
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(METER_X, METER_Y, METER_R, 0, Math.PI * 2);
  ctx.fill();
  rounded(
    ctx,
    METER_X - METER_FACE_W / 2,
    METER_Y - METER_FACE_H / 2,
    METER_FACE_W,
    METER_FACE_H,
    14
  );
  ctx.fillStyle = p.soft;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  for (let index = 0; index <= 6; index += 1) {
    const angle = -1.12 + index * 0.37;
    ctx.beginPath();
    ctx.moveTo(METER_X + Math.cos(angle) * 44, METER_Y + Math.sin(angle) * 44);
    ctx.lineTo(
      METER_X + Math.cos(angle) * METER_TICK_OUTER,
      METER_Y + Math.sin(angle) * METER_TICK_OUTER
    );
    ctx.stroke();
  }
  const needleAngle = state.needleAngle;
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(METER_X, METER_Y + 8);
  ctx.lineTo(
    METER_X + Math.cos(needleAngle) * NEEDLE_LENGTH,
    METER_Y + Math.sin(needleAngle) * NEEDLE_LENGTH
  );
  ctx.stroke();
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(METER_X, METER_Y, 8, 0, Math.PI * 2);
  ctx.fill();
  rounded(
    ctx,
    METER_X - METER_DISPLAY_W / 2,
    METER_Y + 64,
    METER_DISPLAY_W,
    METER_DISPLAY_H,
    6
  );
  ctx.fillStyle = '#15233a';
  ctx.fill();
  text(
    ctx,
    `${state.meterReading.toFixed(2)} 格`,
    METER_X,
    METER_Y + 78,
    p.teal,
    13,
    'center',
    700
  );
  text(
    ctx,
    state.params.method === 'current' ? '待测电流表 A' : '待测电压表 V',
    METER_X,
    METER_Y + 124,
    p.ink,
    15,
    'center',
    700
  );
}

function drawResistor(
  ctx: CanvasRenderingContext2D,
  state: HalfDeflectionState,
  p: Palette
): void {
  rounded(
    ctx,
    RESISTOR_X - RESISTOR_W / 2,
    RESISTOR_Y - RESISTOR_H / 2,
    RESISTOR_W,
    RESISTOR_H,
    12
  );
  ctx.fillStyle = p.soft;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let index = 0; index < 5; index += 1) {
    const x = RESISTOR_X - 54 + index * 27;
    ctx[index === 0 ? 'moveTo' : 'lineTo'](
      x,
      RESISTOR_Y + (index % 2 === 0 ? -10 : 10)
    );
  }
  ctx.stroke();
  text(
    ctx,
    `R₁ ${state.params.rheostat.toFixed(0)} Ω`,
    RESISTOR_X,
    RESISTOR_Y + 46,
    p.ink,
    14,
    'center',
    700
  );
  text(ctx, '变阻器', RESISTOR_X, RESISTOR_Y + 66, p.muted, 12, 'center', 600);
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  state: HalfDeflectionState,
  p: Palette
): void {
  const x = BOX_X;
  const y = BOX_Y;
  const width = BOX_W;
  const height = BOX_H;
  rounded(ctx, x, y, width, height, 10);
  ctx.fillStyle = p.soft;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    `R₂ = ${state.params.boxResistance.toFixed(0)} Ω`,
    x + width / 2,
    y + 20,
    p.ink,
    14,
    'center',
    700
  );
  text(ctx, '电阻箱', x + width / 2, y + 42, p.muted, 12, 'center', 600);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: HalfDeflectionState,
  p: Palette,
  scale: number
): void {
  const x = PANEL_X + PANEL_INSET;
  const width = PANEL_W - PANEL_INSET * 2;
  ctx.fillStyle = p.panel;
  ctx.fillRect(PANEL_X, 0, PANEL_W, BASE_H);
  text(ctx, '半偏法测电表内阻', x, TITLE_Y, p.ink, 22 * scale, 'left', 700);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, PANEL_RULE_Y);
  ctx.lineTo(x + width, PANEL_RULE_Y);
  ctx.stroke();
  rounded(ctx, x, METRICS_Y, width, METRICS_H);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '实时测量看板',
    x + 14,
    METRICS_Y + 25,
    p.ink,
    16 * scale,
    'left',
    700
  );
  text(
    ctx,
    state.params.method === 'current' ? '电流表' : '电压表',
    x + width - 14,
    METRICS_Y + 25,
    p.teal,
    14 * scale,
    'right',
    700
  );
  const rows = [
    ['读数', `${state.meterReading.toFixed(2)} 格`],
    ['半偏目标', `${state.halfTarget.toFixed(2)} 格`],
    ['估算内阻', state.estimate ? `${state.estimate.toFixed(0)} Ω` : '—'],
    ['状态', state.status]
  ] as const;
  rows.forEach(([label, value], index) => {
    const y = METRICS_Y + 64 + index * 38;
    text(ctx, label, x + 14, y, p.muted, 14 * scale, 'left', 600);
    text(
      ctx,
      value,
      x + width - 14,
      y,
      index === 2 ? p.teal : p.ink,
      14 * scale,
      'right',
      700
    );
  });
  rounded(ctx, x, RECORD_Y, width, RECORD_H);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, '实验记录', x + 14, RECORD_Y + 24, p.ink, 16 * scale, 'left', 700);
  const header = ['阶段', 'S₂', '读数', 'R₂'];
  header.forEach((label, index) =>
    text(
      ctx,
      label,
      x + 20 + index * 72,
      RECORD_Y + 56,
      p.muted,
      12 * scale,
      'left',
      700
    )
  );
  state.records.forEach((record, index) => {
    const y = RECORD_Y + 88 + index * 34;
    const values = [
      record.stage,
      record.auxiliarySwitch ? '合' : '断',
      record.reading.toFixed(2),
      `${record.boxResistance.toFixed(0)}Ω`
    ];
    values.forEach((value, column) =>
      text(ctx, value, x + 20 + column * 72, y, p.ink, 13 * scale, 'left', 600)
    );
  });
  if (state.params.showAnswer) {
    text(
      ctx,
      `参考：Rₘ ≈ ${state.meterResistance.toFixed(0)} Ω`,
      x + 14,
      RECORD_Y + RECORD_H - 20,
      p.teal,
      13 * scale,
      'left',
      700
    );
  }
  rounded(ctx, x, FORMULA_Y, width, FORMULA_H);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '实验关系',
    x + 14,
    FORMULA_Y + 24,
    p.gold,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    '满偏 → 闭合 S₂ → 半偏',
    x + 14,
    FORMULA_Y + 58,
    p.ink,
    14 * scale,
    'left',
    600
  );
  text(
    ctx,
    `${state.params.method === 'current' ? 'Rₐ' : 'Rᵥ'} ≈ R₂`,
    x + 14,
    FORMULA_Y + 92,
    p.ink,
    18 * scale,
    'left',
    700
  );
}

function drawField(
  ctx: CanvasRenderingContext2D,
  state: HalfDeflectionState,
  p: Palette,
  scale: number
): void {
  drawGrid(ctx, p);
  text(ctx, '半偏法测电表内阻', 26, TITLE_Y, p.ink, 22 * scale, 'left', 700);
  drawWire(ctx, p);
  drawSource(ctx, p);
  drawMeter(ctx, state, p);
  drawResistor(ctx, state, p);
  drawBox(ctx, state, p);
  drawSwitch(ctx, SWITCH_X, SWITCH_Y, state.params.mainSwitch, '总开关 S₁', p);
  drawSwitch(
    ctx,
    AUX_SWITCH_X,
    AUX_SWITCH_Y,
    state.params.auxiliarySwitch,
    '辅助开关 S₂',
    p
  );
  text(
    ctx,
    state.params.method === 'current' ? '电流表半偏法' : '电压表半偏法',
    26,
    104,
    p.teal,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    '断开 S₂ 调满偏；闭合 S₂ 调半偏',
    26,
    128,
    p.muted,
    13 * scale,
    'left',
    600
  );
  drawPanel(ctx, state, p, scale);
}

export function createHalfDeflectionView(
  options: CreateHalfDeflectionViewOptions = {}
) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'clamped', fallbackWidth: BASE_W, fallbackHeight: BASE_H },
    initialWidth: BASE_W,
    initialHeight: BASE_H,
    eagerContext: true
  });
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: HalfDeflectionState | null = null;
  function draw(state: HalfDeflectionState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const scale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    drawField(ctx, state, PALETTE[env.theme], scale);
    ctx.restore();
  }
  return {
    render(state: HalfDeflectionState): void {
      snapshot = state;
      stage.ensureSized();
      draw(state);
    },
    resize(): void {
      stage.resize();
      if (snapshot) draw(snapshot);
    },
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
      if (snapshot) draw(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
      if (snapshot) draw(snapshot);
    },
    dispose(): void {
      snapshot = null;
      stage.release();
    },
    reset(): void {
      snapshot = null;
    }
  };
}
