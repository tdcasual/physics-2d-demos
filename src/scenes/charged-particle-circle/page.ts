import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { chargedParticleControlsSchema } from './controls-schema';
import { asFieldDirection, createChargedParticleScene } from './scene.entry';
import { chargedParticleMeta } from './scene.meta';
import type { ChargedParticleParams } from './scene.sim';

bootScenePage({
  meta: chargedParticleMeta,
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
    if (!canvas) throw new Error('charged-particle-circle requires a canvas');
    const scene = createChargedParticleScene({
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
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const renderer = renderSchema({
      mount,
      schema: chargedParticleControlsSchema,
      onChange: (key, value) => {
        if (key === 'fieldDirection') {
          const direction = asFieldDirection(value) ?? 'into';
          scene.setParams({ fieldDirection: direction });
          renderer.setActive('fieldDirection', direction);
          writeParam?.(key, direction === 'out' ? 1 : 0);
        } else if (['autoRun', 'showVelocity', 'showForce'].includes(key)) {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<ChargedParticleParams>);
          writeParam?.(key, value ? 1 : 0);
        } else if (
          ['mass', 'charge', 'velocity', 'magneticField'].includes(key)
        ) {
          scene.setParams({
            [key]: Number(value)
          } as Partial<ChargedParticleParams>);
          writeParam?.(key, value);
        }
        render();
      },
      onAction: () => {}
    });
    return {
      setValue: (key: string, value: number | string | boolean) =>
        renderer.setValue(key, value),
      setActive: (key: string, value: string) => renderer.setActive(key, value),
      dispose: () => renderer.dispose()
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'fieldDirection') {
        const direction = asFieldDirection(value) ?? 'into';
        ctx.scene.setParams({ fieldDirection: direction });
        ctx.setControlActive('fieldDirection', direction);
        return true;
      }
      if (['autoRun', 'showVelocity', 'showForce'].includes(key)) {
        const on = Number(value) > 0;
        ctx.scene.setParams({ [key]: on } as Partial<ChargedParticleParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      if (['mass', 'charge', 'velocity', 'magneticField'].includes(key)) {
        const n = Number(value);
        if (Number.isFinite(n)) {
          ctx.scene.setParams({ [key]: n } as Partial<ChargedParticleParams>);
          ctx.setControlValue(key, n);
        }
        return true;
      }
      return false;
    }
  }
});
