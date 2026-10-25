import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { closedCircuitControlsSchema } from './controls-schema';
import { createClosedCircuitScene } from './scene.entry';
import { closedCircuitMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';

bootScenePage({
  meta: closedCircuitMeta,
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
    if (!canvas) throw new Error('closed-circuit requires a canvas');
    const scene = createClosedCircuitScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      step(dt: number) {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose() {
        scheduler.dispose();
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) =>
    createBoundControls({
      mount,
      schema: closedCircuitControlsSchema,
      scene,
      scheduleRender,
      writeParam
    })
});
