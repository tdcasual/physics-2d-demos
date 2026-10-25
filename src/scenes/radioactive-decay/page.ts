import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { radioactiveControlsSchema } from './controls-schema';
import { createRadioactiveScene } from './scene.entry';
import { radioactiveMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';
bootScenePage({
  meta: radioactiveMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '衰变读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('radioactive-decay requires a canvas');
    const scene = createRadioactiveScene({ canvas, theme, mode, demoHints });
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
      schema: radioactiveControlsSchema,
      scene,
      scheduleRender,
      writeParam
    })
});
