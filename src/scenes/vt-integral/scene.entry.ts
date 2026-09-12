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

export type CreateVtIntegralSceneOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  theme?: TeachingTheme;
  onReadout?: (snapshot: VtIntegralSnapshot) => void;
};

function sceneLabel(scene: VtIntegralSnapshot['params']['scene']): string {
  if (scene === 'scene1') return '场景一：v-t积分';
  if (scene === 'scene2') return '场景二：曲线长度';
  return '场景三：圆周逼近';
}

function modeLabel(mode: TeachingMode): string {
  return mode === 'presentation' ? '演示模式' : '标准模式';
}

function coerceVtScene(value: number | string): VtScene {
  if (value === 'scene2' || value === 2 || value === '2') return 'scene2';
  if (value === 'scene3' || value === 3 || value === '3') return 'scene3';
  return 'scene1';
}

function vtUrlParams(snapshot: VtIntegralSnapshot): {
  n: number;
  scene: number;
} {
  return {
    n: snapshot.params.rects,
    scene: Number(snapshot.params.scene.replace('scene', '')) || 1
  };
}

export function createVtIntegralScene(
  options: CreateVtIntegralSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  setTheme(theme: TeachingTheme): void;
  setScene(scene: VtScene): void;
  setParams(next: { n?: number; scene?: number | string }): {
    n: number;
    scene: number;
  };
  getParams(): { n: number; scene: number };
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
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createVtIntegralSim();
  const view = createVtIntegralView({
    canvas: options.canvas,
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints,
    theme: options.theme ?? 'dark'
  });

  let currentMode: TeachingMode = options.mode ?? 'normal';

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

  function getReadoutItems(): Array<{
    key: string;
    label: string;
    value: string;
  }> {
    const snapshot = sim.getSnapshot();
    if (snapshot.params.scene === 'scene1') {
      return [
        {
          key: 'scene',
          label: '场景',
          value: sceneLabel(snapshot.params.scene)
        },
        { key: 'mode', label: '显示模式', value: modeLabel(currentMode) },
        {
          key: 'rect-area',
          label: '矩形总面积',
          value: snapshot.metrics.rectArea.toFixed(4)
        },
        {
          key: 'true-area',
          label: '积分面积',
          value: snapshot.metrics.trueArea.toFixed(4)
        },
        {
          key: 'abs-err',
          label: '绝对误差',
          value: snapshot.metrics.absErr.toFixed(4)
        },
        {
          key: 'rel-err',
          label: '相对误差',
          value: `${(snapshot.metrics.relErr * 100).toFixed(2)}%`
        }
      ];
    }
    if (snapshot.params.scene === 'scene2') {
      return [
        {
          key: 'scene',
          label: '场景',
          value: sceneLabel(snapshot.params.scene)
        },
        { key: 'mode', label: '显示模式', value: modeLabel(currentMode) },
        {
          key: 'line',
          label: '直线 AB',
          value: snapshot.metrics.lineDistance.toFixed(4)
        },
        {
          key: 'curve',
          label: '轨迹长',
          value: snapshot.metrics.curveLength.toFixed(4)
        },
        {
          key: 'diff',
          label: '差值',
          value: Math.abs(
            snapshot.metrics.curveLength - snapshot.metrics.lineDistance
          ).toFixed(4)
        }
      ];
    }
    // scene3
    return [
      { key: 'scene', label: '场景', value: sceneLabel(snapshot.params.scene) },
      { key: 'mode', label: '显示模式', value: modeLabel(currentMode) },
      { key: 'n', label: '边数 n', value: String(snapshot.params.circleN) },
      {
        key: 'poly',
        label: '多边形周长',
        value: (
          2 *
          snapshot.params.circleN *
          Math.sin(Math.PI / snapshot.params.circleN)
        ).toFixed(4)
      },
      { key: 'circle', label: '圆周长 (2π)', value: (2 * Math.PI).toFixed(4) },
      {
        key: 'circ-diff',
        label: '周长差',
        value: snapshot.metrics.circumferenceDiff.toFixed(4)
      }
    ];
  }

  return {
    ...base,
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      currentMode = mode;
      base.setMode(mode, hints);
    },
    setScene: base.wrapAction((scene: VtScene): void => {
      sim.setScene(scene);
    }),
    setParams(next: { n?: number; scene?: number | string }): {
      n: number;
      scene: number;
    } {
      if (next.scene !== undefined) {
        sim.setScene(coerceVtScene(next.scene));
      }
      if (typeof next.n === 'number' && Number.isFinite(next.n)) {
        sim.setRects(next.n);
      }
      base.renderAndEmit();
      base.notify();
      return vtUrlParams(sim.getSnapshot());
    },
    getParams(): { n: number; scene: number } {
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
    getReadoutItems
  };
}
