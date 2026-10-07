import { readElementLayoutSize } from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import {
  getRenderTokens,
  type TeachingMode,
  type TeachingTheme
} from '../../platform/standards';
import {
  createCanvasZoom,
  type CanvasZoomView
} from '../../platform/input/canvas-zoom';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { PAPER_HEIGHT_CM, PAPER_WIDTH_CM } from './scene.sim';
import type { ProjectileLabState } from './scene.sim';
import {
  APPARATUS_BOUNDS,
  drawApparatus,
  drawBoard
} from './renderer/draw-apparatus';
import {
  PAPER_MARGIN_CM,
  drawPaper,
  labPalette,
  type StageTransform
} from './renderer/draw-paper';

export type CreateProjectileLabViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

export type StageBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/** 数据处理视图的取景范围（cm）：取下的白纸铺满舞台。 */
const PAPER_BOUNDS: StageBounds = {
  left: -PAPER_MARGIN_CM - 1,
  right: PAPER_WIDTH_CM + 1,
  top: -PAPER_MARGIN_CM - 1,
  bottom: PAPER_HEIGHT_CM + 1
};

/** 最大放大到每毫米这么多 px：毫米格之间足够估读下一位。 */
const MAX_PX_PER_MM = 16;
const MM_PER_CM = 10;

/** 把取景范围等比居中放进画布。 */
export function fitStageTransform(
  bounds: StageBounds,
  width: number,
  height: number
): StageTransform {
  const worldWidth = bounds.right - bounds.left;
  const worldHeight = bounds.bottom - bounds.top;
  const pxPerCm = Math.max(
    0.01,
    Math.min(width / worldWidth, height / worldHeight)
  );
  const offsetX = (width - worldWidth * pxPerCm) / 2 - bounds.left * pxPerCm;
  const offsetY = (height - worldHeight * pxPerCm) / 2 - bounds.top * pxPerCm;
  return {
    px: (xCm) => offsetX + xCm * pxPerCm,
    py: (yCm) => offsetY + yCm * pxPerCm,
    cmX: (px) => (px - offsetX) / pxPerCm,
    cmY: (py) => (py - offsetY) / pxPerCm,
    pxPerCm,
    width,
    height
  };
}

/** 在基础取景变换上叠加画布缩放视图 screen = k·p + t。 */
export function zoomStageTransform(
  base: StageTransform,
  view: CanvasZoomView
): StageTransform {
  return {
    px: (xCm) => view.k * base.px(xCm) + view.tx,
    py: (yCm) => view.k * base.py(yCm) + view.ty,
    cmX: (px) => base.cmX((px - view.tx) / view.k),
    cmY: (py) => base.cmY((py - view.ty) / view.k),
    pxPerCm: base.pxPerCm * view.k,
    width: base.width,
    height: base.height
  };
}

export function createProjectileLabView(
  options: CreateProjectileLabViewOptions
) {
  const canvas = options.canvas ?? document.createElement('canvas');
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas,
    sizing: { mode: 'raw' },
    measure: (c) => {
      const size = readElementLayoutSize(c);
      return {
        width: Math.max(1, Math.floor(size.width)),
        height: Math.max(1, Math.floor(size.height))
      };
    }
  });

  let lastState: ProjectileLabState | null = null;
  /** 数据处理环节打开时只画取下的白纸，可放大到毫米格并平移。 */
  const zoom = createCanvasZoom({
    canvas,
    size: () => ({ width: stage.cssWidth, height: stage.cssHeight }),
    maxZoom: () =>
      (MAX_PX_PER_MM * MM_PER_CM) /
      fitStageTransform(PAPER_BOUNDS, stage.cssWidth, stage.cssHeight).pxPerCm,
    onChange: () => {
      if (lastState) render(lastState);
    }
  });

  function fontPx(): number {
    const tokens = getRenderTokens(stage.responsiveScale * env.contentScale());
    return Math.max(
      10,
      tokens.rightStage.secondaryFontPx * 0.42 * env.fontScale()
    );
  }

  function render(state: ProjectileLabState): void {
    lastState = state;
    stage.ensureSized();
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    if (width <= 0 || height <= 0) return;

    const font = fontPx();
    const palette = labPalette(env.theme);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    if (zoom.isActive()) {
      const t = zoomStageTransform(
        fitStageTransform(PAPER_BOUNDS, width, height),
        zoom.view()
      );
      drawPaper({ ctx, t, palette, state, fontPx: font, analysis: true });
    } else {
      const t = fitStageTransform(APPARATUS_BOUNDS, width, height);
      drawBoard({ ctx, t, palette, state, fontPx: font });
      drawPaper({ ctx, t, palette, state, fontPx: font, analysis: false });
      drawApparatus({ ctx, t, palette, state, fontPx: font });
    }
    ctx.restore();
  }

  stage.resize();

  return {
    render,
    resize: () => stage.resize(),
    reset(): void {},
    setAnalysisMode(active: boolean): void {
      zoom.setActive(active);
      canvas.style.cursor = active ? 'grab' : '';
    },
    isAnalysisMode: () => zoom.isActive(),
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
    },
    dispose(): void {
      zoom.dispose();
      stage.release();
    }
  };
}
