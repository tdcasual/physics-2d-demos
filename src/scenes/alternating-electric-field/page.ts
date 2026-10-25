import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { alternatingElectricFieldControlsSchema } from './controls-schema';
import { createAlternatingElectricFieldScene } from './scene.entry';
import { alternatingElectricFieldMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';

bootScenePage({
  meta: alternatingElectricFieldMeta,
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
    if (!canvas)
      throw new Error('alternating-electric-field requires a canvas');
    const scene = createAlternatingElectricFieldScene({
      canvas,
      theme,
      mode,
      demoHints
    });
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
      schema: alternatingElectricFieldControlsSchema,
      scene,
      scheduleRender,
      writeParam,
      onAction: (key) => {
        if (key === 'start') scene.setParams({ phaseOffset: 0 });
        else if (key === 'quarter') scene.setParams({ phaseOffset: 0.25 });
        else if (key === 'reverse') scene.setParams({ phaseOffset: 0.375 });
        render();
      }
    });
  }
});
