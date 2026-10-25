import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { freeFallControlsSchema } from './controls-schema';
import { createFreeFallScene } from './scene.entry';
import { freeFallMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';

bootScenePage({
  meta: freeFallMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '运动数据',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('free-fall-throw requires a canvas');
    const scene = createFreeFallScene({ canvas, theme, mode, demoHints });
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
      schema: freeFallControlsSchema,
      scene,
      scheduleRender,
      writeParam,
      onAction: (key, renderer) => {
        if (key === 'reset') {
          scene.reset();
          const resetParams = scene.getParams();
          Object.entries(resetParams).forEach(([paramKey, paramValue]) =>
            renderer.setValue(paramKey, paramValue)
          );
          renderer.setActive('initialSpeed', String(resetParams.initialSpeed));
          renderer.setActive('mode', resetParams.mode);
        }
        render();
      }
    });
  }
});
