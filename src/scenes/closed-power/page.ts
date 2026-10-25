import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { closedPowerControlsSchema } from './controls-schema';
import { createClosedPowerScene } from './scene.entry';
import { closedPowerMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';

bootScenePage({
  meta: closedPowerMeta,
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
    if (!canvas) throw new Error('closed-power requires a canvas');
    const scene = createClosedPowerScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        scene.dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    return createBoundControls({
      mount,
      schema: closedPowerControlsSchema,
      scene,
      scheduleRender,
      writeParam,
      onAction: (key) => {
        if (key === 'short') scene.setParams({ externalResistance: 0 });
        else if (key === 'matched')
          scene.setParams({
            externalResistance: scene.getParams().internalResistance
          });
        else if (key === 'max') scene.setParams({ externalResistance: 20 });
        render();
      }
    });
  }
});
