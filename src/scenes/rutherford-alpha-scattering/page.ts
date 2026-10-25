import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { createBoundControls } from '../../ui/components/bound-controls';
import { resetSceneAndControls } from '../../app/control-projection';
import { rutherfordControlsSchema } from './controls-schema';
import { createRutherfordScene } from './scene.entry';
import { rutherfordMeta } from './scene.meta';

bootScenePage({
  meta: rutherfordMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '实验读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas)
      throw new Error('rutherford-alpha-scattering requires a canvas');
    const scene = createRutherfordScene({ canvas, theme, mode, demoHints });
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
  // model 的 0/1 ↔ plum/nuclear 编码在 controls-schema 的 bind.values 声明
  createControls: ({ mount, scene, scheduleRender, writeParam }) =>
    createBoundControls({
      mount,
      schema: rutherfordControlsSchema,
      scene,
      scheduleRender,
      writeParam,
      onAction: (key, renderer) => {
        if (key === 'fireBeam') scene.fireBeam();
        else if (key === 'toggleModel') {
          const id = scene.toggleModel() === 1 ? 'nuclear' : 'plum';
          renderer.setActiveSilently('model', id);
          writeParam?.('model', id);
        } else if (key === 'reset')
          resetSceneAndControls(scene, renderer, writeParam);
      }
    })
});
