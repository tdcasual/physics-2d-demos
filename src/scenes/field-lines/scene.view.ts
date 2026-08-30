import type { TeachingMode } from '../../platform/standards';
import { getRenderTokens } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport } from '../view-base';
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
  demoHints?: DemoRenderHints;
  theme?: TeachingTheme;
};

function getVisuals(scale: number = 1.0): VisualConfig {
  const tokens = getRenderTokens(scale).rightStage;
  return {
    chargeRadius: Math.round(26 * scale),
    chargeFontPx: Math.round(tokens.primaryFontPx * 1.08),
    arrowStrokeWidth: tokens.majorStrokePx,
    arrowSize: Math.round(20 * scale),
    maxArrowLength: Math.round(34 * scale),
    minArrowLength: Math.round(tokens.secondaryFontPx * 0.85)
  };
}

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
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'clamped', fallbackWidth: 1280, fallbackHeight: 720 },
    initialWidth: 1280,
    initialHeight: 720,
    eagerContext: true
  });
  let mode: TeachingMode = options.mode ?? 'normal';
  let demoHints: DemoRenderHints | null = options.demoHints ?? null;
  let theme: TeachingTheme = options.theme ?? 'dark';
  let snapshot: FieldLinesSnapshot | null = null;
  // 渲染签名：全部画面输入（快照引用 + 尺寸 + scale + contentScale + theme + mode）
  // 未变时跳过静态画面的昂贵重绘（热力图 / 等势线 / 电场线追踪）
  let lastRenderKey: {
    snapshot: FieldLinesSnapshot;
    cssWidth: number;
    cssHeight: number;
    scale: number;
    contentScale: number;
    theme: TeachingTheme;
    mode: TeachingMode;
  } | null = null;

  function getScale(): number {
    return demoHints?.contentScale ?? (mode === 'presentation' ? 1.5 : 1.0);
  }

  function toPixelCharges(next: FieldLinesSnapshot): PixelCharge[] {
    const visuals = getVisuals(getScale());
    const s = stage.responsiveScale;
    return next.charges.map((charge) => ({
      x: charge.x * stage.cssWidth,
      y: charge.y * stage.cssHeight,
      q: charge.q,
      radius: visuals.chargeRadius * s
    }));
  }

  function draw(next: FieldLinesSnapshot): void {
    const ctx = stage.ctx;
    if (!ctx) return;

    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const colors = THEME_CONFIG[theme];
    const charges = toPixelCharges(next);
    const density = Math.max(1, Math.min(100, Math.round(next.params.density)));
    const s = stage.responsiveScale;
    const isDark = theme === 'dark';

    // 1. 纯色背景
    ctx.fillStyle = colors.canvasBg;
    ctx.fillRect(0, 0, width, height);

    // 2. 电场强度热力图（半透明背景层）
    drawHeatmap(ctx, charges, width, height, s, isDark);

    // 3. 等势线
    drawEquipotentialLines(ctx, charges, width, height, s, isDark);

    // 4. 生成并绘制连续电场线
    const adjustedDensity =
      s < 0.5 ? Math.max(1, Math.round(density * 0.6)) : density;
    const paths = generateFieldLines(charges, adjustedDensity, {
      width,
      height
    });
    drawFieldLines(ctx, paths, s, isDark);

    // 5. 立体电荷球
    const visuals = getVisuals(getScale());
    drawCharges(ctx, charges, visuals.chargeFontPx, s, isDark);

    lastRenderKey = {
      snapshot: next,
      cssWidth: width,
      cssHeight: height,
      scale: s,
      contentScale: getScale(),
      theme,
      mode
    };
  }

  return {
    render(next: FieldLinesSnapshot): void {
      snapshot = next;
      const key = lastRenderKey;
      if (
        key &&
        key.snapshot === next &&
        key.cssWidth === stage.cssWidth &&
        key.cssHeight === stage.cssHeight &&
        key.scale === stage.responsiveScale &&
        key.contentScale === getScale() &&
        key.theme === theme &&
        key.mode === mode
      ) {
        return; // 签名未变：静态画面跳过重绘
      }
      draw(next);
    },
    resize(): void {
      stage.resize();
      if (snapshot) draw(snapshot);
    },
    setMode(nextMode: TeachingMode, hints?: DemoRenderHints): void {
      mode = nextMode;
      if (hints) {
        demoHints = hints;
      }
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
      stage.release();
    }
  };
}
