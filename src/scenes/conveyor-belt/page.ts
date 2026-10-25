import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { conveyorControlsSchema } from './controls-schema';
import { createConveyorScene } from './scene.entry';
import { conveyorBeltMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';

bootScenePage({
  meta: conveyorBeltMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '运动状态',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('conveyor-belt requires a canvas');
    const scene = createConveyorScene({ canvas, theme, mode, demoHints });
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
      schema: conveyorControlsSchema,
      scene,
      scheduleRender,
      writeParam,
      onAction: (key, renderer) => {
        if (key === 'releaseBottom') scene.release('bottom');
        if (key === 'releaseTop') scene.release('top');
        if (key === 'reset') {
          scene.reset();
          renderer.setValue('angle', 30);
          renderer.setValue('beltSpeed', 4);
          renderer.setValue('mu', 0.8);
          renderer.setValue('blockMass', 1);
          renderer.setActive('direction', 'up');
        }
        render();
      }
    });
  }
});
