import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { molecularControlsSchema } from './controls-schema';
import { createMolecularScene } from './scene.entry';
import { molecularMeta } from './scene.meta';
import { createBoundControls } from '../../ui/components/bound-controls';

bootScenePage({
  meta: molecularMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '实时数据',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('molecular-potential requires a canvas');
    const scene = createMolecularScene({ canvas, theme, mode, demoHints });
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
      schema: molecularControlsSchema,
      scene,
      scheduleRender,
      writeParam,
      onAction: (key, renderer) => {
        if (key === 'playThermal') {
          scene.setParams({ autoRun: true });
          renderer.setValue('autoRun', true);
          writeParam?.('autoRun', true);
        }
        if (key === 'reset') {
          scene.reset();
          renderer.setValue('distanceRatio', 1.55);
          renderer.setValue('epsilon', 1);
          renderer.setValue('showRepulsive', true);
          renderer.setValue('showAttractive', true);
          renderer.setValue('autoRun', false);
        }
        render();
      }
    });
  }
});
