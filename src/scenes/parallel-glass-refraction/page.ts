import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { GlassParams } from './scene.sim';
import { glassControlsSchema } from './controls-schema';
import { createGlassScene } from './scene.entry';
import { glassMeta } from './scene.meta';

bootScenePage({
  meta: glassMeta,
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
    if (!canvas) throw new Error('parallel-glass-refraction requires a canvas');
    const scene = createGlassScene({ canvas, theme, mode, demoHints });
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
      schema: glassControlsSchema,
      onChange: (key, value) => {
        if (key === 'autoRun') {
          scene.setParams({ autoRun: Boolean(value) });
          render();
          writeParam?.(key, value);
          return;
        }
        const n = Number(value);
        if (!Number.isFinite(n)) return;
        scene.setParams({ [key]: n } as Partial<GlassParams>);
        render();
        writeParam?.(key, value);
      },
      onAction: () => undefined
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
      if (key === 'autoRun') {
        const enabled = value === '1' || String(value).toLowerCase() === 'true';
        ctx.scene.setParams({ autoRun: enabled });
        ctx.setControlValue(key, enabled);
        return true;
      }
      const n = Number(value);
      if (!Number.isFinite(n)) return false;
      ctx.scene.setParams({ [key]: n } as Partial<GlassParams>);
      ctx.setControlValue(key, n);
      return true;
    }
  }
});
