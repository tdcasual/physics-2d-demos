import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  chargedParticleConstants,
  type ChargedParticleState
} from './scene.sim';

export type CreateChargedParticleViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  panelInset: INSET,
  centerX: CENTER_X,
  centerY: CENTER_Y,
  fieldLeft: FIELD_LEFT,
  fieldRight: FIELD_RIGHT,
  fieldTop: FIELD_TOP,
  fieldBottom: FIELD_BOTTOM,
  particleRadius: PARTICLE_R,
  gridStep: GRID_STEP,
  formulaCardY: FORMULA_Y,
  formulaCardHeight: FORMULA_H,
  panelRuleY: PANEL_RULE_Y,
  footerRuleY: FOOTER_RULE_Y
} = chargedParticleConstants;

type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  grid: string;
  orbit: string;
  particle: string;
  particleEdge: string;
  velocity: string;
  force: string;
  accent: string;
  border: string;
  chip: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#ffffff',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#8995a4',
    grid: '#eef1f4',
    orbit: '#c7cfd8',
    particle: '#ef5961',
    particleEdge: '#ffffff',
    velocity: '#1ca390',
    force: '#ffae1a',
    accent: '#43c3e7',
    border: '#d4dce5',
    chip: '#f2f5f8'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    grid: '#223044',
    orbit: '#64748b',
    particle: '#ff6971',
    particleEdge: '#172235',
    velocity: '#55dfc8',
    force: '#ffc34d',
    accent: '#62d9f0',
    border: '#3d4d63',
    chip: '#253246'
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
  radius = 12
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function')
    ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  angle: number,
  color: string,
  width: number
): void {
  const x2 = x + Math.cos(angle) * length;
  const y2 = y + Math.sin(angle) * length;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const head = 10;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - Math.cos(angle - 0.45) * head,
    y2 - Math.sin(angle - 0.45) * head
  );
  ctx.lineTo(
    x2 - Math.cos(angle + 0.45) * head,
    y2 - Math.sin(angle + 0.45) * head
  );
  ctx.closePath();
  ctx.fill();
}

function drawField(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, FIELD_W, BASE_H);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = FIELD_LEFT; x <= FIELD_RIGHT; x += GRID_STEP) {
    for (let y = FIELD_TOP; y <= FIELD_BOTTOM; y += GRID_STEP) {
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 7);
      ctx.lineTo(x + 7, y + 7);
      ctx.moveTo(x + 7, y - 7);
      ctx.lineTo(x - 7, y + 7);
      ctx.stroke();
    }
  }
}

function drawVectors(
  ctx: CanvasRenderingContext2D,
  state: ChargedParticleState,
  p: Palette
): void {
  const { position } = state;
  if (state.params.showVelocity) {
    arrow(ctx, position.x, position.y, 76, state.velocityAngle, p.velocity, 4);
    text(
      ctx,
      'v',
      position.x + Math.cos(state.velocityAngle) * 91,
      position.y + Math.sin(state.velocityAngle) * 91,
      p.velocity,
      18,
      'center',
      700
    );
  }
  if (state.params.showForce) {
    arrow(ctx, position.x, position.y, 58, state.forceAngle, p.force, 4);
    text(
      ctx,
      'F',
      position.x + Math.cos(state.forceAngle) * 72,
      position.y + Math.sin(state.forceAngle) * 72,
      p.force,
      17,
      'center',
      700
    );
  }
}

