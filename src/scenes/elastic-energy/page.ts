import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { EnergyParams, EnergyPreset } from './scene.sim';
import { energyControlsSchema } from './controls-schema';
import { createEnergyScene } from './scene.entry';
import { energyMeta } from './scene.meta';

bootScenePage({
  meta: energyMeta,
  autoPlay: true,
  preferredLayout: 'split-right-graph-bottom',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '实时读数',
    hasGraph: true
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('elastic-energy requires a canvas');
    const scene = createEnergyScene({ canvas, theme, mode, demoHints });
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
    const renderer = renderSchema({
      mount,
      schema: energyControlsSchema,
      onChange: (key, value) => {
        if (key === 'preset') {
          const params = scene.setPreset(String(value) as EnergyPreset);
          renderer.setActive('preset', params.preset);
          renderer.setValue('massA', params.massA);
          renderer.setValue('massB', params.massB);
          renderer.setValue('velocityA', params.velocityA);
          render();
          return;
        }
        if (key === 'slowMotion') {
          scene.setParams({ slowMotion: Boolean(value) });
          render();
          writeParam?.(key, value);
          return;
        }
        scene.setParams({ [key]: Number(value) } as Partial<EnergyParams>);
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'replay') {
          scene.reset();
          const params = scene.getParams();
          renderer.setActive('preset', params.preset);
          renderer.setValue('massA', params.massA);
          renderer.setValue('massB', params.massB);
          renderer.setValue('velocityA', params.velocityA);
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
      if (key === 'slowMotion') {
        const enabled = value === '1' || String(value).toLowerCase() === 'true';
        ctx.scene.setParams({ slowMotion: enabled });
        ctx.setControlValue(key, enabled);
        return true;
      }
      const n = Number(value);
      if (!Number.isFinite(n)) return false;
      ctx.scene.setParams({ [key]: n } as Partial<EnergyParams>);
      ctx.setControlValue(key, n);
      return true;
    }
  }
});
