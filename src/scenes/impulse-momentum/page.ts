import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { impulseMomentumControlsSchema } from './controls-schema';
import { asForceModel, createImpulseMomentumScene } from './scene.entry';
import { impulseMomentumMeta } from './scene.meta';
import type { ImpulseMomentumParams } from './scene.sim';

bootScenePage({
  meta: impulseMomentumMeta,
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
    if (!canvas) throw new Error('impulse-momentum requires a canvas');
    const scene = createImpulseMomentumScene({
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
      schema: impulseMomentumControlsSchema,
      onChange: (key, value) => {
        if (key === 'forceModel') {
          const forceModel = asForceModel(value) ?? 'constant';
          scene.setParams({ forceModel });
          renderer.setActive(key, forceModel);
          writeParam?.(key, forceModel);
        } else if (
          key === 'mass' ||
          key === 'initialVelocity' ||
          key === 'peakForce'
        ) {
          scene.setParams({
            [key]: Number(value)
          } as Partial<ImpulseMomentumParams>);
          writeParam?.(key, value);
        } else if (key === 'autoRun' || key === 'showArea') {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<ImpulseMomentumParams>);
          writeParam?.(key, value ? 1 : 0);
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
      if (key === 'forceModel') {
        const forceModel = asForceModel(value) ?? 'constant';
        ctx.scene.setParams({ forceModel });
        ctx.setControlActive(key, forceModel);
        return true;
      }
      if (key === 'mass' || key === 'initialVelocity' || key === 'peakForce') {
        const n = Number(value);
        if (!Number.isFinite(n)) return false;
        ctx.scene.setParams({ [key]: n } as Partial<ImpulseMomentumParams>);
        ctx.setControlValue(key, n);
        return true;
      }
      if (key === 'autoRun' || key === 'showArea') {
        const on = Number(value) > 0;
        ctx.scene.setParams({ [key]: on } as Partial<ImpulseMomentumParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      return false;
    }
  }
});
