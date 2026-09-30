import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { lenzLawControlsSchema } from './controls-schema';
import { asLenzMotion, createLenzLawScene } from './scene.entry';
import { lenzLawMeta } from './scene.meta';
import type { LenzParams } from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

const booleanKeys = new Set(['autoRun', 'showVectors']);

bootScenePage({
  meta: lenzLawMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '感应数据',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('lenz-law requires a canvas');
    const scene = createLenzLawScene({ canvas, theme, mode, demoHints });
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
      schema: lenzLawControlsSchema,
      onChange: (key, value) => {
        if (key === 'motion') {
          const motion = asLenzMotion(value);
          if (!motion) return;
          scene.setParams({ motion });
          renderer.setActive(key, motion);
        } else if (booleanKeys.has(key)) {
          scene.setParams({ [key]: asBoolean(value) } as Partial<LenzParams>);
        } else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          scene.setParams({ [key]: number } as Partial<LenzParams>);
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
          renderer.setActive('motion', resetParams.motion);
        }
        render();
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'motion') {
        const motion = asLenzMotion(value);
        if (!motion) return false;
        ctx.scene.setParams({ motion });
        ctx.setControlActive(key, motion);
        return true;
      }
      if (booleanKeys.has(key)) {
        const enabled = asBoolean(value);
        ctx.scene.setParams({ [key]: enabled } as Partial<LenzParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<LenzParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
