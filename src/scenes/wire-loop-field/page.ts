import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { wireLoopFieldControlsSchema } from './controls-schema';
import { createWireLoopFieldScene } from './scene.entry';
import { wireLoopFieldMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';
import { resetSceneAndControls } from '../../app/control-projection';

bootScenePage({
  meta: wireLoopFieldMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '感应数据',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('wire-loop-field requires a canvas');
    const scene = createWireLoopFieldScene({ canvas, theme, mode, demoHints });
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
      schema: wireLoopFieldControlsSchema,
      scene,
      scheduleRender,
      writeParam,
      onAction: (key, renderer) => {
        if (key === 'reset') resetSceneAndControls(scene, renderer, writeParam);
      }
    })
});
