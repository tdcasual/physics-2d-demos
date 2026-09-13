import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { precisionToolControlsSchema } from './controls-schema';
import { asPrecisionMode, createPrecisionToolScene } from './scene.entry';
import { precisionToolMeta } from './scene.meta';
import type { PrecisionToolParams } from './scene.sim';

bootScenePage({
  meta: precisionToolMeta,
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
    if (!canvas) throw new Error('precision-tools requires a canvas');
    const scene = createPrecisionToolScene({ canvas, theme, mode, demoHints });
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
      schema: precisionToolControlsSchema,
      onChange: (key, value) => {
        if (key === 'mode') {
          const mode = asPrecisionMode(value) ?? 'caliper50';
          scene.setParams({ mode });
          renderer.setActive(key, mode);
        } else if (key === 'adjustment') {
          scene.setParams({ adjustment: Number(value) });
        } else if (
          key === 'autoRun' ||
          key === 'showGuides' ||
          key === 'showReading'
        ) {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<PrecisionToolParams>);
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
      if (key === 'mode') {
        const mode = asPrecisionMode(value) ?? 'caliper50';
        ctx.scene.setParams({ mode });
        ctx.setControlActive('mode', mode);
        return true;
      }
      if (key === 'adjustment') {
        const n = Number(value);
        if (Number.isFinite(n)) {
          ctx.scene.setParams({ adjustment: n });
          ctx.setControlValue(key, n);
        }
        return true;
      }
      if (key === 'autoRun' || key === 'showGuides' || key === 'showReading') {
        const on = Number(value) > 0;
        ctx.scene.setParams({ [key]: on } as Partial<PrecisionToolParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      return false;
    }
  }
});
