import { bootScenePage, type SceneInstance } from '../../app/scene-bootstrapper';
import type { ReadoutItem } from '../../app/layouts/types';
import { emfAnalogyMeta } from './scene.meta';
import { createEmfAnalogyScene } from './scene.entry';
import { createEmfAnalogyControlsV4 } from './controls-v4';
import type { EmfAnalogySnapshot } from './scene.sim';

function formatReadout(snapshot: EmfAnalogySnapshot): ReadoutItem[] {
  return [
    { label: '系统状态', value: snapshot.state.isSystemOn ? '通路' : '断路' },
    { label: '开度', value: `${Math.round(snapshot.state.tapOpening * 100)}%` },
    { label: '电流 I', value: `${snapshot.state.currentI.toFixed(2)} A` },
    { label: '内阻压降 Ir', value: `${snapshot.state.internalDrop.toFixed(2)} V` },
    { label: '路端电压 U', value: `${snapshot.state.terminalVoltage.toFixed(2)} V` }
  ];
}

bootScenePage({
  meta: emfAnalogyMeta,
  createScene: ({ canvas, theme, mode }) => {
    const scene = createEmfAnalogyScene({
      canvas,
      mode,
      theme,
      onReadout: () => {}
    });
    return {
      ...scene,
      getState() {
        return scene.getSnapshot();
      },
      startAll() {
        (scene as unknown as { start(): void }).start();
      },
      pauseAll() {
        (scene as unknown as { stop(): void }).stop();
      },
      getTransportState() {
        return { isPlaying: false, speed: 1 };
      }
    } as SceneInstance;
  },
  createControls: ({ mount, scene, onStatus }) => {
    return createEmfAnalogyControlsV4({
      mount,
      onSetSystemOn: (on) => {
        (scene as unknown as { setSystemOn(on: boolean): void }).setSystemOn(on);
        scene.render();
        if (on) {
          (scene as SceneInstance).startAll?.();
        } else {
          (scene as SceneInstance).pauseAll?.();
        }
      },
      onSetTapOpening: (opening) => {
        (scene as unknown as { setTapOpening(opening: number): void }).setTapOpening(opening);
        scene.render();
        (scene as SceneInstance).startAll?.();
      },
      onStatus
    });
  },
  formatReadout: (state) => formatReadout(state as EmfAnalogySnapshot),
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.30,
    hasGraph: false,
    controlColumns: 1,
    readoutCollapsed: true
  }
});
