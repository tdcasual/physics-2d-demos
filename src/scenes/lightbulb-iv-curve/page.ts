import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { LightbulbParams } from './scene.sim';
import { lightbulbControlsSchema } from './controls-schema';
import { createLightbulbScene } from './scene.entry';
import { lightbulbMeta } from './scene.meta';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

bootScenePage({
  meta: lightbulbMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '实验读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('lightbulb-iv-curve requires a canvas');
    const scene = createLightbulbScene({ canvas, theme, mode, demoHints });
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
      schema: lightbulbControlsSchema,
      onChange: (key, value) => {
        if (key === 'showIdeal' || key === 'autoRun') {
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<LightbulbParams>);
        } else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          scene.setParams({ [key]: number } as Partial<LightbulbParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'recordPoint') scene.recordPoint();
        else if (key === 'resetCurve') scene.resetCurve();
        render();
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'showIdeal' || key === 'autoRun') {
        const enabled = asBoolean(value);
        ctx.scene.setParams({ [key]: enabled } as Partial<LightbulbParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<LightbulbParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
