import { bootScenePage, type SceneInstance } from '../../app/scene-bootstrapper';
import type { ReadoutItem } from '../../app/layouts/types';
import { electrificationMeta } from './scene.meta';
import { createElectrificationScene } from './scene.entry';
import { createElectrificationControlsV4 } from './controls-v4';
import type { ElectrificationSnapshot } from './scene.sim';

function formatReadout(snapshot: ElectrificationSnapshot): ReadoutItem[] {
  return [
    { label: '场景', value: snapshot.state.scene === 'friction' ? '摩擦起电' : snapshot.state.scene === 'induction' ? '感应起电' : '接触起电' },
    { label: '下一步动作', value: snapshot.state.nextActionLabel },
    { label: '说明', value: snapshot.state.explanation }
  ];
}

bootScenePage({
  meta: electrificationMeta,
  createScene: ({ canvas, theme, mode }) => {
    const scene = createElectrificationScene({
      canvas,
      mode,
      theme,
      onReadout: () => {}
    });
    let _listener: (() => void) | null = null;
    return {
      ...scene,
      getState() {
        return scene.getSnapshot();
      },
      getTransportState() {
        return { isPlaying: false, speed: 1 };
      },
      subscribe(listener: () => void) {
        _listener = listener;
        return () => { _listener = null; };
      }
    } as SceneInstance;
  },
  createControls: ({ mount, scene, onStatus }) => {
    const controls = createElectrificationControlsV4({
      mount,
      initialScene: 'friction',
      onSetScene: (nextScene: string) => {
        (scene as unknown as { setScene(s: string): void }).setScene(nextScene);
        scene.render();
        (controls as unknown as { setActiveScene(s: string): void }).setActiveScene(nextScene);
      },
      onRunStep: () => {
        (scene as unknown as { runSceneAction(): void }).runSceneAction();
        scene.render();
      },
      onReset: () => {
        scene.reset?.();
      },
      onStatus
    }) as unknown as { setActiveScene(s: string): void; dispose(): void };

    return controls;
  },
  formatReadout: (state) => formatReadout(state as ElectrificationSnapshot),
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.35,
    hasGraph: false,
    controlColumns: 1,
    readoutCollapsed: false
  }
});
