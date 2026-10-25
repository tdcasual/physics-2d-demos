import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { feederControlsSchema } from './controls-schema';
import { createFeederScene } from './scene.entry';
import { feederMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';

bootScenePage({
  meta: feederMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '实时数据看板',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('auto-water-feeder requires a canvas');
    const scene = createFeederScene({ canvas, theme, mode, demoHints });
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
      schema: feederControlsSchema,
      scene,
      scheduleRender,
      writeParam,
      onAction: (key, renderer) => {
        const values: Record<string, number> = {
          emptyTank: 0.25,
          justFloat: 0.9,
          componentLimit: 2.2
        };
        const waterDepth = values[key];
        if (waterDepth === undefined) return;
        scene.setParams({ waterDepth });
        renderer.setValue('waterDepth', waterDepth);
        render();
        writeParam?.('waterDepth', waterDepth);
      }
    });
  }
});
