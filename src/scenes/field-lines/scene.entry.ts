import type { TeachingMode } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../types';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createFieldLinesSim,
  seedLineCount,
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
  setN(value: number): void;
  setCustomCharges(q1: number, q2: number): void;
  setParams(next: { n?: number; q1?: number; q2?: number }): {
    n: number;
    q1: number;
    q2: number;
  };
  pickCharge(normX: number, normY: number): number | null;
  moveCharge(index: number, normX: number, normY: number): void;
  addCharge(q: number): void;
  removeCharge(index: number): void;
  getSnapshot(): FieldLinesSnapshot;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createFieldLinesSim({
    scene: 'single',
    n: 3,
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
  let currentHints: DemoRenderHints | undefined = options.demoHints;

  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getSnapshot(),
    onReadout: options.onReadout
  });

  function getReadoutItems(): Array<{
    key: string;
    label: string;
    value: string;
  }> {
    const snapshot = sim.getSnapshot();
    const lines = seedLineCount(snapshot.charges);
    const probes = snapshot.params.n * lines;
    return [
      { key: 'scene', label: '场景', value: sceneLabel(snapshot.params.scene) },
      { key: 'theme', label: '主题', value: themeLabel(currentTheme) },
      { key: 'mode', label: '显示模式', value: modeLabel(currentMode) },
      {
        key: 'n',
        label: '试探次数',
        value: `${snapshot.params.n} 点/条`
      },
      {
        key: 'lines',
        label: '电场线条数',
        value: String(lines)
      },
      {
        key: 'probes',
        label: '试探点总数',
        value: String(probes)
      },
      {
        key: 'count',
        label: '电荷数量',
        value: String(snapshot.charges.length)
      },
      {
        key: 'q1',
        label: '电荷1',
        value: snapshot.charges[0]
          ? `${snapshot.charges[0].q > 0 ? '+' : ''}${snapshot.charges[0].q.toFixed(1)}`
          : '--'
      },
      {
        key: 'q2',
        label: '电荷2',
        value: `${snapshot.params.q2 > 0 ? '+' : ''}${snapshot.params.q2.toFixed(1)}`
      }
    ];
  }

  return {
    ...base,
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      currentMode = mode;
      currentHints = hints ?? currentHints;
      base.setMode(mode, hints);
    },
    setTheme(theme: TeachingTheme): void {
      currentTheme = theme;
      base.setTheme(theme);
    },
    setScene: base.wrapAction((scene: FieldLinesScene): void => {
      sim.setScene(scene);
    }),
    setN: base.wrapAction((value: number): void => {
      sim.setN(value);
    }),
    setCustomCharges: base.wrapAction((q1: number, q2: number): void => {
      sim.setCustomCharges(q1, q2);
    }),
    setParams(next: { n?: number; q1?: number; q2?: number }): {
      n: number;
      q1: number;
      q2: number;
    } {
      if (typeof next.n === 'number' && Number.isFinite(next.n)) {
        sim.setN(next.n);
      }
      if (
        (typeof next.q1 === 'number' && Number.isFinite(next.q1)) ||
        (typeof next.q2 === 'number' && Number.isFinite(next.q2))
      ) {
        const params = sim.getParams();
        if (params.scene !== 'custom') {
          sim.setScene('custom');
        }
        const latest = sim.getParams();
        sim.setCustomCharges(next.q1 ?? latest.q1, next.q2 ?? latest.q2);
      }
      base.renderAndEmit();
      base.notify();
      const after = sim.getParams();
      return { n: after.n, q1: after.q1, q2: after.q2 };
    },
    pickCharge(normX: number, normY: number): number | null {
      const cs =
        currentMode === 'presentation'
          ? (currentHints?.contentScale ?? 1.5)
          : 1;
      return sim.pickCharge(normX, normY, 0.045 * cs);
    },
    moveCharge: base.wrapAction(
      (index: number, normX: number, normY: number): void => {
        sim.setChargePosition(index, normX, normY);
      }
    ),
    addCharge: base.wrapAction((q: number): void => {
      sim.addCharge(q);
    }),
    removeCharge: base.wrapAction((index: number): void => {
      sim.removeCharge(index);
    }),
    getSnapshot(): FieldLinesSnapshot {
      return sim.getSnapshot();
    },
    getReadoutItems
  };
}
