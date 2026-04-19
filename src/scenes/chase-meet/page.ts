import { bootScenePage, type SceneInstance } from '../../app/scene-bootstrapper';
import type { ReadoutItem, Theme } from '../../app/layouts/types';
import type { TeachingMode } from '../../app/teaching-standards';
import { chaseMeetMeta } from './scene.meta';
import { createChaseMeetScene } from './scene.entry';
import { createChaseMeetControlsV4 } from './controls-v4';
import type { ChaseMeetSnapshot, ChaseMeetParams } from './scene.sim';

function formatReadout(
  snapshot: ChaseMeetSnapshot,
  isPlaying: boolean,
  mode: TeachingMode
): ReadoutItem[] {
  return [
    { label: '显示模式', value: mode === 'presentation' ? '演示模式' : '标准模式' },
    { label: '动画状态', value: isPlaying ? '运行中' : '已暂停' },
    { label: '当前时间', value: `${snapshot.state.t.toFixed(2)} s` },
    { label: '当前距离', value: `${snapshot.state.distance.toFixed(2)} m` },
    { label: '相遇信息', value: snapshot.state.meetMessage },
    { label: 'T / Δt', value: `${snapshot.params.totalTime.toFixed(2)} / ${snapshot.params.dt.toFixed(3)}` },
    { label: 'vA(t)', value: snapshot.params.vExprA },
    { label: 'vB(t)', value: snapshot.params.vExprB }
  ];
}

bootScenePage({
  meta: chaseMeetMeta,
  createScene: ({ canvas, theme, mode }) => {
    const stageSlot = canvas.parentElement;
    if (!stageSlot) {
      throw new Error('Missing animation container for chase-meet');
    }

    const scene = createChaseMeetScene({
      stageSlot,
      mode,
      theme,
      onReadout: () => {}
    });

    let currentMode = mode;
    let isPlaying = false;

    const originalDispose = scene.dispose.bind(scene);
    const originalSetParams = scene.setParams.bind(scene);
    const originalReset = scene.reset.bind(scene);
    let _listener: (() => void) | null = null;

    return {
      ...scene,
      getState() {
        return scene.getSnapshot();
      },
      getReadoutItems() {
        return formatReadout(scene.getSnapshot(), isPlaying, currentMode);
      },
      getTransportState() {
        return { isPlaying, speed: 1 };
      },
      subscribe(listener: () => void) {
        _listener = listener;
        return () => { _listener = null; };
      },
      setMode(m: 'normal' | 'presentation') {
        currentMode = m;
        scene.setMode(m);
        _listener?.();
      },
      setParams(next: Partial<ChaseMeetParams>) {
        const result = originalSetParams(next);
        originalReset();
        _listener?.();
        return result;
      },
      startAll() {
        isPlaying = true;
        _listener?.();
      },
      pauseAll() {
        isPlaying = false;
        _listener?.();
      },
      reset() {
        isPlaying = false;
        originalReset();
        _listener?.();
      },
      dispose() {
        originalDispose();
      }
    } as SceneInstance;
  },
  createControls: ({ mount, scene, onStatus }) => {
    return createChaseMeetControlsV4({
      mount,
      initialParams: (scene as unknown as { getParams(): { totalTime: number; dt: number; x0A: number; x0B: number; vExprA: string; vExprB: string } }).getParams(),
      onApplyParams: (next) => {
        (scene as unknown as { setParams(n: Partial<ChaseMeetParams>): unknown }).setParams(next);
        onStatus?.('参数已更新');
      },
      onStatus
    });
  },
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    hasGraph: false,
    controlColumns: 1,
    readoutCollapsed: true
  }
});
