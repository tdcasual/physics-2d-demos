import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { createUvtScene } from './scene.entry';
import { uvtMeta } from './scene.meta';
import { uvtControlsSchema } from './controls-schema';
import type { UvtParams } from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

bootScenePage({
  meta: uvtMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 280,
    leftMaxWidth: 460,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('uniformly-varied-motion requires a canvas');
    const scene = createUvtScene({ canvas, theme, mode, demoHints });
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
    const uvtScene = scene as ReturnType<typeof createUvtScene>;
    const renderer = renderSchema({
      mount,
      schema: uvtControlsSchema,
      onChange: (key, value) => {
        if (key === 'autoRun' || key === 'showArea') {
          uvtScene.setParams({
            [key]: asBoolean(value)
          } as Partial<UvtParams>);
        } else if (key === 'v0' || key === 'acceleration') {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          uvtScene.setParams({
            [key]: number
          } as Partial<UvtParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'autoRun' || key === 'showArea') {
        const on = asBoolean(value);
        ctx.scene.setParams({ [key]: on } as Partial<UvtParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      if (key === 'v0' || key === 'acceleration') {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({ [key]: number } as Partial<UvtParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      return false;
    }
  }
});
