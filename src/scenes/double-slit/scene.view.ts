/**
 * 双缝干涉 — Canvas 渲染器
 *
 * 6 步骤渐进式实验演示动画
 * 逻辑画布尺寸 1000×500，通过 ctx.setTransform 响应式缩放
 * 支持浅色/深色双模式，波色随光源波长自动匹配
 *
 * 绘制子模块位于 renderer/ 子目录（palette / spectrum / instruments /
 * waves / interference / white），本文件只保留工厂装配与主渲染编排。
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import type { DoubleSlitState } from './scene.sim';
import {
  lambdaToGap,
  DEFAULT_L,
  isWhiteLight,
  getActiveWavelengths,
  getEffectiveLambda
} from './scene.sim';
import {
  SCENE_PALETTE,
  getWavePalette,
  type WavePalette
} from './renderer/palette';
import { drawSpectrumBar, resetSpectrumCache } from './renderer/draw-spectrum';
import {
  drawInstruments,
  resetInstrumentCaches
} from './renderer/draw-instruments';
import {
  drawMonoLightRays,
  drawWaves,
  drawWhiteLightRays,
  drawWhiteWaves
} from './renderer/draw-waves';
import {
  drawInterferenceOverlay,
  drawInterferencePattern,
  drawStep6Pattern,
  resetInterferenceCaches
} from './renderer/draw-interference';
import {
  createWhiteFringeCache,
  drawWhiteFringeDisplay,
  drawWhiteInterferenceOverlay,
  drawWhiteInterferencePattern
} from './renderer/draw-white';

export type CreateDoubleSlitViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

// ── 模块级常量 ──
const POS = {
  light: 80,
  lens: 180,
  filter: 230,
  singleSlit: 280,
  doubleSlit: 400,
  screen: 800,
  eyepiece: 920
} as const;

// ── 模块级缓存 ──
let _paletteKey = '';
let _cachedPalette: WavePalette | null = null;
let _sceneKey = '';
let _cachedScene: (typeof SCENE_PALETTE)['dark'] | null = null;
let _wlKey = '';
let _cachedWl: number[] = [];

export function createDoubleSlitView(
  options: CreateDoubleSlitViewOptions = {}
) {
  const env = createViewEnvironment({
    theme: options.theme,
    mode: options.mode,
    demoHints: options.demoHints
  });
  let hideNumericHints = false;
  // 1000×500 逻辑画布：尺寸取自 style（sizeCanvasToFill 刚写入），
  // scale 限制为逻辑画布 fit 进 CSS 容器的系数与 responsiveScale 的较小者
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'raw' },
    measure: (canvas) => ({
      width: parseFloat(canvas.style.width || '1000'),
      height: parseFloat(canvas.style.height || '500')
    }),
    resolveScale: (canvas, viewport) => {
      const rawScale = parseFloat(canvas.dataset.responsiveScale || '1');
      const fitScale = Math.min(
        viewport.cssWidth / 1000,
        viewport.cssHeight / 500
      );
      return Math.min(rawScale, fitScale);
    }
  });

  // 白光条纹面板离屏缓存（每实例一份）
  const whiteFringeCache = createWhiteFringeCache();

  // ── 主渲染 ──

  function drawScene(next: DoubleSlitState): void {
    const c = stage.ctx;
    if (!c || !stage.canvas) return;
    const canvas = stage.canvas;
    const scale = stage.responsiveScale;
    const dpr = stage.dpr;

    const isDark = env.theme === 'dark';
    const time = next.time;
    const step = next.params.step;
    const lambda = next.params.lambda;
    // 缓存 palette
    const pk = `${lambda}_${isDark ? 1 : 0}`;
    if (pk !== _paletteKey) {
      _cachedPalette = getWavePalette(lambda, isDark);
      _paletteKey = pk;
    }
    const palette = _cachedPalette!;
    // 缓存 scene palette
    const sk = isDark ? 'd' : 'l';
    if (sk !== _sceneKey) {
      _cachedScene = SCENE_PALETTE[isDark ? 'dark' : 'light'];
      _sceneKey = sk;
    }
    const scene = _cachedScene!;
    const d = next.params.slitDistance;
    const L = next.params.L ?? DEFAULT_L;
    const gap = lambdaToGap(lambda);

    const W = 1000;
    const H = 500;
    const hideLabels =
      hideNumericHints ||
      canvas
        .closest('.layout-master')
        ?.classList.contains('is-data-workspace') === true;
    if (hideLabels) canvas.dataset.hideNumericHints = '1';
    else delete canvas.dataset.hideNumericHints;

    // 以像素坐标清除整个 canvas
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = scene.bg;
    c.fillRect(0, 0, canvas.width, canvas.height);

    // 设置逻辑坐标变换
    c.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);

    // 光谱色带（左上角）
    const white = isWhiteLight(next.params);
    const effectiveLambda = getEffectiveLambda(next.params);
    drawSpectrumBar(
      c,
      white ? effectiveLambda : lambda,
      isDark,
      env.contentScale(),
      hideLabels
    );

    const CY = H * 0.5;

    // 缓存 wavelengths
    const wk = `${next.params.lightMode}_${next.params.filterColor}_${lambda}`;
    if (wk !== _wlKey) {
      _cachedWl = getActiveWavelengths(next.params);
      _wlKey = wk;
    }
    const wavelengths = _cachedWl;

    // 步骤6：上方大干涉图样，下方由仪器组件接管
    if (step === 6) {
      drawStep6Pattern(
        c,
        W,
        H,
        lambda,
        d,
        palette,
        scene,
        isDark,
        L,
        env.contentScale(),
        hideLabels
      );
    } else {
      // 步骤 1–5：完整光路 + 仪器
      if (step >= 1) {
        if (white) {
          drawWhiteLightRays(
            c,
            POS,
            CY,
            time,
            next.params.filterColor,
            env.contentScale()
          );
        } else {
          drawMonoLightRays(c, POS, CY, time, palette.wave, env.contentScale());
        }
      }

      if (step >= 2) {
        if (white) {
          drawWhiteWaves(
            c,
            POS.singleSlit,
            CY,
            POS.doubleSlit - POS.singleSlit,
            time,
            next.params.filterColor,
            scale,
            env.contentScale()
          );
        } else {
          drawWaves(
            c,
            POS.singleSlit,
            CY,
            POS.doubleSlit - POS.singleSlit,
            palette.wave,
            gap,
            time,
            scale,
            env.contentScale()
          );
        }
      }

      if (step >= 3) {
        const maxRadius = step >= 4 ? POS.screen - POS.doubleSlit + 50 : 60;
        if (white) {
          drawWhiteWaves(
            c,
            POS.doubleSlit,
            CY - d / 2,
            maxRadius,
            time,
            next.params.filterColor,
            scale,
            env.contentScale()
          );
          drawWhiteWaves(
            c,
            POS.doubleSlit,
            CY + d / 2,
            maxRadius,
            time,
            next.params.filterColor,
            scale,
            env.contentScale()
          );
        } else {
          drawWaves(
            c,
            POS.doubleSlit,
            CY - d / 2,
            maxRadius,
            palette.wave,
            gap,
            time,
            scale,
            env.contentScale()
          );
          drawWaves(
            c,
            POS.doubleSlit,
            CY + d / 2,
            maxRadius,
            palette.wave,
            gap,
            time,
            scale,
            env.contentScale()
          );
        }
      }

      // 步骤4：空间干涉与叠加可视化
      if (step === 4) {
        // 先画遮光筒底色
        c.fillStyle = scene.tubeBg;
        c.fillRect(POS.doubleSlit, CY - 100, POS.screen - POS.doubleSlit, 200);
        c.strokeStyle = scene.tubeBorder;
        c.lineWidth = 2;
        c.strokeRect(
          POS.doubleSlit,
          CY - 100,
          POS.screen - POS.doubleSlit,
          200
        );
        // 叠加明暗带
        if (white) {
          drawWhiteInterferenceOverlay(
            c,
            POS.doubleSlit,
            POS.screen,
            CY,
            d,
            POS.screen - POS.doubleSlit,
            time,
            wavelengths,
            isDark,
            scale,
            env.contentScale()
          );
        } else {
          drawInterferenceOverlay(
            c,
            POS.doubleSlit,
            POS.screen,
            CY,
            d,
            gap,
            palette,
            POS.screen - POS.doubleSlit,
            isDark,
            time,
            scale,
            env.contentScale()
          );
        }
      }

      // 绘制仪器
      drawInstruments(
        c,
        POS,
        CY,
        d,
        palette,
        scene,
        step === 4,
        white,
        next.params.filterColor,
        scale,
        env.contentScale()
      );

      // 干涉条纹与光强曲线
      if (step >= 5) {
        if (white) {
          drawWhiteInterferencePattern(
            c,
            POS.screen,
            CY,
            d,
            POS.screen - POS.doubleSlit,
            wavelengths,
            scene,
            isDark,
            scale,
            env.contentScale()
          );
          drawWhiteFringeDisplay(
            c,
            whiteFringeCache,
            d,
            L,
            wavelengths,
            next.params.filterColor,
            isDark,
            W,
            H,
            env.contentScale()
          );
        } else {
          drawInterferencePattern(
            c,
            POS.screen,
            CY,
            d,
            gap,
            palette,
            POS.screen - POS.doubleSlit,
            scene,
            scale,
            env.contentScale()
          );
        }
      }
    }
  }

  // ── 初始化 ──
  if (stage.canvas) stage.resize();

  return {
    render(state: DoubleSlitState) {
      drawScene(state);
    },
    resize() {
      stage.resize();
    },
    setTheme(t: TeachingTheme) {
      env.setTheme(t);
    },
    setMode(newMode: TeachingMode, hints?: DemoRenderHints) {
      env.setMode(newMode, hints);
    },
    setHideNumericHints(hide: boolean) {
      hideNumericHints = hide;
      if (stage.canvas) {
        if (hide) stage.canvas.dataset.hideNumericHints = '1';
        else delete stage.canvas.dataset.hideNumericHints;
      }
    },
    dispose() {
      stage.release();
      // 释放 offscreen 缓存
      resetSpectrumCache();
      resetInterferenceCaches();
      resetInstrumentCaches();
      whiteFringeCache.cvs = whiteFringeCache.ctx = null;
      whiteFringeCache.key = '';
      _paletteKey = '';
      _cachedPalette = null;
      _sceneKey = '';
      _cachedScene = null;
      _wlKey = '';
      _cachedWl = [];
    }
  };
}
