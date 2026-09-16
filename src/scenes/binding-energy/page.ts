import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeSceneParams } from '../../app/url-sync';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createBindingEnergyScene } from './scene.entry';
import { bindingEnergyMeta } from './scene.meta';
import { bindingEnergyControlsSchema } from './controls-schema';
import {
  BINDING_ENERGY_PRESETS,
  bindingEnergyConstants as C,
  parseBindingEnergyPreset,
  presetIdForA,
  type BindingEnergyParams
} from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

bootScenePage({
  meta: bindingEnergyMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 300,
    leftMaxWidth: 520,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('binding-energy requires a canvas');
    const scene = createBindingEnergyScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
        if (Math.abs(Math.abs(dt) - C.keyboardDt) < 1e-12) {
          writeSceneParams({ A: scene.getParams().A });
        }
      },
      dispose(): void {
        scheduler.dispose();
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const energyScene = scene as ReturnType<typeof createBindingEnergyScene>;
    let applying = false;
    let last = energyScene.getParams();

    const syncPreset = (A: number): void => {
      const id = presetIdForA(A);
      if (id) renderer.setActive('preset', id);
    };

    const renderer = renderSchema({
      mount,
      schema: bindingEnergyControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        if (key === 'preset') {
          const id = parseBindingEnergyPreset(value, 'u238');
          const A = BINDING_ENERGY_PRESETS[id];
          if (A === undefined) return;
          energyScene.setParams({ A });
          renderer.setActive('preset', id);
          renderer.setValue('A', A);
          last = energyScene.getParams();
          render();
          writeParam?.('A', A);
          return;
        }
        if (key === 'autoRun' || key === 'showRegions') {
          energyScene.setParams({
            [key]: asBoolean(value)
          } as Partial<BindingEnergyParams>);
        } else if (key === 'A') {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          energyScene.setParams({ A: number });
          syncPreset(energyScene.getParams().A);
        }
        last = energyScene.getParams();
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });

    syncPreset(last.A);

    const unsubscribe = energyScene.subscribe(() => {
      const p = energyScene.getParams();
      applying = true;
      if (p.A !== last.A) {
        renderer.setValue('A', p.A);
        syncPreset(p.A);
      }
      if (p.autoRun !== last.autoRun) renderer.setValue('autoRun', p.autoRun);
      if (p.showRegions !== last.showRegions) {
        renderer.setValue('showRegions', p.showRegions);
      }
      applying = false;
      last = p;
    });

    return {
      setValue(key: string, value: number | string | boolean): void {
        renderer.setValue(key, value);
      },
      setActive(key: string, value: string): void {
        renderer.setActive(key, value);
      },
      dispose(): void {
        unsubscribe();
        renderer.dispose();
      }
    };
  },
  paramSync: {
    activeKeys: ['preset'],
    applyParam: (key, value, ctx) => {
      if (key === 'preset') {
        const id = parseBindingEnergyPreset(value, 'u238');
        const A = BINDING_ENERGY_PRESETS[id];
        if (A === undefined) return false;
        ctx.scene.setParams({ A });
        ctx.setControlActive('preset', id);
        ctx.setControlValue('A', A);
        return true;
      }
      if (key === 'autoRun' || key === 'showRegions') {
        const on = asBoolean(value);
        ctx.scene.setParams({ [key]: on } as Partial<BindingEnergyParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      if (key === 'A') {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({ A: number });
        ctx.setControlValue('A', number);
        const id = presetIdForA(number);
        if (id) ctx.setControlActive('preset', id);
        return true;
      }
      return false;
    }
  }
});
