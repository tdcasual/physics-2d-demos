import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { InclineMode, InclineSpringParams } from './scene.sim';
import { inclineSpringControlsSchema } from './controls-schema';
import { createInclineSpringScene } from './scene.entry';
import { inclineSpringMeta } from './scene.meta';

bootScenePage({
  meta: inclineSpringMeta,
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
    if (!canvas) throw new Error('incline-spring requires a canvas');
    const scene = createInclineSpringScene({ canvas, theme, mode, demoHints });
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
      schema: inclineSpringControlsSchema,
      onChange: (key, value) => {
        if (key === 'mode') {
          const next = String(value) as InclineMode;
          scene.setParams({ mode: next });
          renderer.setActive(key, next);
        } else if (key === 'autoRun') {
          scene.setParams({ autoRun: Boolean(value) });
          writeParam?.(key, value);
        } else {
          scene.setParams({
            [key]: Number(value)
          } as Partial<InclineSpringParams>);
          writeParam?.(key, value);
        }
        render();
      },
      onAction: (key) => {
        if (key === 'reset') {
          scene.reset();
          const params = scene.getParams();
          renderer.setActive('mode', params.mode);
          renderer.setValue('friction', params.friction);
          renderer.setValue('stiffness', params.stiffness);
          renderer.setValue('mass', params.mass);
          renderer.setValue('autoRun', params.autoRun);
        }
        render();
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'mode') {
        const mode = String(value) as InclineMode;
        if (!['smooth', 'resist', 'stuck'].includes(mode)) return false;
        ctx.scene.setParams({ mode });
        ctx.setControlActive(key, mode);
        return true;
      }
      if (key === 'autoRun') {
        const enabled = value === '1' || String(value).toLowerCase() === 'true';
        ctx.scene.setParams({ autoRun: enabled });
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<InclineSpringParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
