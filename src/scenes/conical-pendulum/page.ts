import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { conicalPendulumControlsSchema } from './controls-schema';
import { createConicalPendulumScene } from './scene.entry';
import { conicalPendulumMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';
import { resetSceneAndControls } from '../../app/control-projection';

bootScenePage({
  meta: conicalPendulumMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '圆锥摆数据',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('conical-pendulum requires a canvas');
    const scene = createConicalPendulumScene({
      canvas,
      theme,
      mode,
      demoHints
    });
    const scheduler = createRenderScheduler(() => scene.render());
    return {
      ...scene,
      step(dt: number) {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose() {
        scheduler.dispose();
        scene.dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) =>
    createBoundControls({
      mount,
      schema: conicalPendulumControlsSchema,
      scene,
      scheduleRender,
      writeParam,
      onAction: (key, renderer) => {
        if (key === 'reset') resetSceneAndControls(scene, renderer, writeParam);
      }
    })
});
