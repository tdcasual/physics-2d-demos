import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { parallelCapacitorControlsSchema } from './controls-schema';
import { parallelCapacitorMeta } from './scene.meta';
import { createParallelCapacitorScene } from './scene.entry';
import type { CapacitorParams } from './scene.sim';
bootScenePage({
  meta: parallelCapacitorMeta,
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
    if (!canvas) throw new Error('parallel-capacitor requires a canvas');
    const scene = createParallelCapacitorScene({
      canvas,
      theme,
      mode,
      demoHints
    });
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
      schema: parallelCapacitorControlsSchema,
      onChange: (key, value) => {
        if (key === 'probe') {
          scene.setParams({ probe: String(value) as CapacitorParams['probe'] });
          renderer.setActive(key, String(value));
        } else
          scene.setParams({ [key]: Number(value) } as Partial<CapacitorParams>);
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
      if (key === 'probe') {
        const probe =
          String(value) === '1'
            ? 'distance'
            : String(value) === '2'
              ? 'dielectric'
              : (String(value) as CapacitorParams['probe']);
        ctx.scene.setParams({ probe });
        ctx.setControlActive(key, probe);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<CapacitorParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
