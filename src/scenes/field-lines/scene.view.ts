import type { TeachingMode } from '../../platform/standards';
import { getTeachingStandards } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import type { FieldLinesSnapshot } from './scene.sim';
import { generateFieldLines } from './renderer/trace-field';
import { drawFieldLines } from './renderer/draw-field-lines';
import { drawCharges } from './renderer/draw-charges';
import { drawHeatmap } from './renderer/draw-heatmap';
import { drawEquipotentialLines } from './renderer/draw-equipotential';
import type { PixelCharge, VisualConfig, ThemeColors } from './renderer/types';

export type CreateFieldLinesViewOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
};

let _cachedScale = 1;

const VISUAL_CONFIG: Record<TeachingMode, VisualConfig> = {
  normal: {
    chargeRadius: 26,
    chargeFontPx: Math.round(
      getTeachingStandards('normal').rightStage.primaryFontPx * 1.08
    ),
    arrowStrokeWidth: getTeachingStandards('normal').rightStage.majorStrokePx,
    arrowSize: 20,
    maxArrowLength: 34,
    minArrowLength:
      getTeachingStandards('normal').rightStage.secondaryFontPx * 0.85
  },
  presentation: {
    chargeRadius: 40,
    chargeFontPx: Math.round(
      getTeachingStandards('presentation').rightStage.primaryFontPx * 1.08
    ),
    arrowStrokeWidth:
      getTeachingStandards('presentation').rightStage.majorStrokePx,
    arrowSize: 30,
    maxArrowLength: 58,
    minArrowLength:
      getTeachingStandards('presentation').rightStage.secondaryFontPx * 0.95
  }
};

const THEME_CONFIG: Record<TeachingTheme, ThemeColors> = {
  dark: {
    canvasBg: 'rgb(17, 24, 39)',
    arrowColor: 'rgba(96, 173, 255, 0.98)',
    positiveGlow: 'rgba(230, 81, 0, 0.4)',
    negativeGlow: 'rgba(0, 150, 136, 0.4)',
    equipotential: 'rgba(255, 255, 255, 0.12)'
  },
  light: {
    canvasBg: '#f9fafb',
    arrowColor: 'rgba(39, 112, 255, 0.95)',
    positiveGlow: 'rgba(230, 120, 40, 0.3)',
    negativeGlow: 'rgba(40, 160, 200, 0.3)',
    equipotential: 'rgba(0, 0, 0, 0.08)'
  }
};

export function createFieldLinesView(
  options: CreateFieldLinesViewOptions = {}
) {
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  let mode: TeachingMode = options.mode ?? 'normal';
  let theme: TeachingTheme = options.theme ?? 'dark';
  let snapshot: FieldLinesSnapshot | null = null;
  let cssWidth = 1280;
  let cssHeight = 720;

  function resizeCanvas(): void {
    if (!canvas) return;
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(200, Math.floor(rect.width || 1280));
    cssHeight = Math.max(150, Math.floor(rect.height || 720));
    _cachedScale = parseFloat(canvas.dataset.responsiveScale || '1');
  }

  function toPixelCharges(next: FieldLinesSnapshot): PixelCharge[] {
    const visuals = VISUAL_CONFIG[mode];
    const s = _cachedScale;
    return next.charges.map((charge) => ({
      x: charge.x * cssWidth,
      y: charge.y * cssHeight,
      q: charge.q,
      radius: visuals.chargeRadius * s
    }));
  }

  function draw(next: FieldLinesSnapshot): void {
    if (!ctx) return;

    const width = cssWidth;
    const height = cssHeight;
    const colors = THEME_CONFIG[theme];
    const charges = toPixelCharges(next);
    const density = Math.max(1, Math.min(100, Math.round(next.params.density)));
    const s = _cachedScale;
    const isDark = theme === 'dark';

    // 1. 纯色背景
    ctx.fillStyle = colors.canvasBg;
    ctx.fillRect(0, 0, width, height);

    // 2. 电场强度热力图（半透明背景层）
    drawHeatmap(ctx, charges, width, height, s, isDark);

    // 3. 等势线
    drawEquipotentialLines(ctx, charges, width, height, s, isDark);

    // 4. 生成并绘制连续电场线
    const adjustedDensity = s < 0.5 ? Math.max(1, Math.round(density * 0.6)) : density;
    const paths = generateFieldLines(charges, adjustedDensity, { width, height });
    drawFieldLines(ctx, paths, s, isDark);

    // 5. 立体电荷球
    const visuals = VISUAL_CONFIG[mode];
    drawCharges(ctx, charges, visuals.chargeFontPx, s);
  }

  return {
    render(next: FieldLinesSnapshot): void {
      snapshot = next;
      draw(next);
    },
    resize(): void {
      resizeCanvas();
      if (snapshot) draw(snapshot);
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
