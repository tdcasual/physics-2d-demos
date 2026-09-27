import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { freeFallControlsSchema } from './controls-schema';
import { asFreeFallMode, createFreeFallScene } from './scene.entry';
import { freeFallMeta } from './scene.meta';
import type { FreeFallParams } from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

const booleanKeys = new Set(['autoRun', 'showVelocity', 'showHeight']);

bootScenePage({
  meta: freeFallMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '运动数据',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('free-fall-throw requires a canvas');
    const scene = createFreeFallScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        scene.dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const renderer = renderSchema({
      mount,
      schema: freeFallControlsSchema,
      onChange: (key, value) => {
        if (key === 'mode') {
          const selected = asFreeFallMode(value);
          if (!selected) return;
          scene.setParams({ mode: selected });
          renderer.setActive(key, selected);
        } else if (booleanKeys.has(key)) {
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<FreeFallParams>);
        } else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          scene.setParams({ [key]: number } as Partial<FreeFallParams>);
          if (key === 'initialSpeed') renderer.setActive(key, String(number));
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'reset') {
          scene.reset();
          const resetParams = scene.getParams();
          Object.entries(resetParams).forEach(([paramKey, paramValue]) =>
            renderer.setValue(paramKey, paramValue)
          );
          renderer.setActive('initialSpeed', String(resetParams.initialSpeed));
          renderer.setActive('mode', resetParams.mode);
        }
        render();
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'mode') {
        const selected = asFreeFallMode(value);
        if (!selected) return false;
        ctx.scene.setParams({ mode: selected });
        ctx.setControlActive(key, selected);
        return true;
      }
      if (booleanKeys.has(key)) {
        const enabled = asBoolean(value);
        ctx.scene.setParams({ [key]: enabled } as Partial<FreeFallParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<FreeFallParams>);
      if (key === 'initialSpeed') ctx.setControlActive(key, String(number));
      else ctx.setControlValue(key, number);
      return true;
    }
  }
});
