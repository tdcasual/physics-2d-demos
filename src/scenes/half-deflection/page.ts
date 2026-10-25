import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { halfDeflectionControlsSchema } from './controls-schema';
import { createHalfDeflectionScene } from './scene.entry';
import { halfDeflectionMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';

bootScenePage({
  meta: halfDeflectionMeta,
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
    if (!canvas) throw new Error('half-deflection requires a canvas');
    const scene = createHalfDeflectionScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    return createBoundControls({
      mount,
      schema: halfDeflectionControlsSchema,
      scene,
      scheduleRender,
      writeParam,
      onAction: (key) => {
        if (key === 'recordFull') scene.record('满偏');
        if (key === 'recordHalf') scene.record('半偏');
        if (key === 'clear') scene.clearRecords();
        if (key === 'answer')
          scene.setParams({ showAnswer: !scene.getState().params.showAnswer });
        render();
      }
    });
  }
});