function drawOrbit(
  ctx: CanvasRenderingContext2D,
  state: ChargedParticleState,
  p: Palette
): void {
  ctx.strokeStyle = p.orbit;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, state.radiusPx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(CENTER_X, CENTER_Y);
  ctx.lineTo(state.position.x, state.position.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, 5, 0, Math.PI * 2);
  ctx.fillStyle = p.ink;
  ctx.fill();
  text(ctx, 'O', CENTER_X + 16, CENTER_Y - 16, p.ink, 18, 'left', 700);
  text(
    ctx,
    'R',
    (CENTER_X + state.position.x) / 2 + 12,
    (CENTER_Y + state.position.y) / 2 - 8,
    p.muted,
    14,
    'left',
    700
  );
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  state: ChargedParticleState,
  p: Palette
): void {
  ctx.beginPath();
  ctx.arc(state.position.x, state.position.y, PARTICLE_R, 0, Math.PI * 2);
  ctx.fillStyle = p.particle;
  ctx.fill();
  ctx.strokeStyle = p.particleEdge;
  ctx.lineWidth = 3;
  ctx.stroke();
  text(
    ctx,
    state.params.charge > 0 ? '+' : '−',
    state.position.x,
    state.position.y + 1,
    '#ffffff',
    20,
    'center',
    700
  );
  drawVectors(ctx, state, p);
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  state: ChargedParticleState,
  p: Palette
): void {
  rounded(ctx, 26, 32, 226, 116, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, '左手定则', 44, 58, p.ink, 18, 'left', 700);
  text(ctx, '伸开左手，磁感线穿过手心', 44, 86, p.muted, 13, 'left', 500);
  text(ctx, '四指指向正电荷运动方向', 44, 106, p.muted, 13, 'left', 500);
  text(ctx, '大拇指为洛伦兹力方向', 44, 126, p.muted, 13, 'left', 500);
  rounded(ctx, 700, 32, 110, 38, 19);
  ctx.fillStyle = p.chip;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(ctx, '经典模型', 755, 51, p.muted, 14, 'center', 700);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: ChargedParticleState,
  p: Palette,
  scale: number
): void {
  const x = FIELD_W + INSET;
  ctx.fillStyle = p.panel;
  ctx.fillRect(FIELD_W, 0, BASE_W - FIELD_W, BASE_H);
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, PANEL_RULE_Y);
  ctx.lineTo(BASE_W - INSET, PANEL_RULE_Y);
  ctx.stroke();
  const rows = [
    ['粒子质量 m', `${state.params.mass.toFixed(0)}`],
    [
      '电荷量 q',
      `${state.params.charge > 0 ? '+' : '−'}${Math.abs(state.params.charge).toFixed(1)}`
    ],
    ['入射速度 v', `${state.params.velocity.toFixed(0)}`],
    ['磁感应强度 B', `${state.params.magneticField.toFixed(1)}`]
  ];
  rows.forEach(([label, value], index) => {
    const y = 110 + index * 56;
    text(
      ctx,
      label,
      x,
      y,
      index === 2 ? p.accent : p.ink,
      16 * scale,
      'left',
      700
    );
    rounded(ctx, BASE_W - 74, y - 18, 50, 36, 9);
    ctx.fillStyle = p.chip;
    ctx.fill();
    text(
      ctx,
      value,
      BASE_W - 49,
      y,
      index === 1 ? p.particle : p.ink,
      15 * scale,
      'center',
      700
    );
  });
  rounded(ctx, x, 334, 306, 76, 12);
  ctx.fillStyle = p.chip;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(ctx, '磁场方向', x + 16, 358, p.ink, 15 * scale, 'left', 700);
  text(
    ctx,
    state.params.fieldDirection === 'into' ? '垂直向里 (×)' : '垂直向外 (·)',
    x + 132,
    358,
    p.muted,
    15 * scale,
    'left',
    600
  );
  rounded(ctx, x, FORMULA_Y, 306, FORMULA_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '核心规律推导与运算',
    x + 16,
    FORMULA_Y + 28,
    p.muted,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    'R = mv / |q|B',
    x + 16,
    FORMULA_Y + 72,
    p.ink,
    20 * scale,
    'left',
    700
  );
  text(
    ctx,
    `= ${state.radius.toFixed(0)}`,
    BASE_W - 42,
    FORMULA_Y + 72,
    p.ink,
    18 * scale,
    'right',
    700
  );
  text(
    ctx,
    'T = 2πm / |q|B',
    x + 16,
    FORMULA_Y + 118,
    p.ink,
    20 * scale,
    'left',
    700
  );
  text(
    ctx,
    `= ${(state.period / Math.PI).toFixed(1)}π`,
    BASE_W - 42,
    FORMULA_Y + 118,
    p.ink,
    18 * scale,
    'right',
    700
  );
  text(
    ctx,
    '周期与速度 v 无关',
    x + 16,
    FORMULA_Y + 158,
    p.accent,
    13 * scale,
    'left',
    700
  );
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(x, FOOTER_RULE_Y);
  ctx.lineTo(BASE_W - INSET, FOOTER_RULE_Y);
  ctx.stroke();
  text(ctx, state.status, x, 704, p.accent, 14 * scale, 'left', 700);
}

export function createChargedParticleView(
  options: CreateChargedParticleViewOptions = {}
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
  let snapshot: ChargedParticleState | null = null;
  function draw(state: ChargedParticleState): void {
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
    drawField(ctx, p);
    drawOrbit(ctx, state, p);
    drawParticle(ctx, state, p);
    drawLegend(ctx, state, p);
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }
  return {
    render(state: ChargedParticleState): void {
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
