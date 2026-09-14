import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { rutherfordConstants, type RutherfordState } from './scene.sim';

export type CreateRutherfordViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  panel: string;
  card: string;
  ink: string;
  muted: string;
  border: string;
  cyan: string;
  gold: string;
  red: string;
  orange: string;
  wire: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#07111e',
    panel: '#0d1828',
    card: '#142538',
    ink: '#edf8ff',
    muted: '#7f99ad',
    border: '#26435a',
    cyan: '#45dcff',
    gold: '#ffd35a',
    red: '#ff4963',
    orange: '#ff9b48',
    wire: '#8da9bb'
  },
  dark: {
    bg: '#040b15',
    panel: '#0a1321',
    card: '#101f32',
    ink: '#f1f8ff',
    muted: '#7692a8',
    border: '#203b54',
    cyan: '#3ed9ff',
    gold: '#ffd34e',
    red: '#ff405b',
    orange: '#ff9945',
    wire: '#8ca8ba'
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

function card(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  p: Palette,
  fill = p.card,
  stroke = p.border
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 12);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  const width = rutherfordConstants.fieldWidth * scale;
  const height = rutherfordConstants.baseHeight * scale;
  const gradient = ctx.createRadialGradient(
    390 * scale,
    365 * scale,
    30 * scale,
    390 * scale,
    365 * scale,
    580 * scale
  );
  gradient.addColorStop(0, '#152c43');
  gradient.addColorStop(0.45, p.bg);
  gradient.addColorStop(1, '#02060d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = `${p.border}66`;
  ctx.lineWidth = scale;
  ctx.setLineDash([4 * scale, 18 * scale]);
  for (let x = 20; x < rutherfordConstants.fieldWidth; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x * scale, 0);
    ctx.lineTo(x * scale, height);
    ctx.stroke();
  }
  for (let y = 40; y < rutherfordConstants.baseHeight; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y * scale);
    ctx.lineTo(width, y * scale);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawRings(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  const x = rutherfordConstants.nucleusX * scale;
  const y = rutherfordConstants.nucleusY * scale;
  [168, 270].forEach((radius, index) => {
    ctx.strokeStyle = index === 0 ? `${p.cyan}55` : `${p.cyan}2d`;
    ctx.lineWidth = 1.5 * scale;
    ctx.setLineDash([8 * scale, 12 * scale]);
    ctx.beginPath();
    ctx.arc(x, y, radius * scale, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.setLineDash([5 * scale, 14 * scale]);
  ctx.strokeStyle = `${p.border}88`;
  ctx.beginPath();
  ctx.moveTo(x, 22 * scale);
  ctx.lineTo(x, (rutherfordConstants.baseHeight - 22) * scale);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawSource(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  const x = rutherfordConstants.sourceX * scale;
  const y = rutherfordConstants.nucleusY * scale;
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(x - 30 * scale, y - 32 * scale);
  ctx.lineTo(x - 30 * scale, y + 32 * scale);
  ctx.quadraticCurveTo(x - 8 * scale, y + 20 * scale, x - 8 * scale, y);
  ctx.quadraticCurveTo(
    x - 8 * scale,
    y - 20 * scale,
    x - 30 * scale,
    y - 32 * scale
  );
  ctx.stroke();
  ctx.fillStyle = p.gold;
  ctx.shadowColor = p.gold;
  ctx.shadowBlur = 16 * scale;
  ctx.beginPath();
  ctx.arc(x - 18 * scale, y, 6 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `${p.gold}88`;
  ctx.lineWidth = 1.5 * scale;
  for (let index = -2; index <= 2; index += 1) {
    ctx.beginPath();
    ctx.moveTo(x - 8 * scale, y + index * 14 * scale);
    ctx.lineTo(x + 24 * scale, y + index * 32 * scale);
    ctx.stroke();
  }
  text(
    ctx,
    '放射源 (P₀)',
    x + 8 * scale,
    y - 58 * scale,
    p.muted,
    13 * scale,
    'center',
    600
  );
  text(
    ctx,
    '准直缝',
    x + 72 * scale,
    y - 84 * scale,
    p.muted,
    13 * scale,
    'center',
    600
  );
  ctx.fillStyle = p.wire;
  ctx.fillRect(x + 48 * scale, y - 94 * scale, 12 * scale, 44 * scale);
  ctx.fillRect(x + 48 * scale, y + 50 * scale, 12 * scale, 44 * scale);
}

function drawNucleus(
  ctx: CanvasRenderingContext2D,
  state: RutherfordState,
  p: Palette,
  scale: number
): void {
  const x = state.nucleus.x * scale;
  const y = state.nucleus.y * scale;
  if (state.model === 0) {
    const cloud = ctx.createRadialGradient(x, y, 8 * scale, x, y, 102 * scale);
    cloud.addColorStop(0, `${p.red}dd`);
    cloud.addColorStop(0.4, `${p.red}66`);
    cloud.addColorStop(1, `${p.red}00`);
    ctx.fillStyle = cloud;
    ctx.beginPath();
    ctx.arc(x, y, 102 * scale, 0, Math.PI * 2);
    ctx.fill();
    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * Math.PI * 2;
      const radius = (28 + (index % 4) * 14) * scale;
      ctx.fillStyle = index % 3 === 0 ? p.cyan : `${p.red}bb`;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        4 * scale,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    text(
      ctx,
      '枣糕模型：弥散正电',
      x,
      y + 130 * scale,
      p.red,
      15 * scale,
      'center',
      700
    );
    return;
  }
  const glow = ctx.createRadialGradient(x, y, 2 * scale, x, y, 66 * scale);
  glow.addColorStop(0, '#fff8bf');
  glow.addColorStop(0.18, `${p.gold}ee`);
  glow.addColorStop(0.5, `${p.red}88`);
  glow.addColorStop(1, `${p.red}00`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 66 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = p.gold;
  ctx.shadowBlur = 22 * scale;
  ctx.fillStyle = '#fff7c6';
  ctx.beginPath();
  ctx.arc(x, y, 8 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  text(
    ctx,
    '极小致密核（+Ze）',
    x,
    y + 78 * scale,
    p.gold,
    15 * scale,
    'center',
    700
  );
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  state: RutherfordState,
  p: Palette,
  scale: number
): void {
  state.particles.forEach((particle) => {
    if (particle.path.length > 1) {
      for (let index = 1; index < particle.path.length; index += 1) {
        const previous = particle.path[index - 1];
        const point = particle.path[index];
        const alpha = 0.08 + (index / particle.path.length) * 0.7;
        ctx.strokeStyle = particle.deflection === 0 ? p.gold : p.orange;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = (index > particle.path.length - 4 ? 2.4 : 1.3) * scale;
        ctx.beginPath();
        ctx.moveTo(previous.x * scale, previous.y * scale);
        ctx.lineTo(point.x * scale, point.y * scale);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.shadowColor = p.ink;
    ctx.shadowBlur = 8 * scale;
    ctx.fillStyle = p.ink;
    ctx.beginPath();
    ctx.arc(
      particle.x * scale,
      particle.y * scale,
      3.2 * scale,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  scale: number
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5 * scale;
  ctx.beginPath();
  ctx.moveTo(x * scale, y * scale);
  ctx.lineTo((x + dx) * scale, (y + dy) * scale);
  ctx.stroke();
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo((x + dx) * scale, (y + dy) * scale);
  ctx.lineTo(
    (x + dx - 10 * Math.cos(angle - 0.5)) * scale,
    (y + dy - 10 * Math.sin(angle - 0.5)) * scale
  );
  ctx.lineTo(
    (x + dx - 10 * Math.cos(angle + 0.5)) * scale,
    (y + dy - 10 * Math.sin(angle + 0.5)) * scale
  );
  ctx.closePath();
  ctx.fill();
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: RutherfordState,
  p: Palette,
  scale: number
): void {
  const x = rutherfordConstants.panelX * scale;
  const width = rutherfordConstants.panelWidth * scale;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, 0, width, rutherfordConstants.baseHeight * scale);
  text(
    ctx,
    '卢瑟福 α 粒子散射',
    x + 18 * scale,
    36 * scale,
    p.ink,
    22 * scale,
    'left',
    700
  );
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(x + 18 * scale, 67 * scale);
  ctx.lineTo(x + width - 18 * scale, 67 * scale);
  ctx.stroke();
  const stats: Array<[string, string, string]> = [
    ['放射源状态', state.beamStatus, p.cyan],
    ['入射粒子总数 (N)', `${state.totalCount}`, p.red],
    ['大角偏转 (θ > 90°)', `${state.largeAngle}`, p.gold],
    ['直接反弹 (θ ≈ 180°)', `${state.backscatter}`, p.red]
  ];
  stats.forEach(([label, value, color], index) => {
    const y = 92 + index * 72;
    card(
      ctx,
      x + 18 * scale,
      y * scale,
      width - 36 * scale,
      56 * scale,
      p,
      `${p.card}ee`
    );
    text(
      ctx,
      label,
      x + 36 * scale,
      (y + 28) * scale,
      p.ink,
      14 * scale,
      'left',
      600
    );
    text(
      ctx,
      value,
      x + width - 36 * scale,
      (y + 28) * scale,
      color,
      16 * scale,
      'right',
      700
    );
  });
  const theoryY = 388;
  card(
    ctx,
    x + 18 * scale,
    theoryY * scale,
    width - 36 * scale,
    58 * scale,
    p,
    `${p.red}1c`,
    p.red
  );
  text(
    ctx,
    '当前所处理理论',
    x + 36 * scale,
    (theoryY + 20) * scale,
    p.ink,
    14 * scale,
    'left',
    600
  );
  text(
    ctx,
    state.model === 1 ? '核式结构' : '枣糕（弥散正电）',
    x + width - 36 * scale,
    (theoryY + 36) * scale,
    state.model === 1 ? p.gold : p.red,
    15 * scale,
    'right',
    700
  );
  card(
    ctx,
    x + 18 * scale,
    462 * scale,
    width - 36 * scale,
    118 * scale,
    p,
    `${p.red}14`
  );
  text(
    ctx,
    '【核物理定量科学事实】',
    x + 36 * scale,
    488 * scale,
    p.gold,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    'F = kQq / r²',
    x + 36 * scale,
    519 * scale,
    p.ink,
    14 * scale,
    'left',
    600
  );
  text(
    ctx,
    'a = F / m · v = v₀ + aΔt',
    x + 36 * scale,
    548 * scale,
    p.ink,
    14 * scale,
    'left',
    600
  );
  text(
    ctx,
    '金原子有效边界  R ≈ 10⁻¹⁰ m',
    x + 36 * scale,
    568 * scale,
    p.muted,
    11 * scale,
    'left',
    500
  );
  text(
    ctx,
    '矢量受力动态渲染 (F)',
    x + 18 * scale,
    618 * scale,
    p.muted,
    14 * scale,
    'left',
    600
  );
  const toggleX = x + width - 42 * scale;
  ctx.fillStyle = state.showForces ? p.red : p.border;
  ctx.beginPath();
  ctx.roundRect(
    toggleX - 26 * scale,
    606 * scale,
    52 * scale,
    24 * scale,
    12 * scale
  );
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(
    (toggleX + (state.showForces ? 12 : -12)) * scale,
    618 * scale,
    9 * scale,
    0,
    Math.PI * 2
  );
  ctx.fill();
  card(
    ctx,
    x + 18 * scale,
    654 * scale,
    width - 36 * scale,
    48 * scale,
    p,
    `${p.cyan}16`,
    p.cyan
  );
  text(
    ctx,
    '发射特定瞄准距离粒子束',
    x + width / 2,
    678 * scale,
    p.cyan,
    15 * scale,
    'center',
    700
  );
  text(
    ctx,
    '空格键：暂停 / 恢复微观推演',
    x + width / 2,
    730 * scale,
    p.muted,
    12 * scale,
    'center',
    500
  );
}

export function createRutherfordView(
  options: CreateRutherfordViewOptions = {}
) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'dark',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: rutherfordConstants.baseWidth,
      fallbackHeight: rutherfordConstants.baseHeight
    },
    initialWidth: rutherfordConstants.baseWidth,
    initialHeight: rutherfordConstants.baseHeight,
    eagerContext: true
  });
  let snapshot: RutherfordState | null = null;
  function draw(state: RutherfordState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const scale = env.contentScale() * stage.responsiveScale;
    const fit = Math.min(
      width / (rutherfordConstants.baseWidth * scale),
      height / (rutherfordConstants.baseHeight * scale)
    );
    const offsetX = Math.max(
      0,
      (width - rutherfordConstants.baseWidth * scale * fit) / 2
    );
    const offsetY = Math.max(
      0,
      (height - rutherfordConstants.baseHeight * scale * fit) / 2
    );
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawBackground(ctx, p, scale);
    drawRings(ctx, p, scale);
    drawSource(ctx, p, scale);
    drawParticles(ctx, state, p, scale);
    drawNucleus(ctx, state, p, scale);
    if (state.showForces && state.focused) {
      const dx = state.nucleus.x - state.focused.x;
      const dy = state.nucleus.y - state.focused.y;
      const magnitude = Math.max(1, Math.hypot(dx, dy));
      arrow(
        ctx,
        state.focused.x,
        state.focused.y,
        (dx / magnitude) * 58,
        (dy / magnitude) * 58,
        p.red,
        scale
      );
      text(
        ctx,
        'F',
        (state.focused.x + (dx / magnitude) * 68) * scale,
        (state.focused.y + (dy / magnitude) * 68) * scale,
        p.red,
        16 * scale,
        'center',
        700
      );
    }
    text(
      ctx,
      '金原子有效边界（R ≈ 10⁻¹⁰ m）',
      390 * scale,
      712 * scale,
      p.muted,
      13 * scale,
      'center',
      600
    );
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }
  return {
    render(state: RutherfordState) {
      snapshot = state;
      stage.ensureSized();
      draw(state);
    },
    resize() {
      stage.resize();
      if (snapshot) draw(snapshot);
    },
    setTheme(theme: TeachingTheme) {
      env.setTheme(theme);
      if (snapshot) draw(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      env.setMode(mode, hints);
      if (snapshot) draw(snapshot);
    },
    dispose() {
      snapshot = null;
      stage.release();
    }
  };
}
