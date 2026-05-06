import type { TeachingMode } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../types';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createVtIntegralSim,
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

export function createVtIntegralScene(
  options: CreateVtIntegralSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  setTheme(theme: TeachingTheme): void;
  setScene(scene: VtScene): void;
  setRects(value: number): void;
  setTime(value: number): void;
  setMethod(value: VtMethod): void;
  setCurveAmplitude(value: number): void;
  setCircleN(value: number): void;
  getSnapshot(): VtIntegralSnapshot;
  getReadoutItems(): Array<{ label: string; value: string }>;
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

  function getReadoutItems(): Array<{ label: string; value: string }> {
    const snapshot = sim.getSnapshot();
    if (snapshot.params.scene === 'scene1') {
      return [
        { label: '场景', value: sceneLabel(snapshot.params.scene) },
        { label: '显示模式', value: modeLabel(currentMode) },
        { label: '矩形总面积', value: snapshot.metrics.rectArea.toFixed(4) },
        { label: '积分面积', value: snapshot.metrics.trueArea.toFixed(4) },
        { label: '绝对误差', value: snapshot.metrics.absErr.toFixed(4) },
        { label: '相对误差', value: `${(snapshot.metrics.relErr * 100).toFixed(2)}%` }
      ];
    }
    if (snapshot.params.scene === 'scene2') {
      return [
        { label: '场景', value: sceneLabel(snapshot.params.scene) },
        { label: '显示模式', value: modeLabel(currentMode) },
        { label: '曲线振幅', value: snapshot.params.curveAmplitude.toFixed(2) },
        { label: '曲线长度', value: snapshot.metrics.curveLength.toFixed(3) },
        { label: '直线距离', value: snapshot.metrics.lineDistance.toFixed(3) }
      ];
    }
    // scene3
    return [
      { label: '场景', value: sceneLabel(snapshot.params.scene) },
      { label: '显示模式', value: modeLabel(currentMode) },
      { label: '边数 n', value: String(snapshot.params.circleN) },
      { label: '多边形周长', value: (2 * snapshot.params.circleN * Math.sin(Math.PI / snapshot.params.circleN)).toFixed(4) },
      { label: '圆周长 (2π)', value: (2 * Math.PI).toFixed(4) },
      { label: '周长差', value: snapshot.metrics.circumferenceDiff.toFixed(4) }
    ];
  }

  return {
    ...base,
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      currentMode = mode;
      base.setMode(mode, hints);
    },
    setScene(scene: VtScene): void {
      sim.setScene(scene);
      base.renderAndEmit();
      base.notify();
    },
    setRects(value: number): void {
      sim.setRects(value);
      base.renderAndEmit();
      base.notify();
    },
    setTime(value: number): void {
      sim.setTime(value);
      base.renderAndEmit();
      base.notify();
    },
    setMethod(value: VtMethod): void {
      sim.setMethod(value);
      base.renderAndEmit();
      base.notify();
    },
    setCurveAmplitude(value: number): void {
      sim.setCurveAmplitude(value);
      base.renderAndEmit();
      base.notify();
    },
    setCircleN(value: number): void {
      sim.setCircleN(value);
      base.renderAndEmit();
      base.notify();
    },
    getSnapshot(): VtIntegralSnapshot {
      return sim.getSnapshot();
    },
    getReadoutItems
  };
}
