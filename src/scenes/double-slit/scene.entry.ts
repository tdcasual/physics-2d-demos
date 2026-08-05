/**
 * 双缝干涉 — 场景入口
 *
 * 步骤6支持挂载两个仪器组件（干涉读数游标卡尺 + 高精度干涉测微仪）
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';

import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createDoubleSlitSim,
  type DoubleSlitParams,
  type DoubleSlitState,
  STEPS,
  DEFAULT_L,
  computeRealDeltaXmm,
  computeMicrometerStripePx,
  computeMicrometerSpeed,
  computeCaliperFringePx,
  lambdaToRgb,
  isWhiteLight,
  getEffectiveLambda,
  FILTERS
} from './scene.sim';
import { createDoubleSlitView } from './scene.view';
import { createInterferenceVernierCaliper } from '../../instruments/interference-vernier-caliper/instrument.entry';
import { createMicrometerEyepiece } from '../../instruments/micrometer-eyepiece/instrument.entry';

export type CreateDoubleSlitSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
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
    slitDistance: 20,
    isPlaying: true,
    activeInstrument: 'caliper',
    showInstrumentReadout: false,
    micrometerOffset: 0,
    stripeOffset: 12,
    crosshairAngle: 0,
    viewMode: 'fringe',
    L: DEFAULT_L,
    lightMode: 'mono',
    filterColor: null
  });

  const view = createDoubleSlitView({
    canvas: options.canvas,
    theme: options.theme ?? 'dark',
    mode: options.mode,
    demoHints: options.demoHints
  });

  // ── 仪器实例管理 ──
  let instrumentWrap: HTMLDivElement | null = null;
  let leftContainer: HTMLDivElement | null = null;
  let rightContainer: HTMLDivElement | null = null;
  let leftCanvas: HTMLCanvasElement | null = null;
  let rightCanvas: HTMLCanvasElement | null = null;
  let leftInstrument: ReturnType<
    typeof createInterferenceVernierCaliper
  > | null = null;
  let rightInstrument: ReturnType<typeof createMicrometerEyepiece> | null =
    null;
  let lastStep = -1;
  let parentOriginalPosition: string | null = null;
  const instrumentStateCache = new Map<string, Record<string, unknown>>();
  let instrumentUnsubscribers: Array<() => void> = [];

  function ensureInstrumentCanvases(): void {
    if (instrumentWrap) return;
    const parent = options.canvas?.parentElement;
    if (!parent) return;

    parentOriginalPosition = parent.style.position;
    parent.style.position = 'relative';
    instrumentWrap = document.createElement('div');
    instrumentWrap.style.cssText =
      'position:absolute;top:30%;left:0;width:100%;height:70%;' +
      'display:flex;gap:8px;padding:8px;box-sizing:border-box;' +
      'pointer-events:none;z-index:10;overflow:visible;';
    // 传递 CSS 自定义属性给仪器组件，取消居中并设置默认左侧偏移
    instrumentWrap.style.setProperty('--instrument-justify', 'flex-start');
    instrumentWrap.style.setProperty('--instrument-align', 'flex-start');
    instrumentWrap.style.setProperty('--instrument-offset', '100px');
    parent.appendChild(instrumentWrap);

    // 左容器：游标卡尺
    leftContainer = document.createElement('div');
    leftContainer.style.cssText =
      'width:50%;height:100%;position:relative;pointer-events:auto;border-radius:4px;overflow:visible;';
    instrumentWrap.appendChild(leftContainer);

    leftCanvas = document.createElement('canvas');
    leftCanvas.style.cssText = 'width:100%;height:100%;display:block;';
    leftContainer.appendChild(leftCanvas);

    // 右容器：测微仪
    rightContainer = document.createElement('div');
    rightContainer.style.cssText =
      'flex:1;height:100%;position:relative;pointer-events:auto;border-radius:4px;overflow:visible;';
    instrumentWrap.appendChild(rightContainer);

    rightCanvas = document.createElement('canvas');
    rightCanvas.style.cssText = 'width:100%;height:100%;display:block;';
    rightContainer.appendChild(rightCanvas);
  }

  function initInstruments(theme: TeachingTheme): void {
    if (!leftContainer || !rightContainer || !leftCanvas || !rightCanvas)
      return;

    if (!leftInstrument) {
      leftInstrument = createInterferenceVernierCaliper({
        canvas: leftCanvas,
        theme,
        showHints: false
      });
      const cached = instrumentStateCache.get('caliper');
      if (cached) leftInstrument.sim.setParams(cached);
      // 订阅读数变化，同步到实验状态区
      instrumentUnsubscribers.push(
        leftInstrument.view.onReadingChange(() => base.notify())
      );
    }

    if (!rightInstrument) {
      rightInstrument = createMicrometerEyepiece({
        canvas: rightCanvas,
        theme,
        showHints: false
      });
      const cached = instrumentStateCache.get('micrometer');
      if (cached) rightInstrument.sim.setParams(cached);
      // 订阅读数变化，同步到实验状态区
      instrumentUnsubscribers.push(
        rightInstrument.view.onReadingChange(() => base.notify())
      );
    }
  }

  function disposeInstruments(): void {
    instrumentUnsubscribers.forEach((unsub) => unsub());
    instrumentUnsubscribers = [];
    if (leftInstrument) {
      instrumentStateCache.set('caliper', { ...leftInstrument.sim.getState() });
      leftInstrument.view.dispose();
    }
    if (rightInstrument) {
      instrumentStateCache.set('micrometer', {
        ...rightInstrument.sim.getState()
      });
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
    leftCanvas = null;
    rightCanvas = null;

    const parent = options.canvas?.parentElement;
    if (parent && parentOriginalPosition !== null) {
      parent.style.position = parentOriginalPosition;
      parentOriginalPosition = null;
    }
  }

  let lastActiveInstrument = '';

  function syncActiveInstrumentLayout(): void {
    const active = sim.getState().params.activeInstrument;
    if (!leftContainer || !rightContainer) return;

    const leftShouldShow = active === 'caliper';
    const rightShouldShow = active === 'micrometer';
    const leftVisible = leftContainer.style.display !== 'none';
    const rightVisible = rightContainer.style.display !== 'none';

    if (leftVisible === leftShouldShow && rightVisible === rightShouldShow)
      return;

    leftContainer.style.display = leftShouldShow ? 'block' : 'none';
    leftContainer.style.width = leftShouldShow ? '100%' : '50%';
    rightContainer.style.display = rightShouldShow ? 'block' : 'none';
    rightContainer.style.flex = rightShouldShow ? '1' : 'none';
  }

  let _lastInstrKey = '';

  function syncInstrumentParams(): void {
    const p = sim.getState().params;
    const { lambda, slitDistance, micrometerOffset, stripeOffset } = p;
    const L = p.L ?? DEFAULT_L;
    const crosshairAngle = p.crosshairAngle ?? 0;
    const viewMode = p.viewMode ?? 'fringe';

    // 脏检查：参数未变则跳过
    const key = `${lambda}_${slitDistance}_${L}_${crosshairAngle}_${viewMode}_${micrometerOffset}_${stripeOffset}`;
    if (key === _lastInstrKey) return;
    _lastInstrKey = key;

    const effectiveLambda = getEffectiveLambda(p);
    const [r, g, b] = lambdaToRgb(effectiveLambda);
    const fringeColor = `rgba(${r},${g},${b},0.85)`;
    const realDeltaXmm = computeRealDeltaXmm(effectiveLambda, slitDistance, L);
    const caliperFringePx = computeCaliperFringePx(realDeltaXmm);
    const micrometerStripePx = computeMicrometerStripePx(realDeltaXmm);
    const micrometerSpeed = computeMicrometerSpeed(realDeltaXmm);
    leftInstrument?.sim.setParams({
      fringeSpacing: caliperFringePx,
      fringeColor,
      fringeEnvelopeWidth: caliperFringePx * 8,
      crosshairAngle,
      viewMode
    });
    rightInstrument?.sim.setParams({
      stripeSpacing: micrometerStripePx,
      stripeColor: `rgb(${r},${g},${b})`,
      zeroOffset: micrometerOffset,
      stripeAngle: 90,
      stripeOffset,
      crosshairSpeed: micrometerSpeed,
      scaleInverted: true,
      crosshairAngle,
      viewMode
    });
  }

  function syncInstrumentReadout(): void {
    // 读数统一显示在实验状态区，仪器内部读数始终隐藏
    leftInstrument?.view.setReadoutVisible(false);
    rightInstrument?.view.setReadoutVisible(false);
  }

  function syncInstruments(): void {
    const state = sim.getState();
    if (state.params.step === 6) {
      if (lastStep !== 6) {
        ensureInstrumentCanvases();
        syncActiveInstrumentLayout();
        initInstruments(options.theme ?? 'dark');
        lastActiveInstrument = '';
      }
      syncActiveInstrumentLayout();
      syncInstrumentParams();
      syncInstrumentReadout();

      // display:none → block 切换后需要强制渲染，绕过 view 内部的 needRender 守卫
      const active = state.params.activeInstrument;
      const switched = active !== lastActiveInstrument;
      lastActiveInstrument = active;

      leftInstrument?.view.render(leftInstrument.sim.getState());
      rightInstrument?.view.render(rightInstrument.sim.getState());

      if (switched) {
        // 激活的仪器从 display:none 恢复为 block 后，DOM 布局需要刷新
        // 通过调用 resize() 触发完整的重排和重绘
        if (active === 'micrometer') rightInstrument?.view.resize();
        else leftInstrument?.view.resize();
      }
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
    const d = s.params.slitDistance;
    const step = s.params.step;
    const dMm = (d * 0.01).toFixed(2);
    const white = isWhiteLight(s.params);
    const lightLabel = white
      ? '白光' +
        (s.params.filterColor
          ? ` · ${FILTERS[s.params.filterColor].label}色滤光片`
          : '（无滤光片）')
      : `单色光 ${s.params.lambda} nm`;
    const items = [
      { label: '当前步骤', value: `${step} / 6` },
      { label: '光源', value: lightLabel },
      { label: '双缝间距 d', value: `${dMm} mm` },
      {
        label: '缝屏距 L',
        value: `${((s.params.L ?? DEFAULT_L) * 100).toFixed(0)} cm`
      }
    ];
    if (step === 6) {
      const instrumentName =
        s.params.activeInstrument === 'caliper'
          ? '干涉读数游标卡尺'
          : '高精度干涉测微仪';
      items.push({ label: '当前仪器', value: instrumentName });
      const effectiveLambda = getEffectiveLambda(s.params);
      const realDeltaXmm = computeRealDeltaXmm(
        effectiveLambda,
        d,
        s.params.L ?? DEFAULT_L
      );
      items.push({
        label: '条纹间距 Δx',
        value: `${realDeltaXmm.toFixed(3)} mm`
      });
      // 从当前激活仪器获取读数，统一显示在实验状态区
      const active = s.params.activeInstrument;
      if (active === 'caliper' && leftInstrument) {
        const reading = leftInstrument.view.getReading();
        items.push({
          label: '游标卡尺读数',
          value: `${(reading * 10).toFixed(3)} mm`
        });
      } else if (active === 'micrometer' && rightInstrument) {
        const reading = rightInstrument.view.getReading();
        items.push({
          label: '螺旋测微仪读数',
          value: `${reading.toFixed(3)} mm`
        });
      }
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
    getStepInfo
  };
}
