import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { zincPhotoelectricControlsSchema } from './controls-schema';
import { createZincPhotoelectricScene } from './scene.entry';
import { zincPhotoelectricMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';

bootScenePage({
  meta: zincPhotoelectricMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '能量读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('zinc-photoelectric-energy requires a canvas');
    const scene = createZincPhotoelectricScene({
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
      schema: zincPhotoelectricControlsSchema,
      scene,
      scheduleRender,
      writeParam
    })
});
