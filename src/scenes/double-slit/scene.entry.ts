/**
 * 双缝干涉 — 场景入口
 *
 * 步骤6支持挂载两个仪器组件（干涉读数游标卡尺 + 高精度干涉测微仪）
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';

import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createDoubleSlitSim, type DoubleSlitParams, type DoubleSlitState, STEPS, computeFringeSpacingPx, lambdaToRgb } from './scene.sim';
import { createDoubleSlitView } from './scene.view';
import { createInterferenceVernierCaliper } from '../../instruments/interference-vernier-caliper/instrument.entry';
import { createMicrometerEyepiece } from '../../instruments/micrometer-eyepiece/instrument.entry';

export type CreateDoubleSlitSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  onReadout?: (state: DoubleSlitState) => void;
};

export function createDoubleSlitScene(
  options: CreateDoubleSlitSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): DoubleSlitState;
  setParams(params: Partial<DoubleSlitParams>): DoubleSlitParams;
  getReadoutItems(): Array<{ label: string; value: string }>;
  getStepInfo(): { id: number; title: string; desc: string };
  subscribe(listener: () => void): () => void;
} {
  const sim = createDoubleSlitSim({
    step: 1,
    lambda: 532,
    slitDistance: 40,
    isPlaying: true,
    activeInstrument: 'caliper',
    showInstrumentReadout: false,
    micrometerOffset: 0,
    stripeOffset: 1200,
  });

  const view = createDoubleSlitView({
    canvas: options.canvas,
    theme: options.theme ?? 'dark'
  });

  // ── 仪器实例管理 ──
  let instrumentWrap: HTMLDivElement | null = null;
  let leftContainer: HTMLDivElement | null = null;
  let rightContainer: HTMLDivElement | null = null;
  let leftInstrument: ReturnType<typeof createInterferenceVernierCaliper> | null = null;
  let rightInstrument: ReturnType<typeof createMicrometerEyepiece> | null = null;
  let lastStep = -1;
  let parentOriginalPosition: string | null = null;
  const instrumentStateCache = new Map<string, Record<string, unknown>>();

  function ensureInstrumentCanvases(): void {
    if (instrumentWrap) return;
    const parent = options.canvas?.parentElement;
    if (!parent) return;

    parentOriginalPosition = parent.style.position;
    parent.style.position = 'relative';
    instrumentWrap = document.createElement('div');
    instrumentWrap.style.cssText =
      'position:absolute;bottom:0;left:0;width:100%;height:65%;' +
      'display:flex;gap:8px;padding:8px;box-sizing:border-box;' +
      'pointer-events:none;z-index:10';
    parent.appendChild(instrumentWrap);

    // 左容器：游标卡尺
    leftContainer = document.createElement('div');
    leftContainer.style.cssText =
      'flex:1;height:100%;position:relative;pointer-events:auto;border-radius:4px;overflow:hidden;';
    instrumentWrap.appendChild(leftContainer);

    const leftCanvas = document.createElement('canvas');
    leftCanvas.style.cssText = 'width:100%;height:100%;display:block;';
    leftContainer.appendChild(leftCanvas);

    // 右容器：测微仪
    rightContainer = document.createElement('div');
    rightContainer.style.cssText =
      'flex:1;height:100%;position:relative;pointer-events:auto;border-radius:4px;overflow:hidden;';
    instrumentWrap.appendChild(rightContainer);

    const rightCanvas = document.createElement('canvas');
    rightCanvas.style.cssText = 'width:100%;height:100%;display:block;';
    rightContainer.appendChild(rightCanvas);

    // 保存 canvas 引用供后续仪器创建使用
    (leftContainer as unknown as Record<string, HTMLCanvasElement | undefined>).__canvas = leftCanvas;
    (rightContainer as unknown as Record<string, HTMLCanvasElement | undefined>).__canvas = rightCanvas;
  }

  function initInstruments(theme: TeachingTheme): void {
    if (!leftContainer || !rightContainer) return;

    const leftCanvas = (leftContainer as unknown as Record<string, HTMLCanvasElement | undefined>).__canvas as HTMLCanvasElement;
    const rightCanvas = (rightContainer as unknown as Record<string, HTMLCanvasElement | undefined>).__canvas as HTMLCanvasElement;

    if (!leftInstrument) {
      leftInstrument = createInterferenceVernierCaliper({
        canvas: leftCanvas,
        theme,
        showHints: false
      });
      const cached = instrumentStateCache.get('caliper');
      if (cached) leftInstrument.sim.setParams(cached);
    }

    if (!rightInstrument) {
      rightInstrument = createMicrometerEyepiece({
        canvas: rightCanvas,
        theme,
        showHints: false
      });
      const cached = instrumentStateCache.get('micrometer');
      if (cached) rightInstrument.sim.setParams(cached);
    }
  }

  function disposeInstruments(): void {
    if (leftInstrument) {
      instrumentStateCache.set('caliper', { ...leftInstrument.sim.getState() });
      leftInstrument.view.dispose();
    }
    if (rightInstrument) {
      instrumentStateCache.set('micrometer', { ...rightInstrument.sim.getState() });
      rightInstrument.view.dispose();
    }
    leftInstrument = null;
    rightInstrument = null;

    if (instrumentWrap && instrumentWrap.parentElement) {
      instrumentWrap.parentElement.removeChild(instrumentWrap);
    }
    instrumentWrap = null;
    leftContainer = null;
    rightContainer = null;

    const parent = options.canvas?.parentElement;
    if (parent && parentOriginalPosition !== null) {
      parent.style.position = parentOriginalPosition;
      parentOriginalPosition = null;
    }
  }

  function syncActiveInstrumentLayout(): void {
    const active = sim.getState().params.activeInstrument;
    if (leftContainer) {
      leftContainer.style.display = active === 'caliper' ? 'block' : 'none';
      leftContainer.style.flex = active === 'caliper' ? '1' : 'none';
    }
    if (rightContainer) {
      rightContainer.style.display = active === 'micrometer' ? 'block' : 'none';
      rightContainer.style.flex = active === 'micrometer' ? '1' : 'none';
    }
  }

  function syncInstrumentParams(): void {
    const { lambda, slitDistance, micrometerOffset, stripeOffset } = sim.getState().params;
    const fringeSpacingPx = computeFringeSpacingPx(lambda, slitDistance);
    const [r, g, b] = lambdaToRgb(lambda);
    const fringeColor = `rgba(${r},${g},${b},0.85)`;
    leftInstrument?.sim.setParams({ fringeSpacing: fringeSpacingPx, fringeColor });
    rightInstrument?.sim.setParams({
      stripeSpacing: fringeSpacingPx,
      stripeColor: `rgb(${r},${g},${b})`,
      zeroOffset: micrometerOffset,
      stripeAngle: 90,
      stripeOffset
    });
  }

  function syncInstrumentReadout(): void {
    const show = sim.getState().params.showInstrumentReadout;
    (leftInstrument?.view as unknown as { setReadoutVisible?: (v: boolean) => void })?.setReadoutVisible?.(show);
    (rightInstrument?.view as unknown as { setReadoutVisible?: (v: boolean) => void })?.setReadoutVisible?.(show);
  }

  function syncInstruments(): void {
    const state = sim.getState();
    if (state.params.step === 6) {
      if (lastStep !== 6) {
        ensureInstrumentCanvases();
        initInstruments(options.theme ?? 'dark');
      }
      syncActiveInstrumentLayout();
      syncInstrumentParams();
      syncInstrumentReadout();
      leftInstrument?.view.render(leftInstrument.sim.getState());
      rightInstrument?.view.render(rightInstrument.sim.getState());
    } else if (lastStep === 6) {
      disposeInstruments();
    }
    lastStep = state.params.step;
  }

  // ── 标准场景入口 ──
  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout
  });

  function getReadoutItems(): Array<{ label: string; value: string }> {
    const s = sim.getState();
    const lambda = s.params.lambda;
    const d = s.params.slitDistance;
    const step = s.params.step;
    const dMm = (d * 0.01).toFixed(2);
    const items = [
      { label: '当前步骤', value: `${step} / 6` },
      { label: '波长', value: `${lambda} nm` },
      { label: '双缝间距 d', value: `${dMm} mm` },
    ];
    if (step === 6) {
      const instrumentName = s.params.activeInstrument === 'caliper' ? '干涉读数游标卡尺' : '高精度干涉测微仪';
      items.push({ label: '当前仪器', value: instrumentName });
      const fringeSpacingPx = computeFringeSpacingPx(lambda, d);
      items.push({ label: '条纹间距 Δx', value: `${(fringeSpacingPx * 0.01).toFixed(3)} mm` });
    }
    return items;
  }

  function getStepInfo(): { id: number; title: string; desc: string } {
    const step = sim.getState().params.step;
    const info = STEPS[step - 1];
    return info ?? STEPS[0];
  }

  return {
    ...base,
    getState() {
      return sim.getState();
    },
    setParams(params: Partial<DoubleSlitParams>): DoubleSlitParams {
      const result = sim.setParams(params);
      base.renderAndEmit();
      syncInstruments();
      base.notify();
      return result;
    },
    render() {
      base.renderAndEmit();
      syncInstruments();
      base.notify();
    },
    resize() {
      view.resize();
      leftInstrument?.view.resize();
      rightInstrument?.view.resize();
      base.renderAndEmit();
      syncInstruments();
    },
    setTheme(theme: TeachingTheme) {
      view.setTheme(theme);
      if (sim.getState().params.step === 6) {
        leftInstrument?.view.setTheme(theme);
        rightInstrument?.view.setTheme(theme);
      }
      base.renderAndEmit();
      syncInstruments();
      base.notify();
    },
    dispose() {
      disposeInstruments();
      base.dispose();
    },
    getReadoutItems,
    getStepInfo,
  };
}
