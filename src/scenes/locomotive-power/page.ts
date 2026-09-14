import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { locomotiveControlsSchema } from './controls-schema';
import { createLocomotiveScene } from './scene.entry';
import { locomotiveMeta } from './scene.meta';
import type { LocomotiveParams } from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true' ||
    String(value).toLowerCase() === 'true'
  );
}
function asMode(value: unknown): LocomotiveParams['mode'] | null {
  return value === 'power' || value === 'acceleration' ? value : null;
}

bootScenePage({
  meta: locomotiveMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '启动数据',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('locomotive-power requires a canvas');
    const scene = createLocomotiveScene({ canvas, theme, mode, demoHints });
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
      schema: locomotiveControlsSchema,
      onChange: (key, value) => {
        if (key === 'mode') {
          const mode = asMode(value);
          if (mode) scene.setParams({ mode });
        } else if (key === 'autoRun')
          scene.setParams({ autoRun: asBoolean(value) });
        else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          scene.setParams({ [key]: number } as Partial<LocomotiveParams>);
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
        if (!mode) return false;
        ctx.scene.setParams({ mode });
        ctx.setControlValue(key, mode);
        return true;
      }
      if (key === 'autoRun') {
        ctx.scene.setParams({ autoRun: asBoolean(value) });
        ctx.setControlValue(key, asBoolean(value));
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<LocomotiveParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
