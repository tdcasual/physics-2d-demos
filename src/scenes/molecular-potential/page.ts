import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { MolecularParams } from './scene.sim';
import { molecularControlsSchema } from './controls-schema';
import { createMolecularScene } from './scene.entry';
import { molecularMeta } from './scene.meta';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

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
    const renderer = renderSchema({
      mount,
      schema: molecularControlsSchema,
      onChange: (key, value) => {
        scene.setParams({
          [key]: typeof value === 'boolean' ? value : Number(value)
        } as Partial<MolecularParams>);
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
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
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (
        key === 'autoRun' ||
        key === 'showRepulsive' ||
        key === 'showAttractive'
      ) {
        const flag = asBoolean(value);
        ctx.scene.setParams({ [key]: flag } as Partial<MolecularParams>);
        ctx.setControlValue(key, flag);
        return true;
      }
      const n = Number(value);
      if (!Number.isFinite(n)) return false;
      ctx.scene.setParams({ [key]: n } as Partial<MolecularParams>);
      ctx.setControlValue(key, n);
      return true;
    }
  }
});
