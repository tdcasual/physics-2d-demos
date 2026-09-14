import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { CapacitorParams } from './scene.sim';
import { capacitorControlsSchema } from './controls-schema';
import { createCapacitorScene } from './scene.entry';
import { capacitorMeta } from './scene.meta';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}
function asMode(value: unknown): 0 | 1 | 2 | null {
  const n = Number(value);
  return n === 0 || n === 1 || n === 2 ? n : null;
}

bootScenePage({
  meta: capacitorMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '实时测量值',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas)
      throw new Error('capacitor-charge-discharge requires a canvas');
    const scene = createCapacitorScene({ canvas, theme, mode, demoHints });
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
      schema: capacitorControlsSchema,
      onChange: (key, value) => {
        if (key === 'mode') {
          const modeValue = asMode(value);
          if (modeValue === null) return;
          scene.setParams({ mode: modeValue });
          renderer.setActive('mode', String(value));
        } else if (key === 'autoRun' || key === 'showCurrent')
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<CapacitorParams>);
        else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          scene.setParams({ [key]: number } as Partial<CapacitorParams>);
          renderer.setActive(key, String(value));
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'reset') scene.reset();
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
      if (key === 'mode') {
        const mode = asMode(value);
        if (mode === null) return false;
        ctx.scene.setParams({ mode });
        ctx.setControlActive(key, String(mode));
        return true;
      }
      if (key === 'autoRun' || key === 'showCurrent') {
        const enabled = asBoolean(value);
        ctx.scene.setParams({ [key]: enabled } as Partial<CapacitorParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<CapacitorParams>);
      ctx.setControlActive(key, String(number));
      return true;
    }
  }
});
