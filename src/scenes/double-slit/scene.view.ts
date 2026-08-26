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
import { sizeCanvasToFill } from '../../core/canvas-sizing';
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
  let canvas = options.canvas ?? null;
  let ctx: CanvasRenderingContext2D | null = null;
  let theme: TeachingTheme = options.theme ?? 'dark';
  let scale = 1;
  let dpr = 1;
  let mode: TeachingMode = options.mode ?? 'normal';
  let demoHints: DemoRenderHints | undefined = options.demoHints;

  /** 演示模式内容放大系数（normal=1，presentation=renderHints.contentScale） */
  function getContentScale(): number {
    return mode === 'presentation' ? (demoHints?.contentScale ?? 1.5) : 1;
  }

  function resizeCanvas(): void {
    if (!canvas) return;
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;
    const rawScale = parseFloat(canvas.dataset.responsiveScale || '1');
    const cssW = parseFloat(canvas.style.width || '1000');
    const cssH = parseFloat(canvas.style.height || '500');
    dpr = canvas.width / cssW;
    // 限制 scale 使 1000×500 逻辑画布始终能 fit 进 CSS 容器，再乘 dpr 利用高分辨率
    const fitScale = Math.min(cssW / 1000, cssH / 500);
    scale = Math.min(rawScale, fitScale);
  }

  // 白光条纹面板离屏缓存（每实例一份）
  const whiteFringeCache = createWhiteFringeCache();

  // ── 主渲染 ──

  function drawScene(next: DoubleSlitState): void {
    const c = ctx;
    if (!c || !canvas) return;

    const isDark = theme === 'dark';
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
      getContentScale()
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
        getContentScale()
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
            getContentScale()
          );
        } else {
          drawMonoLightRays(c, POS, CY, time, palette.wave, getContentScale());
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
            getContentScale()
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
            getContentScale()
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
            getContentScale()
          );
          drawWhiteWaves(
            c,
            POS.doubleSlit,
            CY + d / 2,
            maxRadius,
            time,
            next.params.filterColor,
            scale,
            getContentScale()
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
            getContentScale()
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
            getContentScale()
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
            getContentScale()
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
            getContentScale()
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
        getContentScale()
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
            getContentScale()
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
            getContentScale()
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
            getContentScale()
          );
        }
      }
    }
  }

  // ── 初始化 ──
  if (canvas) resizeCanvas();

  return {
    render(state: DoubleSlitState) {
      drawScene(state);
    },
    resize() {
      resizeCanvas();
    },
    setTheme(t: TeachingTheme) {
      theme = t;
    },
    setMode(newMode: TeachingMode, hints?: DemoRenderHints) {
      mode = newMode;
      demoHints = hints;
    },
    dispose() {
      canvas = null;
      ctx = null;
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
