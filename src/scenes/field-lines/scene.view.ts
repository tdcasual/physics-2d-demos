import type { TeachingMode } from '../../app/teaching-standards';
import { getTeachingStandards } from '../../app/teaching-standards';
import type { TeachingTheme } from '../../app/teaching-demo-shell';
import { applyHiDpiCanvasMetrics, computeHiDpiCanvasMetrics } from '../../core/high-dpi-canvas';
import type { FieldLinesSnapshot } from './scene.sim';

type PixelCharge = {
  x: number;
  y: number;
  q: number;
  radius: number;
};

type VisualConfig = {
  chargeRadius: number;
  chargeFontPx: number;
  arrowStrokeWidth: number;
  arrowSize: number;
  maxArrowLength: number;
  minArrowLength: number;
};

export type CreateFieldLinesViewOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
};

const VISUAL_CONFIG: Record<TeachingMode, VisualConfig> = {
  normal: {
    chargeRadius: 26,
    chargeFontPx: Math.round(getTeachingStandards('normal').rightStage.primaryFontPx * 1.08),
    arrowStrokeWidth: getTeachingStandards('normal').rightStage.majorStrokePx,
    arrowSize: 20,
    maxArrowLength: 34,
    minArrowLength: getTeachingStandards('normal').rightStage.secondaryFontPx * 0.85
  },
  presentation: {
    chargeRadius: 40,
    chargeFontPx: Math.round(getTeachingStandards('presentation').rightStage.primaryFontPx * 1.08),
    arrowStrokeWidth: getTeachingStandards('presentation').rightStage.majorStrokePx,
    arrowSize: 30,
    maxArrowLength: 58,
    minArrowLength: getTeachingStandards('presentation').rightStage.secondaryFontPx * 0.95
  }
};

const THEME_CONFIG = {
  dark: {
    canvasBg: 'rgb(17, 24, 39)',
    arrowColor: 'rgba(96, 173, 255, 0.98)'
  },
  light: {
    canvasBg: '#f9fafb',
    arrowColor: 'rgba(39, 112, 255, 0.95)'
  }
} as const;

function getLineCountForCharge(q: number): number {
  const baseLines = 12;
  const absq = Math.abs(q);
  const minLines = 8;
  const maxLines = 40;
  const lines = Math.round(baseLines * absq);
  return Math.min(maxLines, Math.max(minLines, lines));
}

