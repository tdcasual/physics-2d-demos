import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  cyclotronConstants as C,
  stageLayoutFrom,
  stageTransform,
  type CyclotronOrbit,
  type CyclotronState
} from './scene.sim';

export type CreateCyclotronViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  ink: string;
  muted: string;
  red: string;
  redSoft: string;
  blue: string;
  bField: string;
  deeFill: string;
  deeStroke: string;
  paper: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#FAF7F2',
    ink: '#2B3035',
    muted: '#868E96',
    red: '#E63946',
    redSoft: 'rgba(230,57,70,0.05)',
    blue: '#4CC9F0',
    bField: '#ADB5BD',
    deeFill: 'rgba(233,236,239,0.6)',
    deeStroke: '#6C757D',
    paper: '#FFFFFF'
  },
  dark: {
    bg: '#0f172a',
    ink: '#e2e8f0',
    muted: '#94a3b8',
    red: '#fb7185',
    redSoft: 'rgba(251,113,133,0.12)',
    blue: '#67e8f9',
    bField: '#94a3b8',
    deeFill: 'rgba(71,85,105,0.42)',
    deeStroke: '#94a3b8',
    paper: '#111827'
  }
};

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size: number,
  align: CanvasTextAlign = 'center',
  weight = 600
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(8, Math.max(5, len * 0.35));
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - ux * head - uy * head * 0.45,
    y2 - uy * head + ux * head * 0.45
  );
  ctx.lineTo(
    x2 - ux * head + uy * head * 0.45,
    y2 - uy * head - ux * head * 0.45
  );
  ctx.closePath();
  ctx.fill();
}

function deePath(ctx: CanvasRenderingContext2D, top: boolean): void {
  const y = top ? -C.gapHalf : C.gapHalf;
  ctx.beginPath();
  ctx.moveTo(-C.deeRadius, y);
  ctx.lineTo(C.deeRadius, y);
  ctx.arc(0, y, C.deeRadius, 0, Math.PI, top);
  ctx.closePath();
}

function drawDees(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  state: CyclotronState
): void {
  const topHot = !state.extracted && state.fieldUp;
  const bottomHot = !state.extracted && !state.fieldUp;
  deePath(ctx, true);
  ctx.fillStyle = topHot ? p.redSoft : p.deeFill;
  ctx.fill();
  ctx.strokeStyle = p.deeStroke;
  ctx.lineWidth = C.deeStroke;
  ctx.stroke();
  deePath(ctx, false);
  ctx.fillStyle = bottomHot ? p.redSoft : p.deeFill;
  ctx.fill();
  ctx.stroke();
}

