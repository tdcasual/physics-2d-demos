import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { lightbulbControlsSchema } from './controls-schema';
import { createLightbulbScene } from './scene.entry';
import { lightbulbMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';

bootScenePage({
  meta: lightbulbMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '实验读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('lightbulb-iv-curve requires a canvas');
    const scene = createLightbulbScene({ canvas, theme, mode, demoHints });
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
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    return createBoundControls({
      mount,
      schema: lightbulbControlsSchema,
      scene,
      scheduleRender,
      writeParam,
      onAction: (key) => {
        if (key === 'recordPoint') scene.recordPoint();
        else if (key === 'resetCurve') scene.resetCurve();
        render();
      }
    });
  }
});
