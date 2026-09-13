import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { oscilloscopeConstants, type OscilloscopeState } from './scene.sim';

export type CreateOscilloscopeViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  panelWidth: PANEL_W,
  panelInset: INSET,
  tubeLeft: TUBE_LEFT,
  tubeRight: TUBE_RIGHT,
  tubeCenterY: TUBE_CENTER_Y,
  tubeHeight: TUBE_HEIGHT,
  scopeCenterX: SCOPE_CX,
  scopeCenterY: SCOPE_CY,
  scopeRadius: SCOPE_R,
  plateX: PLATE_X,
  plateYTop: PLATE_Y_TOP,
  plateWidth: PLATE_WIDTH,
  xPlateX: X_PLATE_X,
  xPlateY: X_PLATE_Y,
  xPlateHeight: X_PLATE_HEIGHT,
  waveLeft: WAVE_LEFT,
  waveRight: WAVE_RIGHT,
  signalWaveY: SIGNAL_WAVE_Y,
  scanWaveY: SCAN_WAVE_Y,
  waveHeight: WAVE_HEIGHT,
  visualTimeScale: VISUAL_TIME_SCALE,
  gridStep: GRID_STEP,
  stableCardY: STABLE_CARD_Y,
  stableCardHeight: STABLE_CARD_HEIGHT,
  formulaCardY: FORMULA_CARD_Y,
  formulaCardHeight: FORMULA_CARD_HEIGHT
} = oscilloscopeConstants;

type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  blue: string;
  cyan: string;
  pink: string;
  green: string;
  border: string;
  scopeBg: string;
  scopeGrid: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#ffffff',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#8793a2',
    blue: '#4388ff',
    cyan: '#39c2e9',
    pink: '#ee1977',
    green: '#1aa082',
    border: '#d4dce5',
    scopeBg: '#081820',
    scopeGrid: '#1d3a4a'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    blue: '#79a9ff',
    cyan: '#59d8f5',
    pink: '#ff4e9e',
    green: '#4dd4c0',
    border: '#3d4d63',
    scopeBg: '#06141c',
    scopeGrid: '#244358'
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

