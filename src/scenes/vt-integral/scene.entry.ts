import type { TeachingMode } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../types';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createVtIntegralSim,
  type VtCurveKind,
  type VtIntegralSnapshot,
  type VtMethod,
  type VtScene
} from './scene.sim';
import { createVtIntegralView } from './scene.view';
import {
  decodeVtRule,
  decodeVtScene,
  encodeVtRule,
  encodeVtScene,
  vtRuleLabel
} from './scene-values';

export type CreateVtIntegralSceneOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  theme?: TeachingTheme;
  onReadout?: (snapshot: VtIntegralSnapshot) => void;
};

/** URL / 控件投影用的数字编码参数（与 meta.defaultParams 键一致）。 */
export type VtUrlParams = { n: number; scene: number; rule: number };

type ReadoutItem = { key: string; label: string; value: string };

function sceneLabel(scene: VtIntegralSnapshot['params']['scene']): string {
  if (scene === 'scene1') return '场景一：v-t积分';
  if (scene === 'scene2') return '场景二：曲线长度';
  return '场景三：圆周逼近';
}

/** 带符号误差的定性判断：偏小 / 偏大 / 精确（|Δ| < 5e-5 m 视为精确）。 */
function errorTrend(signedErr: number): string {
  if (Math.abs(signedErr) < 5e-5) return '精确';
  return signedErr < 0 ? '偏小' : '偏大';
}

function formatSigned(value: number, digits: number): string {
  const text = Math.abs(value).toFixed(digits);
  if (Number(text) === 0) return text;
  return value < 0 ? `−${text}` : `+${text}`;
}

function vtUrlParams(snapshot: VtIntegralSnapshot): VtUrlParams {
  return {
    n: snapshot.params.rects,
    scene: encodeVtScene(snapshot.params.scene),
    rule: encodeVtRule(snapshot.params.method)
  };
}

export function buildVtReadoutItems(
  snapshot: VtIntegralSnapshot
): ReadoutItem[] {
  const { params, metrics } = snapshot;
  const scene: ReadoutItem = {
    key: 'scene',
    label: '场景',
    value: sceneLabel(params.scene)
  };
  if (params.scene === 'scene1') {
    const rule = vtRuleLabel(params.method);
    return [
      scene,
      {
        key: 'rect-area',
        label: `${rule}矩形和 S`,
        value: `${metrics.rectArea.toFixed(4)} m（${errorTrend(metrics.signedErr)}）`
      },
      {
        key: 'true-area',
        label: '位移 x（v-t 面积）',
        value: `${metrics.trueArea.toFixed(4)} m`
      },
      {
        key: 'abs-err',
        label: '误差 S − x',
        value: `${formatSigned(metrics.signedErr, 4)} m`
      },
      {
        key: 'rel-err',
        label: '相对误差',
        value: `${(metrics.relErr * 100).toFixed(2)}%`
      }
    ];
  }
  if (params.scene === 'scene2') {
    return [
      scene,
      {
        key: 'line',
        label: '直线 AB',
        value: metrics.lineDistance.toFixed(4)
      },
      {
        key: 'curve',
        label: '轨迹长',
        value: metrics.curveLength.toFixed(4)
      },
      {
        key: 'diff',
        label: '差值',
        value: Math.abs(metrics.curveLength - metrics.lineDistance).toFixed(4)
      }
    ];
  }
  return [
    scene,
    { key: 'n', label: '边数 n', value: String(params.circleN) },
    {
      key: 'poly',
      label: '多边形周长',
      value: metrics.polygonPerimeter.toFixed(4)
    },
    { key: 'circle', label: '圆周长 (2π)', value: (2 * Math.PI).toFixed(4) },
    {
      key: 'circ-diff',
      label: '周长差',
      value: metrics.circumferenceDiff.toFixed(4)
    }
  ];
}

export function createVtIntegralScene(
  options: CreateVtIntegralSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  setTheme(theme: TeachingTheme): void;
  setScene(scene: VtScene): void;
  setParams(next: {
    n?: number;
    scene?: number | string;
    rule?: number | string;
  }): VtUrlParams;
  getParams(): VtUrlParams;
  setRects(value: number): void;
  setTime(value: number): void;
  setMethod(value: VtMethod): void;
  setCurveKind(value: VtCurveKind): void;
  setCurveAmplitude(value: number): void;
  setCircleN(value: number): void;
  setDivision(value: number): void;
  setSurfaceN(value: number): void;
  setPointA(value: number): void;
  setPointB(value: number): void;
  getSnapshot(): VtIntegralSnapshot;
  getReadoutItems(): ReadoutItem[];
  subscribe(listener: () => void): () => void;
} {
  const sim = createVtIntegralSim();
  const view = createVtIntegralView({
    canvas: options.canvas,
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints,
    theme: options.theme ?? 'dark'
  });

  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getSnapshot(),
    onReadout: options.onReadout
  });
  view.setOnPointDrag((id, x) => {
    if (id === 'A') sim.setPointA(x);
    else sim.setPointB(x);
    base.renderAndEmit();
    base.notify();
  });

  return {
    ...base,
    setScene: base.wrapAction((scene: VtScene): void => {
      sim.setScene(scene);
    }),
    setParams(next: {
      n?: number;
      scene?: number | string;
      rule?: number | string;
    }): VtUrlParams {
      if (next.scene !== undefined) {
        sim.setScene(decodeVtScene(next.scene));
      }
      if (typeof next.n === 'number' && Number.isFinite(next.n)) {
        sim.setRects(next.n);
      }
      if (next.rule !== undefined) {
        sim.setMethod(decodeVtRule(next.rule));
      }
      base.renderAndEmit();
      base.notify();
      return vtUrlParams(sim.getSnapshot());
    },
    getParams(): VtUrlParams {
      return vtUrlParams(sim.getSnapshot());
    },
    setRects: base.wrapAction((value: number): void => {
      sim.setRects(value);
    }),
    setTime: base.wrapAction((value: number): void => {
      sim.setTime(value);
    }),
    setMethod: base.wrapAction((value: VtMethod): void => {
      sim.setMethod(value);
    }),
    setCurveKind: base.wrapAction((value: VtCurveKind): void => {
      sim.setCurveKind(value);
    }),
    setCurveAmplitude: base.wrapAction((value: number): void => {
      sim.setCurveAmplitude(value);
    }),
    setCircleN: base.wrapAction((value: number): void => {
      sim.setCircleN(value);
    }),
    setDivision: base.wrapAction((value: number): void => {
      sim.setDivision(value);
    }),
    setSurfaceN: base.wrapAction((value: number): void => {
      sim.setSurfaceN(value);
    }),
    setPointA: base.wrapAction((value: number): void => {
      sim.setPointA(value);
    }),
    setPointB: base.wrapAction((value: number): void => {
      sim.setPointB(value);
    }),
    getSnapshot(): VtIntegralSnapshot {
      return sim.getSnapshot();
    },
    getReadoutItems: () => buildVtReadoutItems(sim.getSnapshot())
  };
}
