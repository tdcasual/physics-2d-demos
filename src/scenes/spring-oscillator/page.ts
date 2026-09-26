import { bootScenePage } from '../../app/scene-bootstrapper';
import { springOscillatorMeta } from './scene.meta';
import { createSpringOscillatorScene } from './scene.entry';
import {
  createSpringOscillatorControls,
  type SpringOscillatorControlsUiDeps
} from './controls';
import { createControlCard } from '../../ui/components/ControlCard';

// ui 工厂注入：场景非 page 模块不得依赖 ui 层（debt-ledger A2）。
const controlsUi: SpringOscillatorControlsUiDeps = { createControlCard };

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
      scheduleRender,
      ui: controlsUi
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
