import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { inductionAcceleratorControlsSchema } from './controls-schema';
import { createInductionAcceleratorScene } from './scene.entry';
import { inductionAcceleratorMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';
bootScenePage({
  meta: inductionAcceleratorMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '核心动态演算',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('induction-accelerator requires a canvas');
    const scene = createInductionAcceleratorScene({
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
      schema: inductionAcceleratorControlsSchema,
      scene,
      scheduleRender,
      writeParam,
      onAction: (key, renderer) => {
        if (key === 'relaunch') scene.relaunch();
        if (key === 'reset') {
          scene.reset();
          const params = scene.getParams();
          Object.entries(params).forEach(([paramKey, paramValue]) =>
            renderer.setValue(paramKey, paramValue)
          );
        }
        render();
      }
    });
  }
});
