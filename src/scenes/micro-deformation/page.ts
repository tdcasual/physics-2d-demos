import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { microDeformationControlsSchema } from './controls-schema';
import { createMicroDeformationScene } from './scene.entry';
import { microDeformationMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';

bootScenePage({
  meta: microDeformationMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '形变读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('micro-deformation requires a canvas');
    const scene = createMicroDeformationScene({
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
      schema: microDeformationControlsSchema,
      scene,
      scheduleRender,
      writeParam
    })
});
