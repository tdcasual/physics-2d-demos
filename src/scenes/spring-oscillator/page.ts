import { bootScenePage } from '../../app/scene-bootstrapper';
import { springOscillatorMeta } from './scene.meta';
import { createSpringOscillatorScene } from './scene.entry';
import { createSpringOscillatorControls } from './controls';

bootScenePage({
  meta: springOscillatorMeta,
  createScene: ({ canvas }) => {
    const scene = createSpringOscillatorScene({
      stageCanvas: canvas
    });
    return scene;
  },
  createControls: ({ mount, scene, onStatus }) => {
    return createSpringOscillatorControls({
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
