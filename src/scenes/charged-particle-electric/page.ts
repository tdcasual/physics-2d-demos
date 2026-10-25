import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { chargedParticleElectricControlsSchema } from './controls-schema';
import { chargedParticleElectricMeta } from './scene.meta';
import { createChargedParticleElectricScene } from './scene.entry';
import { createBoundControls } from '../../ui/components/bound-controls';

bootScenePage({
  meta: chargedParticleElectricMeta,
  autoPlay: true,
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
    if (!canvas) throw new Error('charged-particle-electric requires a canvas');
    const scene = createChargedParticleElectricScene({
      canvas,
      theme,
      mode,
      demoHints
    });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) =>
    createBoundControls({
      mount,
      schema: chargedParticleElectricControlsSchema,
      scene,
      scheduleRender,
      writeParam
    })
});
