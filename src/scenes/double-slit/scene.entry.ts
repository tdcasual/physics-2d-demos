/**
 * 双缝干涉 — 场景入口
 *
 * 步骤6支持挂载两个仪器组件（干涉读数游标卡尺 + 高精度干涉测微仪）
 */

import type { TeachingTheme, TeachingMode } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createInstrumentHost } from '../../instruments/mount';

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
  validateWavelength,
  FILTERS
} from './scene.sim';
import { createDoubleSlitView } from './scene.view';

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
  getStepInfo(): { id: number; title: string; desc: string };
  setInputLambda(value: number): void;
  verifyWavelength(): { ok: boolean; errorPct: number };
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

  // 标准入口提前创建，避免仪器异步 .then 回调在 TDZ 内引用 base
  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout
  });

  let inputLambda = 532;
  let wavelengthVerification: {
    ok: boolean;
    errorPct: number;
    lambdaNm: number;
  } | null = null;

  function clearWavelengthVerification(): void {
    wavelengthVerification = null;
    view.setVerification(null);
  }

  function setInputLambda(value: number): void {
    inputLambda = value;
  }

  function verifyWavelength(): { ok: boolean; errorPct: number } {
    const result = validateWavelength(
      inputLambda,
      getEffectiveLambda(sim.getState().params)
    );
    wavelengthVerification = { ...result, lambdaNm: inputLambda };
    view.setVerification(wavelengthVerification);
    base.renderAndEmit();
    base.notify();
    return result;
  }

  const placement = {
    top: '30%',
    left: 0,
    width: '100%',
    height: '70%',
    padding: 8
  };
  const instrumentHost = options.canvas
    ? createInstrumentHost({
        attachTo: options.canvas,
        theme: options.theme ?? 'dark',
        cssVariables: {
          '--instrument-justify': 'flex-start',
          '--instrument-align': 'flex-start',
          '--instrument-offset': '100px'
        },
        instruments: [
          {
            id: 'interference-vernier-caliper',
            loadFactory: () =>
              import('../../instruments/interference-vernier-caliper/instrument.entry').then(
                (module) => module.interferenceVernierCaliperFactory
              ),
            placement,
            visible: (p: DoubleSlitParams) =>
              p.step === 6 && p.activeInstrument === 'caliper',
            mapParams: mapCaliperParams,
            viewOptions: { showHints: false }
          },
          {
            id: 'micrometer-eyepiece',
            loadFactory: () =>
              import('../../instruments/micrometer-eyepiece/instrument.entry').then(
                (module) => module.micrometerEyepieceFactory
              ),
            placement,
            visible: (p: DoubleSlitParams) =>
              p.step === 6 && p.activeInstrument === 'micrometer',
            mapParams: mapMicrometerParams,
            viewOptions: { showHints: false }
          }
        ],
        onReadingChange: () => base.notify()
      })
    : null;

  function instrumentPhysics(p: DoubleSlitParams) {
    const wavelength = getEffectiveLambda(p);
    const [r, g, b] = lambdaToRgb(wavelength);
    const deltaX = computeRealDeltaXmm(
      wavelength,
      p.slitDistance,
      p.L ?? DEFAULT_L
    );
    return { r, g, b, deltaX };
  }

  function mapCaliperParams(p: DoubleSlitParams) {
    const physics = instrumentPhysics(p);
    const spacing = computeCaliperFringePx(physics.deltaX);
    return {
      fringeSpacing: spacing,
      fringeColor: `rgba(${physics.r},${physics.g},${physics.b},0.85)`,
      fringeEnvelopeWidth: spacing * 8,
      crosshairAngle: p.crosshairAngle ?? 0,
      viewMode: p.viewMode ?? 'fringe'
    };
  }

  function mapMicrometerParams(p: DoubleSlitParams) {
    const physics = instrumentPhysics(p);
    return {
      stripeSpacing: computeMicrometerStripePx(physics.deltaX),
      stripeColor: `rgb(${physics.r},${physics.g},${physics.b})`,
      zeroOffset: p.micrometerOffset,
      stripeOffset: p.stripeOffset,
      crosshairSpeed: computeMicrometerSpeed(physics.deltaX),
      scaleInverted: true,
      crosshairAngle: p.crosshairAngle ?? 0,
      viewMode: p.viewMode ?? 'fringe'
    };
  }

  const syncInstruments = () => instrumentHost?.sync(sim.getState().params);

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
    const items = [
      { key: 'step', label: '当前步骤', value: `${step} / 6` },
      { key: 'light', label: '光源', value: lightLabel },
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
      const active = s.params.activeInstrument;
      const measuredDeltaXmm =
        active === 'caliper'
          ? instrumentHost?.getReading('interference-vernier-caliper')
          : instrumentHost?.getReading('micrometer-eyepiece');
      const normalizedDeltaXmm =
        measuredDeltaXmm === undefined
          ? null
          : active === 'caliper'
            ? measuredDeltaXmm * 10
            : measuredDeltaXmm;
      items.push({
        key: 'delta-x',
        label: '测得 Δx',
        value:
          normalizedDeltaXmm === null
            ? '等待仪器读数'
            : `${normalizedDeltaXmm.toFixed(3)} mm`
      });
      items.push({
        key: 'lambda-check',
        label: '波长校验',
        value: wavelengthVerification
          ? `${wavelengthVerification.ok ? '✓' : '✗'} 相对误差 ${wavelengthVerification.errorPct.toFixed(2)}%`
          : '尚未校验'
      });
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
    reset() {
      clearWavelengthVerification();
      base.reset();
      syncInstruments();
    },
    getState() {
      return sim.getState();
    },
    setParams(params: Partial<DoubleSlitParams>): DoubleSlitParams {
      if (
        params.lambda !== undefined ||
        params.slitDistance !== undefined ||
        params.L !== undefined ||
        params.lightMode !== undefined ||
        params.filterColor !== undefined
      ) {
        clearWavelengthVerification();
      }
      const result = sim.setParams(params);
      // 主画布与仪器画布相互独立：先绘主场景再同步仪器（历史顺序）。
      // wrapAction 会把 syncInstruments 放到 renderAndEmit 之前，此处显式保持旧序。
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
      instrumentHost?.resize();
      base.renderAndEmit();
      syncInstruments();
    },
    setTheme(theme: TeachingTheme) {
      view.setTheme(theme);
      instrumentHost?.setTheme(theme);
      base.renderAndEmit();
      syncInstruments();
      base.notify();
    },
    dispose() {
      instrumentHost?.dispose();
      base.dispose();
    },
    setInputLambda,
    verifyWavelength,
    getReadoutItems,
    getStepInfo
  };
}
