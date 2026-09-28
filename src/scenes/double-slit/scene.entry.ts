/**
 * 双缝干涉 — 场景入口
 *
 * 步骤6支持挂载两个仪器组件（干涉读数游标卡尺 + 高精度干涉测微仪）
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { STAGE_FRAME_ATTR } from '../../platform/stage-chrome';

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
import {
  CALIPER_PRECISION_MM,
  CALIPER_READING_STRATEGY,
  MICROMETER_PRECISION_MM,
  MICROMETER_READING_STRATEGY
} from './reading-constants';
import { opticsChangeReason } from './optics-params';
import {
  cloneSession,
  createDataWorkspaceHost,
  createEmptySession,
  freezeSession,
  quantizeExactDiscreteMm,
  type DataWorkspaceEligibility,
  type DataWorkspaceHost,
  type MeasurementSnapshot
} from '../../platform/data-workspace';
import {
  doubleSlitFringeOrder,
  withDoubleSlitFringeOrder
} from './snapshot-meta';
import type { createDoubleSlitDataWorkspace } from './data-task';
// 仪器组件体积较大且仅在步骤 6 使用，运行时通过 dynamic import 按需加载；
// 此处保留 type-only 引用（不产生运行时 chunk 边）用于实例类型推导
import type { createInterferenceVernierCaliper } from '../../instruments/interference-vernier-caliper/instrument.entry';
import type { createMicrometerEyepiece } from '../../instruments/micrometer-eyepiece/instrument.entry';

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
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  getDataWorkspace(): DataWorkspaceHost;
  getStepInfo(): { id: number; title: string; desc: string };
  subscribe(listener: () => void): () => void;
  reattach(opts?: { container?: HTMLElement }): void;
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

  // 标准入口提前创建，避免仪器异步 .then 回调在 TDZ 内引用 base
  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout
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
  let currentTheme: TeachingTheme = options.theme ?? 'dark';
  let positionedParent: HTMLElement | null = null;
  let positionedInline: string | null = null;
  const instrumentStateCache = new Map<string, Record<string, unknown>>();
  let instrumentUnsubscribers: Array<() => void> = [];
  // 仪器模块异步加载的 dedup 缓存：并发 initInstruments 调用共享同一 Promise
  let instrumentsLoadPromise: Promise<void> | null = null;
  let instrumentGeneration = 0;
  let instrumentLoadFailed = false;

  function ensurePositioned(parent: HTMLElement): void {
    let pos = '';
    try {
      pos = getComputedStyle(parent).position;
    } catch {
      pos = parent.style.position;
    }
    if (pos && pos !== 'static' && pos !== 'auto') return;
    if (positionedParent === parent) return;
    positionedParent = parent;
    positionedInline = parent.style.position;
    parent.style.position = 'relative';
  }

  function restorePositioned(): void {
    if (positionedParent && positionedInline !== null) {
      positionedParent.style.position = positionedInline;
    }
    positionedParent = null;
    positionedInline = null;
  }

  /** 把同一份仪器树挂回当前画布的父节点。布局切换只保留主画布。 */
  function rehomeInstrumentWrap(): boolean {
    const parent = options.canvas?.parentElement;
    if (!instrumentWrap || !parent) return false;
    if (instrumentWrap.parentElement === parent) return false;
    restorePositioned();
    ensurePositioned(parent);
    parent.appendChild(instrumentWrap);
    return true;
  }

  function ensureInstrumentCanvases(): void {
    const parent = options.canvas?.parentElement;
    if (instrumentWrap) {
      rehomeInstrumentWrap();
      return;
    }
    if (!parent) return;

    ensurePositioned(parent);
    instrumentWrap = document.createElement('div');
    instrumentWrap.style.cssText =
      'position:absolute;top:30%;left:0;width:100%;height:70%;' +
      'display:flex;gap:8px;padding:8px;box-sizing:border-box;' +
      'pointer-events:none;z-index:10;overflow:visible;';
    // 传递 CSS 自定义属性给仪器组件，取消居中并设置默认左侧偏移
    instrumentWrap.style.setProperty('--instrument-justify', 'flex-start');
    instrumentWrap.style.setProperty('--instrument-align', 'flex-start');
    instrumentWrap.style.setProperty('--instrument-offset', '100px');
    instrumentWrap.dataset.doubleSlitInstruments = 'true';
    // 平移忽略标记（只挡平移、不挡滚轮；滚轮缩放必须保留）
    instrumentWrap.dataset.panzoomPanIgnore = 'true';
    instrumentWrap.addEventListener('instrument-set-reading', (event) => {
      const mm = (event as CustomEvent<{ mm?: number }>).detail?.mm;
      if (typeof mm !== 'number' || !Number.isFinite(mm)) return;
      const active = sim.getState().params.activeInstrument;
      if (active === 'caliper') leftInstrument?.view.setReading(mm / 10);
      else rightInstrument?.view.setReading(mm);
      syncInstrumentHostAttrs();
      base.notify();
    });
    // 追加在主画布之后，布局切换 querySelector('canvas') 仍先命中主画布。
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

  function initInstruments(): void {
    if (!leftContainer || !rightContainer || !leftCanvas || !rightCanvas)
      return;
    if (leftInstrument && rightInstrument) return;
    if (instrumentsLoadPromise || instrumentLoadFailed) return;

    const generation = instrumentGeneration;
    const leftHost = leftCanvas;
    const rightHost = rightCanvas;
    const pending = Promise.all([
      import('../../instruments/interference-vernier-caliper/instrument.entry'),
      import('../../instruments/micrometer-eyepiece/instrument.entry')
    ])
      .then(([caliperModule, micrometerModule]) => {
        // 加载期间已离开步骤 6，或布局切换已换代：丢弃这次结果。
        if (generation !== instrumentGeneration) return;
        if (
          !leftContainer ||
          !rightContainer ||
          leftCanvas !== leftHost ||
          rightCanvas !== rightHost
        ) {
          return;
        }
        if (leftInstrument || rightInstrument) return;

        let caliper: ReturnType<
          typeof caliperModule.createInterferenceVernierCaliper
        > | null = null;
        let micrometer: ReturnType<
          typeof micrometerModule.createMicrometerEyepiece
        > | null = null;
        try {
          caliper = caliperModule.createInterferenceVernierCaliper({
            canvas: leftHost,
            theme: currentTheme,
            showHints: false
          });
          micrometer = micrometerModule.createMicrometerEyepiece({
            canvas: rightHost,
            theme: currentTheme,
            showHints: false
          });
        } catch (error: unknown) {
          caliper?.view.dispose();
          micrometer?.view.dispose();
          if (generation === instrumentGeneration) {
            instrumentLoadFailed = true;
            console.error('[double-slit] 仪器实例化失败', error);
          }
          return;
        }
        if (!caliper || !micrometer) return;
        if (generation !== instrumentGeneration) {
          caliper.view.dispose();
          micrometer.view.dispose();
          return;
        }

        leftInstrument = caliper;
        rightInstrument = micrometer;
        const cachedCaliper = instrumentStateCache.get('caliper');
        if (cachedCaliper) leftInstrument.sim.setParams(cachedCaliper);
        const cachedMicrometer = instrumentStateCache.get('micrometer');
        if (cachedMicrometer) rightInstrument.sim.setParams(cachedMicrometer);
        instrumentUnsubscribers.push(
          leftInstrument.view.onReadingChange(() => {
            syncInstrumentHostAttrs();
            base.notify();
          }),
          rightInstrument.view.onReadingChange(() => {
            syncInstrumentHostAttrs();
            base.notify();
          })
        );
        if (generation !== instrumentGeneration) return;

        rehomeInstrumentWrap();
        // 加载期间 syncInstrumentParams 的脏检查可能已消费当前参数 key，
        // 重置以强制向新建实例推送一次参数
        _lastInstrKey = '';
        syncInstruments();
        leftInstrument?.view.resize();
        rightInstrument?.view.resize();
        base.notify();
      })
      .catch((error: unknown) => {
        if (generation !== instrumentGeneration) return;
        instrumentLoadFailed = true;
        console.error('[double-slit] 仪器模块加载失败', error);
      })
      .finally(() => {
        if (instrumentsLoadPromise === pending) instrumentsLoadPromise = null;
      });
    instrumentsLoadPromise = pending;
  }

  function disposeInstruments(): void {
    instrumentGeneration += 1;
    instrumentLoadFailed = false;
    instrumentsLoadPromise = null;
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
    restorePositioned();
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
      if (lastStep !== 6) lastActiveInstrument = '';
      const moved = rehomeInstrumentWrap();
      ensureInstrumentCanvases();
      if (!leftInstrument || !rightInstrument) initInstruments();
      syncActiveInstrumentLayout();
      syncInstrumentParams();
      syncInstrumentReadout();

      // display:none → block 切换后需要强制渲染，绕过 view 内部的 needRender 守卫
      const active = state.params.activeInstrument;
      const switched = active !== lastActiveInstrument;
      lastActiveInstrument = active;

      leftInstrument?.view.render(leftInstrument.sim.getState());
      rightInstrument?.view.render(rightInstrument.sim.getState());

      if (switched || moved) {
        // 激活的仪器从 display:none 恢复，或整棵仪器树换了父节点。
        leftInstrument?.view.resize();
        rightInstrument?.view.resize();
      }
      syncInstrumentHostAttrs();
      if (visualsActive) scheduleInstrumentStageFit();
    } else if (lastStep === 6) {
      disposeInstruments();
    }
    lastStep = state.params.step;
  }

  function captureMeasurement(): MeasurementSnapshot | null {
    const p = sim.getState().params;
    if (p.step !== 6) return null;
    if (p.activeInstrument === 'caliper') {
      if (!leftInstrument) return null;
      const alignment = leftInstrument.view.getAlignment();
      return withDoubleSlitFringeOrder(
        {
          readingMm: quantizeExactDiscreteMm(
            leftInstrument.view.getReading() * 10,
            CALIPER_READING_STRATEGY.stepMm
          ),
          precisionMm: CALIPER_PRECISION_MM,
          displayDigits: 3,
          instrumentId: 'caliper',
          instrumentLabel: '干涉读数游标卡尺',
          capturedAt: Date.now(),
          aligned: alignment.aligned,
          residualPx: alignment.residualPx,
          readingStrategy: CALIPER_READING_STRATEGY
        },
        alignment.fringeOrder
      );
    }
    if (!rightInstrument) return null;
    const alignment = rightInstrument.view.getAlignment();
    return withDoubleSlitFringeOrder(
      {
        readingMm: rightInstrument.view.getReading(),
        precisionMm: MICROMETER_PRECISION_MM,
        displayDigits: 3,
        instrumentId: 'micrometer',
        instrumentLabel: '高精度干涉测微仪',
        capturedAt: Date.now(),
        aligned: alignment.aligned,
        residualPx: alignment.residualPx,
        readingStrategy: MICROMETER_READING_STRATEGY
      },
      alignment.fringeOrder
    );
  }

  function syncInstrumentHostAttrs(): void {
    if (!instrumentWrap) return;
    const snap = captureMeasurement();
    instrumentWrap.dataset.instrumentId = snap?.instrumentId ?? '';
    instrumentWrap.dataset.readingMm =
      snap != null ? snap.readingMm.toFixed(3) : '';
    instrumentWrap.dataset.aligned = snap?.aligned ? 'true' : 'false';
    const fringeOrder = doubleSlitFringeOrder(snap);
    instrumentWrap.dataset.fringeOrder =
      fringeOrder != null ? String(fringeOrder) : '';
  }

  /**
   * 舞台视觉激活开关，与 host 会话语义（演示结束后借它自动重进工作区）
   * 分离。演示挂起走 setActiveVisual(false)：会话保留，视觉还原；fit 门
   * （syncInstruments / syncInstrumentStageFit）读本标志，防止演示中
   * adapter setMode 触发的 resize 把 --dw-h 写回。
   */
  let visualsActive = false;

  function collectInstrumentVisualRects(root: ParentNode): DOMRect[] {
    const selectors = [
      '.instrument-container',
      '.slider-assembly',
      '.lens-assembly',
      '.knob',
      '.screw-assembly',
      '.main-ruler',
      '.micrometer-system',
      '.case',
      '.thimble-group',
      '.thimble-body',
      '.ratchet',
      '.lens-outer-ring'
    ];
    const rects: DOMRect[] = [];
    const visit = (node: ParentNode) => {
      for (const sel of selectors) {
        node.querySelectorAll(sel).forEach((el) => {
          if (!(el instanceof HTMLElement)) return;
          const r = el.getBoundingClientRect();
          if (r.width > 1 && r.height > 1) rects.push(r);
        });
      }
      node.querySelectorAll('*').forEach((el) => {
        if (el instanceof HTMLElement && el.shadowRoot) visit(el.shadowRoot);
      });
    };
    visit(root);
    return rects;
  }

  function syncInstrumentStageFit(): void {
    const canvas = options.canvas;
    // 舞台 frame（mobile 是 .mobile-animation-section）。桌面 frame 上
    // 会多写一个无人读的内联变量：--dw-h 的唯一消费规则
    // （data-workspace.css 的 --dw-h 段）锁在 .mobile-animation-section 上。
    const section = canvas?.closest(
      `[${STAGE_FRAME_ATTR}]`
    ) as HTMLElement | null;
    if (!section) return;
    if (!visualsActive || !instrumentWrap) {
      section.style.removeProperty('--dw-h');
      return;
    }
    const rects = collectInstrumentVisualRects(instrumentWrap);
    if (rects.length === 0) {
      section.style.setProperty('--dw-h', '160px');
      return;
    }
    const sectionTop = section.getBoundingClientRect().top;
    const bottom = Math.max(...rects.map((r) => r.bottom));
    // Include top chrome (pan hint / padding) so width-based scale
    // cannot hang the eyepiece below the --dw-h box.
    const measured = Math.max(0, bottom - sectionTop + 8);
    const height = Math.max(160, measured);
    section.style.setProperty('--dw-h', `${Math.ceil(height)}px`);
  }

  function scheduleInstrumentStageFit(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        syncInstrumentStageFit();
        leftInstrument?.view.resize();
        rightInstrument?.view.resize();
        requestAnimationFrame(() => {
          syncInstrumentStageFit();
        });
      });
    });
  }

  type InnerWorkspace = ReturnType<typeof createDoubleSlitDataWorkspace>;

  function setActiveVisual(active: boolean): void {
    visualsActive = active;
    view.setHideNumericHints(active);
    if (instrumentWrap) {
      instrumentWrap.style.top = active ? '0' : '30%';
      instrumentWrap.style.height = active ? '100%' : '70%';
    }
    if (options.canvas) {
      options.canvas.style.opacity = active ? '0' : '';
      options.canvas.style.pointerEvents = active ? 'none' : '';
    }
    if (!active) {
      // 立即清掉仪器 fit 高度，不等 rAF：演示挂起后 adapter 的
      // setMode/resize 不再写回（fit 门已换 visualsActive）。
      const section = options.canvas?.closest(
        `[${STAGE_FRAME_ATTR}]`
      ) as HTMLElement | null;
      section?.style.removeProperty('--dw-h');
    }
    if (sim.getState().params.step === 6) {
      leftInstrument?.view.resize();
      rightInstrument?.view.resize();
    }
    scheduleInstrumentStageFit();
  }

  const dataWorkspace = createDataWorkspaceHost<InnerWorkspace>({
    load: () =>
      import('./data-task').then((mod) =>
        mod.createDoubleSlitDataWorkspace({
          getParams: () => sim.getState().params,
          capture: captureMeasurement
        })
      ),
    eligibility: (): DataWorkspaceEligibility => {
      const params = sim.getState().params;
      if (params.step !== 6) {
        return {
          ok: false,
          reason: '请先进入第 6 步（目镜观察）后再处理数据'
        };
      }
      return { ok: false, reason: '数据任务加载中' };
    },
    emptySession: (active) =>
      freezeSession(
        cloneSession({
          ...createEmptySession(1),
          active
        })
      ),
    prefetch: () => sim.getState().params.step === 6,
    onActiveChange: setActiveVisual,
    notify: () => base.notify(),
    renderAndEmit: () => base.renderAndEmit(),
    effects: {
      submitField: 'notify',
      addTrial: 'notify',
      removeTrial: 'notify',
      syncInstrument: 'notify'
    },
    extensions: {
      // 可选调用：数据任务模块尚未加载完时静默跳过（lifecycle 测试与
      // 加载窗口内的 setParams 不可抛）；调用方负责随后的 notify。
      invalidateAll: { notify: false },
      setActiveVisual,
      renderResult: true
    },
    loadingMessage: '数据任务加载中',
    notReadyError: '[double-slit] data workspace not ready',
    loadErrorLabel: '[double-slit] 数据任务模块加载失败'
  });

  function getReadoutItems(): Array<{
    key: string;
    label: string;
    value: string;
  }> {
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
    const workspaceActive = dataWorkspace.getSession().active;
    const safeLightLabel = workspaceActive
      ? white
        ? '白光'
        : '单色光'
      : lightLabel;
    const items = [
      { key: 'step', label: '当前步骤', value: `${step} / 6` },
      { key: 'light', label: '光源', value: safeLightLabel },
      { key: 'd', label: '双缝间距 d', value: `${dMm} mm` },
      {
        key: 'L',
        label: '缝屏距 L',
        value: `${((s.params.L ?? DEFAULT_L) * 100).toFixed(0)} cm`
      }
    ];
    if (step === 6) {
      const instrumentName =
        s.params.activeInstrument === 'caliper'
          ? '干涉读数游标卡尺'
          : '高精度干涉测微仪';
      items.push({
        key: 'instrument',
        label: '当前仪器',
        value: instrumentName
      });
      if (workspaceActive) {
        items.push({
          key: 'task-hint',
          label: '提示',
          value: '对准亮纹后手动填表；n 为间隔数'
        });
        return items;
      }
      const effectiveLambda = getEffectiveLambda(s.params);
      const realDeltaXmm = computeRealDeltaXmm(
        effectiveLambda,
        d,
        s.params.L ?? DEFAULT_L
      );
      items.push({
        key: 'delta-x',
        label: '条纹间距 Δx',
        value: `${realDeltaXmm.toFixed(3)} mm`
      });
      const active = s.params.activeInstrument;
      if (active === 'caliper' && leftInstrument) {
        const reading = leftInstrument.view.getReading();
        items.push({
          key: 'caliper',
          label: '游标卡尺读数',
          value: `${(reading * 10).toFixed(3)} mm`
        });
      } else if (active === 'micrometer' && rightInstrument) {
        const reading = rightInstrument.view.getReading();
        items.push({
          key: 'micrometer',
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
      const prevInstrument = sim.getState().params.activeInstrument;
      const before = sim.getState().params;
      const result = sim.setParams(params);
      if (result.step === 6) dataWorkspace.ensure();
      // 光学参数变更即失效已校对数据；同值 diff 为 null，URL 管线重放幂等。
      // 不按 step===6 门控：步骤 1–5 也能改 λ/d/L，会话数据跨步骤存活。
      const opticsReason = opticsChangeReason(before, result);
      if (opticsReason) dataWorkspace.invalidateAll?.(opticsReason);
      // 主画布与仪器画布相互独立：先绘主场景再同步仪器（历史顺序）。
      // wrapAction 会把 syncInstruments 放到 renderAndEmit 之前，此处显式保持旧序。
      base.renderAndEmit();
      syncInstruments();
      syncInstrumentHostAttrs();
      if (
        params.activeInstrument &&
        params.activeInstrument !== prevInstrument
      ) {
        dataWorkspace.syncInstrument(params.activeInstrument);
      }
      base.notify();
      return result;
    },
    render() {
      base.renderAndEmit();
      syncInstruments();
      base.notify();
    },
    reattach() {
      if (sim.getState().params.step !== 6) return;
      // A layout reattach is also an explicit recovery point after a
      // transient instrument module/constructor failure.
      instrumentLoadFailed = false;
      ensureInstrumentCanvases();
      leftInstrument?.view.resize();
      rightInstrument?.view.resize();
      syncInstruments();
    },
    resize() {
      if (sim.getState().params.step === 6) ensureInstrumentCanvases();
      view.resize();
      leftInstrument?.view.resize();
      rightInstrument?.view.resize();
      base.renderAndEmit();
      syncInstruments();
      scheduleInstrumentStageFit();
    },
    setTheme(theme: TeachingTheme) {
      currentTheme = theme;
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
      dataWorkspace.resetSession();
      dataWorkspace.setActive(false);
      disposeInstruments();
      base.dispose();
    },
    reset() {
      dataWorkspace.resetSession();
      dataWorkspace.setActive(false);
      base.reset();
      syncInstruments();
    },
    getReadoutItems,
    getDataWorkspace() {
      return dataWorkspace;
    },
    getStepInfo
  };
}