export function createFieldLinesView(options: CreateFieldLinesViewOptions = {}) {
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  let mode: TeachingMode = options.mode ?? 'normal';
  let theme: TeachingTheme = options.theme ?? 'dark';
  let snapshot: FieldLinesSnapshot | null = null;
  let surface = computeHiDpiCanvasMetrics({
    cssWidth: 1280,
    cssHeight: 720,
    devicePixelRatio: 1
  });

  function resizeCanvas(): void {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(480, Math.floor(rect.width || 1280));
    const cssHeight = Math.max(300, Math.floor(rect.height || 720));
    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    surface = computeHiDpiCanvasMetrics({
      cssWidth,
      cssHeight,
      devicePixelRatio: dpr
    });
    applyHiDpiCanvasMetrics(canvas, ctx, surface);
  }

  function toPixelCharges(next: FieldLinesSnapshot): PixelCharge[] {
    const visuals = VISUAL_CONFIG[mode];
    return next.charges.map((charge) => ({
      x: charge.x * surface.cssWidth,
      y: charge.y * surface.cssHeight,
      q: charge.q,
      radius: visuals.chargeRadius
    }));
  }

  function getElectricFieldAt(px: number, py: number, charges: PixelCharge[]): { Ex: number; Ey: number } {
    let Ex = 0;
    let Ey = 0;
    for (const charge of charges) {
      const dx = px - charge.x;
      const dy = py - charge.y;
      const rSquared = Math.max(charge.radius * charge.radius, dx * dx + dy * dy);
      const r = Math.sqrt(rSquared);
      const magnitude = charge.q / rSquared;
      Ex += magnitude * (dx / r);
      Ey += magnitude * (dy / r);
    }
    return { Ex, Ey };
  }

  function drawArrow(x: number, y: number, angle: number, length: number): void {
    if (!ctx) return;
    const visuals = VISUAL_CONFIG[mode];
    const colors = THEME_CONFIG[theme];

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(length, 0);
    ctx.strokeStyle = colors.arrowColor;
    ctx.lineWidth = visuals.arrowStrokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(length, 0);
    ctx.lineTo(length - visuals.arrowSize, -visuals.arrowSize / 2);
    ctx.lineTo(length - visuals.arrowSize, visuals.arrowSize / 2);
    ctx.closePath();
    ctx.fillStyle = colors.arrowColor;
    ctx.fill();

    ctx.restore();
  }

  function traceLine(
    startX: number,
    startY: number,
    maxSegments: number,
    visualStepSize: number,
    direction: 1 | -1,
    charges: PixelCharge[]
  ): void {
    const CALCULATION_STEP = 4;
    let px = startX;
    let py = startY;
    let distanceSinceLastArrow = 0;

    for (let i = 0; i < maxSegments; i += 1) {
      const field = getElectricFieldAt(px, py, charges);
      const magnitude = Math.hypot(field.Ex, field.Ey);
      if (magnitude < 0.00001) break;

      const dirX = direction * (field.Ex / magnitude);
      const dirY = direction * (field.Ey / magnitude);

      px += dirX * CALCULATION_STEP;
      py += dirY * CALCULATION_STEP;
      distanceSinceLastArrow += CALCULATION_STEP;

      if (distanceSinceLastArrow >= visualStepSize) {
        const visuals = VISUAL_CONFIG[mode];
        const fieldAngle = Math.atan2(dirY, dirX);
        const vectorLength = Math.max(
          visuals.minArrowLength,
          Math.min(visualStepSize * 0.35, visuals.maxArrowLength)
        );
        drawArrow(px, py, fieldAngle, vectorLength);
        distanceSinceLastArrow = 0;
      }

      if (px < -10 || px > surface.cssWidth + 10 || py < -10 || py > surface.cssHeight + 10) {
        break;
      }

      let nearCharge = false;
      for (const charge of charges) {
        if (Math.hypot(px - charge.x, py - charge.y) < charge.radius + 5) {
          nearCharge = true;
          break;
        }
      }
      if (nearCharge) break;
    }
  }

  function drawField(charges: PixelCharge[], density: number): void {
    const visualStepSize = 120 - (density - 1) * (115 / 99);
    const maxSegments = 900;

    for (const charge of charges) {
      if (charge.q <= 0) continue;
      const numLines = getLineCountForCharge(charge.q);
      for (let i = 0; i < numLines; i += 1) {
        const angle = (i / numLines) * Math.PI * 2;
        const startX = charge.x + charge.radius * 1.5 * Math.cos(angle);
        const startY = charge.y + charge.radius * 1.5 * Math.sin(angle);
        traceLine(startX, startY, maxSegments, visualStepSize, 1, charges);
      }
    }

    for (const charge of charges) {
      if (charge.q >= 0) continue;
      const numLines = getLineCountForCharge(charge.q);
      for (let i = 0; i < numLines; i += 1) {
        const angle = (i / numLines) * Math.PI * 2;
        const startX = charge.x + charge.radius * 1.5 * Math.cos(angle);
        const startY = charge.y + charge.radius * 1.5 * Math.sin(angle);
        traceLine(startX, startY, maxSegments, visualStepSize, -1, charges);
      }
    }
  }

  function drawCharges(charges: PixelCharge[]): void {
    if (!ctx) return;
    const visuals = VISUAL_CONFIG[mode];

    for (const charge of charges) {
      ctx.beginPath();
      ctx.arc(charge.x, charge.y, charge.radius, 0, Math.PI * 2);
      ctx.fillStyle = charge.q > 0 ? '#F5A623' : '#7ED321';
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.font = `bold ${visuals.chargeFontPx}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(charge.q > 0 ? '+' : '−', charge.x, charge.y + 1);
    }
  }

  function draw(next: FieldLinesSnapshot): void {
    if (!ctx) return;

    const width = surface.cssWidth;
    const height = surface.cssHeight;
    const colors = THEME_CONFIG[theme];
    const charges = toPixelCharges(next);
    const density = Math.max(1, Math.min(100, Math.round(next.params.density)));

    ctx.fillStyle = colors.canvasBg;
    ctx.fillRect(0, 0, width, height);

    drawField(charges, density);
    drawCharges(charges);
  }

  return {
    render(next: FieldLinesSnapshot): void {
      snapshot = next;
      draw(next);
    },
    resize(): void {
      resizeCanvas();
      if (snapshot) {
        draw(snapshot);
      }
    },
    setMode(nextMode: TeachingMode): void {
      mode = nextMode;
      if (snapshot) {
        draw(snapshot);
      }
    },
    setTheme(nextTheme: TeachingTheme): void {
      theme = nextTheme;
      if (snapshot) {
        draw(snapshot);
      }
    },
    dispose(): void {
      snapshot = null;
      canvas = null;
      ctx = null;
    }
  };
}
