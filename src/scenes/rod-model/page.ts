import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { rodModelControlsSchema } from './controls-schema';
import { asRodModel, createRodModelScene } from './scene.entry';
import { rodModelMeta } from './scene.meta';
import type { RodParams } from './scene.sim';

bootScenePage({
  meta: rodModelMeta,
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
    if (!canvas) throw new Error('rod-model requires a canvas');
    const scene = createRodModelScene({ canvas, theme, mode, demoHints });
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
      schema: rodModelControlsSchema,
      onChange: (key, value) => {
        if (key === 'model') {
          const model = asRodModel(value) ?? 'resistor';
          scene.setParams({ model });
          renderer.setActive(key, model);
        } else if (
          key === 'fieldStrength' ||
          key === 'railGap' ||
          key === 'externalForce' ||
          key === 'mass' ||
          key === 'resistance' ||
          key === 'capacitance'
        ) {
          scene.setParams({ [key]: Number(value) } as Partial<RodParams>);
        } else if (key === 'autoRun') {
          scene.setParams({ autoRun: Boolean(value) });
        }
        render();
        writeParam?.(key, value);
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
      if (key === 'model') {
        const model = asRodModel(value) ?? 'resistor';
        ctx.scene.setParams({ model });
        ctx.setControlActive(key, model);
        return true;
      }
      if (
        key === 'fieldStrength' ||
        key === 'railGap' ||
        key === 'externalForce' ||
        key === 'mass' ||
        key === 'resistance' ||
        key === 'capacitance'
      ) {
        const n = Number(value);
        if (!Number.isFinite(n)) return false;
        ctx.scene.setParams({ [key]: n } as Partial<RodParams>);
        ctx.setControlValue(key, n);
        return true;
      }
      if (key === 'autoRun') {
        const on = Number(value) > 0;
        ctx.scene.setParams({ autoRun: on });
        ctx.setControlValue(key, on);
        return true;
      }
      return false;
    }
  }
});
