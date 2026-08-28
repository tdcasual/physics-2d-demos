import { bootScenePage } from '../../app/scene-bootstrapper';
import { springOscillatorMeta } from './scene.meta';
import { createSpringOscillatorScene } from './scene.entry';
import { createSpringOscillatorControls } from './controls';

bootScenePage({
  meta: springOscillatorMeta,
  createScene: ({ canvas, theme, mode, demoHints }) => {
    const scene = createSpringOscillatorScene({
      stageCanvas: canvas,
      theme,
      mode,
      demoHints
    });
    return scene;
  },
  createControls: ({ mount, scene, onStatus, scheduleRender }) => {
    return createSpringOscillatorControls({
      mount,
      scene,
      onStatus,
      scheduleRender
    });
  },
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.38,
    leftMinWidth: 380,
    leftMaxWidth: 960,
    hasGraph: true,
    controlColumns: 'auto',
    readoutCollapsed: true
  }
});
