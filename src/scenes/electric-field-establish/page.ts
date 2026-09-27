import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { ElectricFieldParams } from './scene.sim';
import { electricFieldControlsSchema } from './controls-schema';
import { createElectricFieldScene } from './scene.entry';
import { electricFieldMeta } from './scene.meta';

bootScenePage({
  meta: electricFieldMeta,
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
    if (!canvas) throw new Error('electric-field-establish requires a canvas');
    const scene = createElectricFieldScene({ canvas, theme, mode, demoHints });
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
      schema: electricFieldControlsSchema,
      onChange: (key, value) => {
        if (key === 'voltage') scene.setParams({ voltage: Number(value) });
        else
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<ElectricFieldParams>);
        render();
        writeParam?.(key, value);
      },
      onAction: () => render()
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'voltage') {
        const n = Number(value);
        if (!Number.isFinite(n)) return false;
        ctx.scene.setParams({ voltage: n });
        ctx.setControlValue(key, n);
        return true;
      }
      if (
        ['closed', 'showSurfaceCharge', 'showDrift', 'autoRun'].includes(key)
      ) {
        const enabled =
          value === 1 ||
          value === '1' ||
          String(value).toLowerCase() === 'true';
        ctx.scene.setParams({ [key]: enabled } as Partial<ElectricFieldParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      return false;
    }
  }
});
