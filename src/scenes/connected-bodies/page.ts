import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { connectedBodiesControlsSchema } from './controls-schema';
import { connectedBodiesMeta } from './scene.meta';
import { createConnectedBodiesScene } from './scene.entry';
import { createBoundControls } from '../../ui/components/bound-controls';
bootScenePage({
  meta: connectedBodiesMeta,
  autoPlay: false,
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
    if (!canvas) throw new Error('connected-bodies requires a canvas');
    const scene = createConnectedBodiesScene({
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
      schema: connectedBodiesControlsSchema,
      scene,
      scheduleRender,
      writeParam,
      onAction: (key, renderer) => {
        if (key === 'cutUpper') scene.cut('upper');
        if (key === 'cutLower') scene.cut('lower');
        if (key === 'reset') {
          scene.reset();
          renderer.setActive('arrangement', 'string-spring');
          renderer.setValue('massA', 2);
          renderer.setValue('massB', 1);
        }
        render();
      }
    });
  }
});
