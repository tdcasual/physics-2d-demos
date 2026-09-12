import type { TeachingMode } from '../../platform/standards';
import { getRenderTokens } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import type { FieldLinesSnapshot } from './scene.sim';
import {
  generateFieldLines,
  sampleProbesAlongPath
} from './renderer/trace-field';
import { drawFieldLines } from './renderer/draw-field-lines';
import { drawProbes } from './renderer/draw-probes';
import { drawCharges } from './renderer/draw-charges';
import type {
  PixelCharge,
  VisualConfig,
  ThemeColors,
  FieldLinePath,
  FieldProbe
} from './renderer/types';

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

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function captionForN(n: number): string {
  if (n <= 6) return '用试探电荷测出这些点的场强 E（箭头方向与相对大小）';
  if (n <= 16) return '试探点变密，箭头沿 E 的方向连起来，电场线开始显现';
  return '电场线形成：线上每一点的切线都沿着该点的 E';
}

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
  const env = createViewEnvironment({
    theme: options.theme,
    mode: options.mode,
    demoHints: options.demoHints ?? undefined
  });
  let snapshot: FieldLinesSnapshot | null = null;
  let lastRenderKey: {
    snapshot: FieldLinesSnapshot;
    cssWidth: number;
    cssHeight: number;
    scale: number;
    contentScale: number;
    theme: TeachingTheme;
    mode: TeachingMode;
  } | null = null;
  let pathCache: {
    key: string;
    paths: FieldLinePath[];
  } | null = null;

  function getScale(): number {
    return env.contentScale();
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

  function chargePathKey(
    charges: PixelCharge[],
    width: number,
    height: number
  ): string {
    const body = charges
      .map(
        (c) =>
          `${c.x.toFixed(1)},${c.y.toFixed(1)},${c.q.toFixed(2)},${c.radius.toFixed(1)}`
      )
      .join(';');
    return `${width}x${height}|${body}`;
  }

  function drawCaption(
    ctx: CanvasRenderingContext2D,
    text: string,
    width: number,
    height: number,
    s: number,
    ms: number,
    isDark: boolean
  ): void {
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = `${Math.max(11, 13 * s * ms)}px "Noto Sans SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height - Math.max(16, 22 * s));
  }

  function draw(next: FieldLinesSnapshot): void {
    const ctx = stage.ctx;
    if (!ctx) return;

    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const colors = THEME_CONFIG[env.theme];
    const charges = toPixelCharges(next);
    const n = Math.max(1, Math.min(40, Math.round(next.params.n)));
    const s = stage.responsiveScale;
    const ms = getScale();
    const isDark = env.theme === 'dark';

    ctx.fillStyle = colors.canvasBg;
    ctx.fillRect(0, 0, width, height);

    const key = chargePathKey(charges, width, height);
    if (!pathCache || pathCache.key !== key) {
      pathCache = {
        key,
        paths: generateFieldLines(charges, { width, height })
      };
    }
    const paths = pathCache.paths;

    const probes: FieldProbe[] = [];
    for (const path of paths) {
      probes.push(...sampleProbesAlongPath(path, n, charges));
    }

    const lineAlpha = smoothstep(8, 22, n);
    const probeAlpha = 1 - 0.92 * smoothstep(14, 32, n);
    const arrowScale = 1 - 0.5 * smoothstep(8, 28, n);
    const showTestCharge = n <= 6;
    const showTicks = n >= 26;

    if (lineAlpha > 0.02) {
      drawFieldLines(ctx, paths, s, isDark, {
        strokeAlpha: lineAlpha,
        showTicks
      });
    }

    drawProbes(ctx, probes, {
      responsiveScale: s,
      contentScale: ms,
      isDark,
      arrowScale,
      alpha: probeAlpha,
      showTestCharge
    });

    const visuals = getVisuals(ms);
    drawCharges(ctx, charges, visuals.chargeFontPx, s, isDark);
    drawCaption(ctx, captionForN(n), width, height, s, ms, isDark);

    lastRenderKey = {
      snapshot: next,
      cssWidth: width,
      cssHeight: height,
      scale: s,
      contentScale: ms,
      theme: env.theme,
      mode: env.mode
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
        key.theme === env.theme &&
        key.mode === env.mode
      ) {
        return;
      }
      draw(next);
    },
    resize(): void {
      stage.resize();
      pathCache = null;
      if (snapshot) draw(snapshot);
    },
    setMode(nextMode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(nextMode, hints);
      if (snapshot) {
        draw(snapshot);
      }
    },
    setTheme(nextTheme: TeachingTheme): void {
      env.setTheme(nextTheme);
      if (snapshot) {
        draw(snapshot);
      }
    },
    dispose(): void {
      snapshot = null;
      pathCache = null;
      stage.release();
    }
  };
}
