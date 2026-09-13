import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { mechanicalEnergyControlsSchema } from './controls-schema';
import { mechanicalEnergyMeta } from './scene.meta';
import { createMechanicalEnergyScene } from './scene.entry';
import type { MechanicalEnergyParams } from './scene.sim';

bootScenePage({
  meta: mechanicalEnergyMeta,
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
    if (!canvas) throw new Error('mechanical-energy requires a canvas');
    const scene = createMechanicalEnergyScene({
      canvas,
      theme,
      mode,
      demoHints
    });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      step(dt: number) {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose() {
        scheduler.dispose();
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const renderer = renderSchema({
      mount,
      schema: mechanicalEnergyControlsSchema,
      onChange: (key, value) => {
        if (key === 'environment') {
          scene.setParams({
            environment: String(value) === 'ideal' ? 'ideal' : 'resist'
          });
          renderer.setActive(key, String(value));
        } else if (key === 'autoRun') {
          scene.setParams({ autoRun: Boolean(value) });
        } else {
          scene.setParams({
            [key]: Number(value)
          } as Partial<MechanicalEnergyParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'release') scene.release();
        if (key === 'reset') {
          scene.reset();
          renderer.setActive('environment', 'resist');
          renderer.setValue('resistance', 0.06);
          renderer.setValue('mass', 1);
          renderer.setValue('gravity', 9.8);
          renderer.setValue('pointPeriod', 0.04);
          renderer.setValue('autoRun', false);
        }
        render();
      }
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
      if (key === 'environment') {
        const environment =
          String(value) === '0' || String(value) === 'ideal'
            ? 'ideal'
            : 'resist';
        ctx.scene.setParams({ environment });
        ctx.setControlValue(key, environment);
        return true;
      }
      if (key === 'autoRun') {
        const autoRun = Number(value) > 0;
        ctx.scene.setParams({ autoRun });
        ctx.setControlValue(key, autoRun);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<MechanicalEnergyParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
