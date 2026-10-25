import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { ringPendulumControlsSchema } from './controls-schema';
import { createRingPendulumScene } from './scene.entry';
import { ringPendulumMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';
bootScenePage({
  meta: ringPendulumMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '动量读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('momentum-ring-pendulum requires a canvas');
    const scene = createRingPendulumScene({ canvas, theme, mode, demoHints });
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
      schema: ringPendulumControlsSchema,
      scene,
      scheduleRender,
      writeParam
    })
});
