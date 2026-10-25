import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { parallelCapacitorControlsSchema } from './controls-schema';
import { parallelCapacitorMeta } from './scene.meta';
import { createParallelCapacitorScene } from './scene.entry';
import { createBoundControls } from '../../ui/components/bound-controls';
bootScenePage({
  meta: parallelCapacitorMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('parallel-capacitor requires a canvas');
    const scene = createParallelCapacitorScene({
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
      schema: parallelCapacitorControlsSchema,
      scene,
      scheduleRender,
      writeParam
    })
});
