import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { TirParams } from './scene.sim';
import { tirControlsSchema } from './controls-schema';
import { createTirScene } from './scene.entry';
import { tirMeta } from './scene.meta';

bootScenePage({
  meta: tirMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '实时数据看板',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('semicylinder-tir requires a canvas');
    const scene = createTirScene({ canvas, theme, mode, demoHints });
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
      schema: tirControlsSchema,
      onChange: (key, value) => {
        if (key === 'autoRun') {
          scene.setParams({ autoRun: Boolean(value) });
          render();
          writeParam?.(key, value);
          return;
        }
        scene.setParams({ [key]: Number(value) } as Partial<TirParams>);
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'jumpCritical') {
          const state = scene.getState();
          scene.setParams({ height: state.criticalHeight });
          renderer.setValue('height', state.criticalHeight);
        }
        render();
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
      ctx.scene.setParams({ [key]: n } as Partial<TirParams>);
      ctx.setControlValue(key, n);
      return true;
    }
  }
});