function drawMagneticXs(ctx: CanvasRenderingContext2D, p: Palette): void {
  const extent = C.deeRadius + C.gapHalf;
  ctx.save();
  ctx.strokeStyle = p.bField;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  for (const top of [true, false]) {
    ctx.save();
    deePath(ctx, top);
    ctx.clip();
    for (let x = -extent; x <= extent; x += C.bPattern) {
      for (let y = -extent; y <= extent; y += C.bPattern) {
        const px = x + C.bPattern / 2;
        const py = y + C.bPattern / 2;
        ctx.beginPath();
        ctx.moveTo(px - C.bMark, py - C.bMark);
        ctx.lineTo(px + C.bMark, py + C.bMark);
        ctx.moveTo(px + C.bMark, py - C.bMark);
        ctx.lineTo(px - C.bMark, py + C.bMark);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawSource(ctx: CanvasRenderingContext2D, p: Palette): void {
  const x = C.sourceOffsetX;
  ctx.save();
  ctx.translate(x, 0);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, C.sourceRadius, 0, Math.PI * 2);
  ctx.fillStyle = p.paper;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.quadraticCurveTo(-4, -6, 0, 0);
  ctx.quadraticCurveTo(4, 6, 8, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -C.sourceRadius);
  ctx.lineTo(0, -C.sourceWire);
  ctx.lineTo(C.sourceWireReach, -C.sourceWire);
  ctx.moveTo(0, C.sourceRadius);
  ctx.lineTo(0, C.sourceWire);
  ctx.lineTo(C.sourceWireReach, C.sourceWire);
  ctx.stroke();
  label(ctx, 'U~', 0, -24, p.blue, 14, 'center', 700);
  ctx.restore();
}

function drawField(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  up: boolean
): void {
  const from = up ? C.fieldArrowHalf : -C.fieldArrowHalf;
  const to = up ? -C.fieldArrowHalf : C.fieldArrowHalf;
  for (let x = C.fieldArrowMin; x <= C.fieldArrowMax; x += C.fieldArrowStep) {
    arrow(ctx, x, from, x, to, p.blue, 2);
  }
}

function drawOrbitArc(
  ctx: CanvasRenderingContext2D,
  orbit: CyclotronOrbit,
  fromAngle: number,
  toAngle: number,
  color: string,
  width: number
): void {
  if (Math.abs(toAngle - fromAngle) < 1e-4) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(orbit.centerX - C.centerX, 0, orbit.radius, fromAngle, toAngle, true);
  ctx.stroke();
}

function drawOrbits(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  state: CyclotronState
): void {
  const traveled = state.extracted ? state.nMax : state.orbitIndex;
  state.orbits.forEach((orbit) => {
    if (orbit.index > traveled) return;
    const complete = state.extracted || orbit.index < state.orbitIndex;
    if (complete) {
      const start = orbit.side === 'top' ? 0 : -Math.PI;
      const end = orbit.side === 'top' ? -Math.PI : -Math.PI * 2;
      drawOrbitArc(ctx, orbit, start, end, p.red, C.trailWidth);
      return;
    }
    const start = orbit.side === 'top' ? 0 : -Math.PI;
    drawOrbitArc(ctx, orbit, start, state.theta, p.red, C.trailWidth);
  });
}

function drawChannel(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  state: CyclotronState
): void {
  if (!state.extracted || !state.exitSide) return;
  const x = state.position.x - C.centerX;
  const up = state.exitSide === 'right';
  const y0 = up ? -C.gapHalf : C.gapHalf;
  const y1 = up ? -C.extractDistance : C.extractDistance;
  ctx.fillStyle = p.paper;
  ctx.fillRect(x - C.channelMask, up ? -40 : 0, C.channelMask * 2, 40);
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = p.red;
  ctx.beginPath();
  ctx.moveTo(x + (up ? C.channelHalf : -C.channelHalf), y0);
  ctx.lineTo(x + (up ? C.channelHalf : -C.channelHalf), y1);
  ctx.stroke();
  ctx.strokeStyle = p.deeStroke;
  ctx.beginPath();
  ctx.moveTo(x + (up ? -C.channelHalf : C.channelHalf), y0);
  ctx.lineTo(x + (up ? -C.channelHalf : C.channelHalf), y1);
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.roundRect(x - 16, y1 - 4, 32, 8, 2);
  ctx.fill();
  label(ctx, '靶', x, y1 + (up ? -16 : 16), p.red, 14, 'center', 700);
}

function drawPolarity(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  state: CyclotronState
): void {
  if (state.extracted) return;
  const topSign = state.fieldUp ? '−' : '+';
  const bottomSign = state.fieldUp ? '+' : '−';
  ctx.save();
  ctx.globalAlpha = state.fieldUp ? 0.4 : 0.1;
  label(
    ctx,
    topSign,
    0,
    C.polarityTopY,
    state.fieldUp ? p.red : p.ink,
    C.polaritySize,
    'center',
    700
  );
  ctx.globalAlpha = state.fieldUp ? 0.1 : 0.4;
  label(
    ctx,
    bottomSign,
    0,
    C.polarityBottomY,
    state.fieldUp ? p.ink : p.red,
    C.polaritySize,
    'center',
    700
  );
  ctx.restore();
}

export function createCyclotronView(options: CreateCyclotronViewOptions = {}) {
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
  let snapshot: CyclotronState | null = null;

  function draw(state: CyclotronState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const layout = stageLayoutFrom(stage.canvas);
    const { fit, offsetX, offsetY, boxW, boxH } = stageTransform(
      width,
      height,
      layout
    );
    const p = PALETTE[env.theme];
    const cs = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    ctx.fillStyle = p.paper;
    ctx.fillRect(0, 0, boxW, boxH);
    ctx.save();
    ctx.translate(C.centerX, C.centerY);
    drawMagneticXs(ctx, p);
    drawDees(ctx, p, state);
    drawSource(ctx, p);
    if (state.params.showField && !state.extracted) {
      drawField(ctx, p, state.fieldUp);
    }
    drawOrbits(ctx, p, state);
    drawChannel(ctx, p, state);
    drawPolarity(ctx, p, state);
    ctx.fillStyle = p.ink;
    ctx.beginPath();
    ctx.arc(state.startX - C.centerX, 0, C.sourceDotRadius, 0, Math.PI * 2);
    ctx.fill();
    const px = state.position.x - C.centerX;
    const py = state.position.y - C.centerY;
    ctx.save();
    ctx.shadowColor = p.red;
    ctx.shadowBlur = 12 * cs;
    ctx.fillStyle = p.red;
    ctx.strokeStyle = p.paper;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, C.particleRadius * cs, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    ctx.restore();
  }

  return {
    render(state: CyclotronState): void {
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
