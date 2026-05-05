import type { TeachingMode } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../types';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createFieldLinesSim,
  type FieldLinesScene,
  type FieldLinesSnapshot
} from './scene.sim';
import { createFieldLinesView } from './scene.view';

export type CreateFieldLinesSceneOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  theme?: TeachingTheme;
  onReadout?: (snapshot: FieldLinesSnapshot) => void;
};

function sceneLabel(scene: FieldLinesScene): string {
  if (scene === 'single') return '单个电荷';
  if (scene === 'like') return '同种电荷';
  if (scene === 'unlike') return '异种电荷';
  return '自定义双电荷';
}

function themeLabel(theme: TeachingTheme): string {
  return theme === 'dark' ? '夜间' : '白天';
}

function modeLabel(mode: TeachingMode): string {
  return mode === 'presentation' ? '演示模式' : '标准模式';
}

export function createFieldLinesScene(
  options: CreateFieldLinesSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  setTheme(theme: TeachingTheme): void;
  setScene(scene: FieldLinesScene): void;
  setDensity(value: number): void;
  setCustomCharges(q1: number, q2: number): void;
  pickCharge(normX: number, normY: number): number | null;
  moveCharge(index: number, normX: number, normY: number): void;
  addCharge(q: number): void;
  removeCharge(index: number): void;
  getSnapshot(): FieldLinesSnapshot;
  getReadoutItems(): Array<{ label: string; value: string }>;
} {
  const sim = createFieldLinesSim({
    scene: 'single',
    density: 10,
    q1: 1,
    q2: -1
  });
  const view = createFieldLinesView({
    canvas: options.canvas,
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints,
    theme: options.theme ?? 'dark'
  });

  let currentMode: TeachingMode = options.mode ?? 'normal';
  let currentTheme: TeachingTheme = options.theme ?? 'dark';

  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getSnapshot(),
    onReadout: options.onReadout
  });

  function getReadoutItems(): Array<{ label: string; value: string }> {
    const snapshot = sim.getSnapshot();
    return [
      { label: '场景', value: sceneLabel(snapshot.params.scene) },
      { label: '主题', value: themeLabel(currentTheme) },
      { label: '显示模式', value: modeLabel(currentMode) },
      { label: '矢量密度', value: String(Math.round(snapshot.params.density)) },
      { label: '电荷数量', value: String(snapshot.charges.length) },
      {
        label: '电荷1',
        value: snapshot.charges[0]
          ? `${snapshot.charges[0].q > 0 ? '+' : ''}${snapshot.charges[0].q.toFixed(1)}`
          : '--'
      },
      {
        label: '电荷2',
        value: `${snapshot.params.q2 > 0 ? '+' : ''}${snapshot.params.q2.toFixed(1)}`
      }
    ];
  }

  return {
    ...base,
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      currentMode = mode;
      base.setMode(mode, hints);
    },
    setTheme(theme: TeachingTheme): void {
      currentTheme = theme;
      base.setTheme(theme);
    },
    setScene(scene: FieldLinesScene): void {
      sim.setScene(scene);
    },
    setDensity(value: number): void {
      sim.setDensity(value);
    },
    setCustomCharges(q1: number, q2: number): void {
      sim.setCustomCharges(q1, q2);
    },
    pickCharge(normX: number, normY: number): number | null {
      return sim.pickCharge(normX, normY);
    },
    moveCharge(index: number, normX: number, normY: number): void {
      sim.setChargePosition(index, normX, normY);
    },
    addCharge(q: number): void {
      sim.addCharge(q);
    },
    removeCharge(index: number): void {
      sim.removeCharge(index);
    },
    getSnapshot(): FieldLinesSnapshot {
      return sim.getSnapshot();
    },
    getReadoutItems
  };
}
