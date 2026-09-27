import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { MetalRodParams } from './scene.sim';
import { metalRodControlsSchema } from './controls-schema';
import { createMetalRodScene } from './scene.entry';
import { metalRodMeta } from './scene.meta';

bootScenePage({
  meta: metalRodMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '核心状态追踪',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('metal-rod-track requires a canvas');
    const scene = createMetalRodScene({ canvas, theme, mode, demoHints });
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
      schema: metalRodControlsSchema,
      onChange: (key, value) => {
        if (key === 'mode') {
          const mode = String(value) as MetalRodParams['mode'];
          scene.setParams({ mode });
          renderer.setActive(key, mode);
        } else if (key === 'autoRun') {
          scene.setParams({ autoRun: Boolean(value) });
        } else {
          scene.setParams({ [key]: Number(value) } as Partial<MetalRodParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: () => render()
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'mode') {
        const mode = String(value) as MetalRodParams['mode'];
        if (!['coast', 'pull'].includes(mode)) return false;
        ctx.scene.setParams({ mode });
        ctx.setControlActive(key, mode);
        return true;
      }
      if (key === 'autoRun') {
        const enabled =
          value === 1 ||
          value === '1' ||
          String(value).toLowerCase() === 'true';
        ctx.scene.setParams({ autoRun: enabled });
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<MetalRodParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
