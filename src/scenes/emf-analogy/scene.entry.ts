import type { TeachingMode } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../types';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createEmfAnalogySim, type EmfAnalogySnapshot } from './scene.sim';
import { createEmfAnalogyView, type EmfViewMode } from './scene.view';

export type CreateEmfAnalogySceneOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  theme?: TeachingTheme;
  onReadout?: (snapshot: EmfAnalogySnapshot) => void;
};

function formatReadout(
  snapshot: EmfAnalogySnapshot
): Array<{ label: string; value: string }> {
  return [
    { label: '系统状态', value: snapshot.state.isSystemOn ? '通路' : '断路' },
    {
      label: '外电阻 R',
      value:
        snapshot.state.externalR === Infinity
          ? '∞ Ω'
          : `${snapshot.state.externalR.toFixed(1)} Ω`
    },
    { label: '电流 I', value: `${snapshot.state.currentI.toFixed(2)} A` },
    {
      label: '内阻压降 Ir',
      value: `${snapshot.state.internalDrop.toFixed(2)} V`
    },
    {
      label: '路端电压 U',
      value: `${snapshot.state.terminalVoltage.toFixed(2)} V`
    }
  ];
}

export function createEmfAnalogyScene(
  options: CreateEmfAnalogySceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setMode(mode: TeachingMode): void;
  setTheme(theme: TeachingTheme): void;
  setSystemOn(on: boolean): void;
  setTapOpening(opening: number): void;
  incrementOpening(step?: number): void;
  setView(view: EmfViewMode): void;
  getView(): EmfViewMode;
  getSnapshot(): EmfAnalogySnapshot;
  getReadoutItems(): Array<{ label: string; value: string }>;
  startAll(): void;
  pauseAll(): void;
  subscribe(listener: () => void): () => void;
} {
  const sim = createEmfAnalogySim();
  const view = createEmfAnalogyView({
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

  return {
    ...base,
    setSystemOn(on: boolean): void {
      sim.setSystemOn(on);
      base.renderAndEmit();
      base.notify();
    },
    setTapOpening(opening: number): void {
      sim.setTapOpening(opening);
      base.renderAndEmit();
      base.notify();
    },
    incrementOpening(step = 0.05): void {
      sim.incrementOpening(step);
      base.renderAndEmit();
      base.notify();
    },
    setView(viewMode: EmfViewMode): void {
      view.setView(viewMode);
      base.renderAndEmit();
      base.notify();
    },
    getView(): EmfViewMode {
      return view.getView();
    },
    getSnapshot(): EmfAnalogySnapshot {
      return sim.getSnapshot();
    },
    getReadoutItems() {
      return formatReadout(sim.getSnapshot());
    },
    startAll(): void {
      // 播放循环由 scene-shell 驱动，这里只需重绘并同步读数
      base.renderAndEmit();
      base.notify();
    },
    pauseAll(): void {
      base.renderAndEmit();
      base.notify();
    }
  };
}
