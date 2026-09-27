import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { FeederParams } from './scene.sim';
import { feederControlsSchema } from './controls-schema';
import { createFeederScene } from './scene.entry';
import { feederMeta } from './scene.meta';

bootScenePage({
  meta: feederMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '实时数据看板',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('auto-water-feeder requires a canvas');
    const scene = createFeederScene({ canvas, theme, mode, demoHints });
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
      schema: feederControlsSchema,
      onChange: (key, value) => {
        if (key === 'autoRun') {
          scene.setParams({ autoRun: Boolean(value) });
          render();
          writeParam?.(key, value);
          return;
        }
        const n = Number(value);
        if (!Number.isFinite(n)) return;
        scene.setParams({ [key]: n } as Partial<FeederParams>);
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        const values: Record<string, number> = {
          emptyTank: 0.25,
          justFloat: 0.9,
          componentLimit: 2.2
        };
        const waterDepth = values[key];
        if (waterDepth === undefined) return;
        scene.setParams({ waterDepth });
        renderer.setValue('waterDepth', waterDepth);
        render();
        writeParam?.('waterDepth', waterDepth);
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'autoRun') {
        const enabled = value === '1' || String(value).toLowerCase() === 'true';
        ctx.scene.setParams({ autoRun: enabled });
        ctx.setControlValue(key, enabled);
        return true;
      }
      const n = Number(value);
      if (!Number.isFinite(n)) return false;
      ctx.scene.setParams({ [key]: n } as Partial<FeederParams>);
      ctx.setControlValue(key, n);
      return true;
    }
  }
});
