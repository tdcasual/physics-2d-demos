import { bootScenePage } from '../../app/scene-bootstrapper';
import { springOscillatorMeta } from './scene.meta';
import { createSpringOscillatorScene } from './scene.entry';
import { createSpringOscillatorControlsV4 } from './controls-v4';

bootScenePage({
  meta: springOscillatorMeta,
  createScene: ({ canvas }) => {
    const scene = createSpringOscillatorScene({
      stageCanvas: canvas
    });
    return scene;
  },
  createControls: ({ mount, scene, onStatus }) => {
    return createSpringOscillatorControlsV4({
      mount,
      scene,
      onStatus
    });
  },
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.38,
    leftMinWidth: 380,
    leftMaxWidth: 960,
    hasGraph: true,
    graphHeight: 0.4,
    controlColumns: 1,
    readoutCollapsed: true
  }
});
