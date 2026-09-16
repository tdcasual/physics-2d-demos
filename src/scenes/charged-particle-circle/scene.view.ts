import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  chargedParticleConstants as C,
  type ChargedParticleState
} from './scene.sim';

export type CreateChargedParticleViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  ink: string;
  muted: string;
  grid: string;
  orbit: string;
  particle: string;
  particleEdge: string;
  velocity: string;
  force: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#f7fafc',
    ink: '#303744',
    muted: '#7b8796',
    grid: '#c5d0dc',
    orbit: '#b4bec9',
    particle: '#e44b56',
    particleEdge: '#ffffff',
    velocity: '#128f7c',
    force: '#e39a12'
  },
  dark: {
    bg: '#0f1728',
    ink: '#eef2f7',
    muted: '#93a0b3',
    grid: '#3d4f66',
    orbit: '#64748b',
    particle: '#ff6971',
    particleEdge: '#172235',
    velocity: '#55dfc8',
    force: '#ffc34d'
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
  weight = 700
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  angle: number,
  color: string,
  width: number,
  scale: number
): void {
  const x2 = x + Math.cos(angle) * length;
  const y2 = y + Math.sin(angle) * length;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const head = 9 * scale;
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

function drawField(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  direction: ChargedParticleState['params']['fieldDirection'],
  scale: number
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
  const mark = C.fieldMark * scale;
  ctx.strokeStyle = p.grid;
  ctx.fillStyle = p.grid;
  ctx.lineWidth = 1.2 * scale;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.72;
  for (let x = C.fieldLeft; x <= C.fieldRight; x += C.gridStep) {
    for (let y = C.fieldTop; y <= C.fieldBottom; y += C.gridStep) {
      if (direction === 'into') {
        ctx.beginPath();
        ctx.moveTo(x - mark, y - mark);
        ctx.lineTo(x + mark, y + mark);
        ctx.moveTo(x + mark, y - mark);
        ctx.lineTo(x - mark, y + mark);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1.5 * scale, mark * 0.42), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawOrbit(
  ctx: CanvasRenderingContext2D,
  state: ChargedParticleState,
  p: Palette,
  scale: number
): void {
  ctx.strokeStyle = p.orbit;
  ctx.lineWidth = 2 * scale;
  ctx.setLineDash([7 * scale, 7 * scale]);
  ctx.beginPath();
  ctx.arc(C.centerX, C.centerY, state.radiusPx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const trail = 0.9;
  ctx.strokeStyle = p.particle;
  ctx.lineWidth = 3.5 * scale;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.32;
  ctx.beginPath();
  ctx.arc(
    C.centerX,
    C.centerY,
    state.radiusPx,
    state.angle - state.angularSign * trail,
    state.angle,
    state.angularSign < 0
  );
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 1.4 * scale;
  ctx.setLineDash([5 * scale, 5 * scale]);
  ctx.beginPath();
  ctx.moveTo(C.centerX, C.centerY);
  ctx.lineTo(state.position.x, state.position.y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(C.centerX, C.centerY, 4 * scale, 0, Math.PI * 2);
  ctx.fillStyle = p.ink;
  ctx.fill();
  text(
    ctx,
    'O',
    C.centerX + 14 * scale,
    C.centerY - 14 * scale,
    p.ink,
    16 * scale
  );
  text(
    ctx,
    'R',
    (C.centerX + state.position.x) / 2 + 10 * scale,
    (C.centerY + state.position.y) / 2 - 8 * scale,
    p.muted,
    13 * scale
  );
}

function drawVectors(
  ctx: CanvasRenderingContext2D,
  state: ChargedParticleState,
  p: Palette,
  scale: number
): void {
  const { position } = state;
  if (state.params.showVelocity) {
    const length = C.velocityArrowLength * scale;
    arrow(
      ctx,
      position.x,
      position.y,
      length,
      state.velocityAngle,
      p.velocity,
      3.2 * scale,
      scale
    );
    text(
      ctx,
      'v',
      position.x +
        Math.cos(state.velocityAngle) * (length + C.labelOffset * scale),
      position.y +
        Math.sin(state.velocityAngle) * (length + C.labelOffset * scale),
      p.velocity,
      16 * scale,
      'center'
    );
  }
  if (state.params.showForce) {
    const length = C.forceArrowLength * scale;
    arrow(
      ctx,
      position.x,
      position.y,
      length,
      state.forceAngle,
      p.force,
      3.2 * scale,
      scale
    );
    text(
      ctx,
      'F',
      position.x +
        Math.cos(state.forceAngle) * (length + C.labelOffset * scale),
      position.y +
        Math.sin(state.forceAngle) * (length + C.labelOffset * scale),
      p.force,
      16 * scale,
      'center'
    );
  }
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  state: ChargedParticleState,
  p: Palette,
  scale: number
): void {
  const radius = C.particleRadius * scale;
  ctx.beginPath();
  ctx.arc(state.position.x, state.position.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = p.particle;
  ctx.fill();
  ctx.strokeStyle = p.particleEdge;
  ctx.lineWidth = 2.4 * scale;
  ctx.stroke();
  text(
    ctx,
    state.params.charge > 0 ? '+' : '−',
    state.position.x,
    state.position.y + 1 * scale,
    '#ffffff',
    16 * scale,
    'center'
  );
  drawVectors(ctx, state, p, scale);
}

export function createChargedParticleView(
  options: CreateChargedParticleViewOptions = {}
) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: C.baseWidth,
      fallbackHeight: C.baseHeight
    },
    initialWidth: C.baseWidth,
    initialHeight: C.baseHeight,
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
    const fit = Math.min(width / C.baseWidth, height / C.baseHeight);
    const offsetX = (width - C.baseWidth * fit) / 2;
    const offsetY = (height - C.baseHeight * fit) / 2;
    const scale = env.contentScale() * stage.responsiveScale;
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawField(ctx, p, state.params.fieldDirection, scale);
    drawOrbit(ctx, state, p, scale);
    drawParticle(ctx, state, p, scale);
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
