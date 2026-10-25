import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { locomotiveControlsSchema } from './controls-schema';
import { createLocomotiveScene } from './scene.entry';
import { locomotiveMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';
import { resetSceneAndControls } from '../../app/control-projection';

bootScenePage({
  meta: locomotiveMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '启动数据',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('locomotive-power requires a canvas');
    const scene = createLocomotiveScene({ canvas, theme, mode, demoHints });
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
      schema: locomotiveControlsSchema,
      scene,
      scheduleRender,
      writeParam,
      onAction: (key, renderer) => {
        if (key === 'reset') resetSceneAndControls(scene, renderer, writeParam);
      }
    })
});