function drawTube(
  ctx: CanvasRenderingContext2D,
  state: OscilloscopeState,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = 'rgba(235,242,247,0.38)';
  ctx.strokeStyle = '#a8b3bf';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(TUBE_LEFT + 24, TUBE_CENTER_Y - TUBE_HEIGHT / 2);
  ctx.quadraticCurveTo(
    TUBE_LEFT,
    TUBE_CENTER_Y - TUBE_HEIGHT / 2,
    TUBE_LEFT,
    TUBE_CENTER_Y
  );
  ctx.quadraticCurveTo(
    TUBE_LEFT,
    TUBE_CENTER_Y + TUBE_HEIGHT / 2,
    TUBE_LEFT + 24,
    TUBE_CENTER_Y + TUBE_HEIGHT / 2
  );
  ctx.lineTo(TUBE_RIGHT - 30, TUBE_CENTER_Y + TUBE_HEIGHT / 2);
  ctx.quadraticCurveTo(
    TUBE_RIGHT,
    TUBE_CENTER_Y + TUBE_HEIGHT / 2,
    TUBE_RIGHT,
    TUBE_CENTER_Y
  );
  ctx.quadraticCurveTo(
    TUBE_RIGHT,
    TUBE_CENTER_Y - TUBE_HEIGHT / 2,
    TUBE_RIGHT - 30,
    TUBE_CENTER_Y - TUBE_HEIGHT / 2
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#aab7c3';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([9, 9]);
  ctx.beginPath();
  ctx.moveTo(TUBE_LEFT + 30, TUBE_CENTER_Y);
  ctx.lineTo(TUBE_RIGHT - 20, TUBE_CENTER_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = '#3e4650';
    ctx.fillRect(
      TUBE_LEFT + 42 + i * 26,
      TUBE_CENTER_Y - 25 + i * 5,
      15,
      50 - i * 10
    );
  }
  ctx.fillStyle = p.cyan;
  ctx.beginPath();
  ctx.arc(TUBE_LEFT + 24, TUBE_CENTER_Y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.roundRect(PLATE_X, TUBE_CENTER_Y - PLATE_Y_TOP, PLATE_WIDTH, 14, 5);
  ctx.roundRect(PLATE_X, TUBE_CENTER_Y + 44, PLATE_WIDTH, 14, 5);
  ctx.fill();
  ctx.fillStyle = p.pink;
  ctx.fillRect(X_PLATE_X, TUBE_CENTER_Y - X_PLATE_Y, 34, X_PLATE_HEIGHT);
  ctx.fillStyle = p.cyan;
  const beamX =
    TUBE_LEFT + 30 + (TUBE_RIGHT - TUBE_LEFT - 60) * state.electronX;
  const beamY = TUBE_CENTER_Y + state.electronY * 62;
  ctx.strokeStyle = p.cyan;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(TUBE_LEFT + 30, TUBE_CENTER_Y);
  ctx.lineTo(beamX, beamY);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(beamX, beamY, 8, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'Y', 274, TUBE_CENTER_Y - 78, p.blue, 17 * scale, 'center', 700);
  text(ctx, 'Y′', 274, TUBE_CENTER_Y + 83, p.blue, 17 * scale, 'center', 700);
  text(ctx, 'X', 374, TUBE_CENTER_Y - 72, p.pink, 17 * scale, 'center', 700);
  text(ctx, 'X′', 374, TUBE_CENTER_Y + 75, p.pink, 17 * scale, 'center', 700);
  text(
    ctx,
    '电子枪',
    TUBE_LEFT + 74,
    TUBE_CENTER_Y + 104,
    p.muted,
    14 * scale,
    'center'
  );
  text(
    ctx,
    '荧光屏',
    TUBE_RIGHT - 2,
    TUBE_CENTER_Y + 4,
    p.muted,
    14 * scale,
    'left'
  );
}

function drawScope(
  ctx: CanvasRenderingContext2D,
  state: OscilloscopeState,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.scopeBg;
  ctx.beginPath();
  ctx.arc(SCOPE_CX, SCOPE_CY, SCOPE_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(SCOPE_CX, SCOPE_CY, SCOPE_R - 8, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = p.scopeGrid;
  ctx.lineWidth = 1;
  for (let x = SCOPE_CX - SCOPE_R; x <= SCOPE_CX + SCOPE_R; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, SCOPE_CY - SCOPE_R);
    ctx.lineTo(x, SCOPE_CY + SCOPE_R);
    ctx.stroke();
  }
  for (let y = SCOPE_CY - SCOPE_R; y <= SCOPE_CY + SCOPE_R; y += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(SCOPE_CX - SCOPE_R, y);
    ctx.lineTo(SCOPE_CX + SCOPE_R, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#738b98';
  ctx.beginPath();
  ctx.moveTo(SCOPE_CX - SCOPE_R, SCOPE_CY);
  ctx.lineTo(SCOPE_CX + SCOPE_R, SCOPE_CY);
  ctx.moveTo(SCOPE_CX, SCOPE_CY - SCOPE_R);
  ctx.lineTo(SCOPE_CX, SCOPE_CY + SCOPE_R);
  ctx.stroke();
  ctx.strokeStyle = p.cyan;
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (state.params.scanEnabled) {
    const cycles = Math.max(1, Math.min(8, Math.round(state.cyclesPerScan)));
    for (let i = 0; i <= 220; i += 1) {
      const normalized = i / 220;
      const x = SCOPE_CX - SCOPE_R + normalized * SCOPE_R * 2;
      const y =
        SCOPE_CY -
        Math.sin(normalized * Math.PI * 2 * cycles) *
          state.params.signalAmplitude *
          1.8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  } else {
    ctx.moveTo(SCOPE_CX, SCOPE_CY - state.params.signalAmplitude * 1.8);
    ctx.lineTo(SCOPE_CX, SCOPE_CY + state.params.signalAmplitude * 1.8);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#344752';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(SCOPE_CX, SCOPE_CY, SCOPE_R, 0, Math.PI * 2);
  ctx.stroke();
  text(
    ctx,
    'Y',
    SCOPE_CX,
    SCOPE_CY - SCOPE_R + 20,
    p.blue,
    16 * scale,
    'center',
    700
  );
  text(
    ctx,
    'X',
    SCOPE_CX + SCOPE_R - 16,
    SCOPE_CY,
    p.pink,
    16 * scale,
    'center',
    700
  );
  text(
    ctx,
    '示波屏',
    SCOPE_CX,
    SCOPE_CY + SCOPE_R + 22,
    p.muted,
    15 * scale,
    'center'
  );
}

function drawWave(
  ctx: CanvasRenderingContext2D,
  state: OscilloscopeState,
  p: Palette,
  scale: number
): void {
  const drawAxis = (y: number, label: string, color: string): void => {
    ctx.strokeStyle = '#909aa6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(WAVE_LEFT, y);
    ctx.lineTo(WAVE_RIGHT + 12, y);
    ctx.stroke();
    text(
      ctx,
      label,
      WAVE_LEFT - 8,
      y - WAVE_HEIGHT - 12,
      color,
      14 * scale,
      'right',
      700
    );
    text(ctx, 't', WAVE_RIGHT + 22, y, p.ink, 13 * scale, 'center');
  };
  text(
    ctx,
    '信号展开原理（波形同步）',
    (WAVE_LEFT + WAVE_RIGHT) / 2,
    360,
    p.ink,
    17 * scale,
    'center',
    700
  );
  drawAxis(SIGNAL_WAVE_Y, 'Uy', p.blue);
  drawAxis(SCAN_WAVE_Y, 'Ux', p.pink);
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 120; i += 1) {
    const t = i / 120;
    const x = WAVE_LEFT + t * (WAVE_RIGHT - WAVE_LEFT);
    const y =
      SIGNAL_WAVE_Y -
      Math.sin(
        t *
          Math.PI *
          2 *
          Math.max(1, Math.min(7, Math.round(state.cyclesPerScan)))
      ) *
        WAVE_HEIGHT *
        0.5;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.strokeStyle = p.pink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 120; i += 1) {
    const t = i / 120;
    const x = WAVE_LEFT + t * (WAVE_RIGHT - WAVE_LEFT);
    const y = SCAN_WAVE_Y + WAVE_HEIGHT * 0.55 - t * WAVE_HEIGHT;
    if (i % 40 === 0) {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    } else if (i % 40 === 1) {
      ctx.moveTo(x, SCAN_WAVE_Y - WAVE_HEIGHT * 0.45);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  const cursorX =
    WAVE_LEFT +
    ((state.time * state.params.scanFrequency * VISUAL_TIME_SCALE) % 1) *
      (WAVE_RIGHT - WAVE_LEFT);
  ctx.strokeStyle = p.green;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(cursorX, SIGNAL_WAVE_Y - WAVE_HEIGHT);
  ctx.lineTo(cursorX, SCAN_WAVE_Y + WAVE_HEIGHT);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: OscilloscopeState,
  p: Palette,
  scale: number
): void {
  const x = FIELD_W;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, 0, PANEL_W, BASE_H);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, BASE_H);
  ctx.stroke();
  text(ctx, '参数控制台', x + INSET, 42, p.ink, 20 * scale, 'left', 700);
  text(ctx, '波形同步条件', x + INSET, 84, p.muted, 14 * scale, 'left', 700);
  const rows: Array<[string, string, string]> = [
    ['振幅 Aᵧ', `${state.params.signalAmplitude.toFixed(0)}`, p.blue],
    ['频率 fᵧ', `${state.params.signalFrequency.toFixed(0)} Hz`, p.blue],
    ['扫描幅度 Aₓ', `${state.params.scanAmplitude.toFixed(0)}`, p.pink],
    ['扫描频率 fₓ', `${state.params.scanFrequency.toFixed(0)} Hz`, p.pink]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = 128 + index * 52;
    ctx.fillStyle = p.scopeBg === '#081820' ? '#f8fafc' : p.scopeBg;
    ctx.beginPath();
    ctx.roundRect(x + INSET, y - 19, PANEL_W - INSET * 2, 38, 9);
    ctx.fill();
    text(ctx, label, x + INSET + 14, y, p.ink, 13 * scale);
    text(
      ctx,
      value,
      x + PANEL_W - INSET - 14,
      y,
      color,
      14 * scale,
      'right',
      700
    );
  });
  ctx.fillStyle = state.stable ? '#e1f7ef' : '#fff3df';
  ctx.beginPath();
  ctx.roundRect(
    x + INSET,
    STABLE_CARD_Y,
    PANEL_W - INSET * 2,
    STABLE_CARD_HEIGHT,
    10
  );
  ctx.fill();
  text(
    ctx,
    state.stable ? '✓ 波形稳定' : '调整 fᵧ / fₓ',
    x + INSET + 16,
    386,
    state.stable ? p.green : p.pink,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    `fᵧ / fₓ = ${state.cyclesPerScan.toFixed(2)}`,
    x + INSET + 16,
    416,
    p.ink,
    13 * scale,
    'left'
  );
  text(
    ctx,
    state.stable
      ? `显示 ${Math.round(state.cyclesPerScan)} 个完整波`
      : '波形缓慢移动',
    x + INSET + 16,
    440,
    p.muted,
    12 * scale,
    'left'
  );
  ctx.fillStyle = p.panel;
  ctx.beginPath();
  ctx.roundRect(
    x + INSET,
    FORMULA_CARD_Y,
    PANEL_W - INSET * 2,
    FORMULA_CARD_HEIGHT,
    10
  );
  ctx.fill();
  text(ctx, '核心关系', x + INSET + 16, 506, p.muted, 13 * scale, 'left', 700);
  text(ctx, 'fᵧ = n · fₓ', x + INSET + 16, 540, p.ink, 18 * scale, 'left', 700);
  text(
    ctx,
    'X 轴展开时间，Y 轴输入信号',
    x + INSET + 16,
    576,
    p.green,
    12 * scale,
    'left'
  );
}

export function createOscilloscopeView(
  options: CreateOscilloscopeViewOptions = {}
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
  let snapshot: OscilloscopeState | null = null;
  function draw(state: OscilloscopeState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const scale = env.contentScale() * stage.responsiveScale;
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    text(
      ctx,
      '示波管原理与波形同步',
      FIELD_W / 2,
      34,
      p.ink,
      20 * scale,
      'center',
      700
    );
    drawTube(ctx, state, p, scale);
    drawScope(ctx, state, p, scale);
    drawWave(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }
  return {
    render(state: OscilloscopeState): void {
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
    }
  };
}
