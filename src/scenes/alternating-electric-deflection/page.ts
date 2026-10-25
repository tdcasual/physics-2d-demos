import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { alternatingElectricDeflectionControlsSchema } from './controls-schema';
import { createAlternatingElectricDeflectionScene } from './scene.entry';
import { alternatingElectricDeflectionMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';

const timingPresets: Record<string, number> = {
  t0: 0,
  tQuarter: 0.25,
  tHalf: 0.5,
  tThreeQuarter: 0.75,
  refire: 0
};

bootScenePage({
  meta: alternatingElectricDeflectionMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '运动读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas)
      throw new Error('alternating-electric-deflection requires a canvas');
    const scene = createAlternatingElectricDeflectionScene({
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
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    return createBoundControls({
      mount,
      schema: alternatingElectricDeflectionControlsSchema,
      scene,
      scheduleRender,
      writeParam,
      onAction: (key, renderer) => {
        const phase = timingPresets[key];
        if (phase !== undefined) {
          const previous = scene.getParams();
          scene.reset();
          scene.setParams({ ...previous, releasePhase: phase, autoRun: true });
          renderer.setValue('releasePhase', phase);
        }
        render();
      }
    });
  }
});
