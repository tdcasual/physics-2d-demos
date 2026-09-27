import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { createBinaryStarsScene } from './scene.entry';
import { binaryStarsMeta } from './scene.meta';
import { binaryStarsControlsSchema } from './controls-schema';
import type { BinaryStarsParams } from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

bootScenePage({
  meta: binaryStarsMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 520,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('binary-stars requires a canvas');
    const scene = createBinaryStarsScene({ canvas, theme, mode, demoHints });
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
    const binaryStarsScene = scene as ReturnType<typeof createBinaryStarsScene>;
    const renderer = renderSchema({
      mount,
      schema: binaryStarsControlsSchema,
      onChange: (key, value) => {
        if (key === 'autoRun' || key === 'showVectors') {
          binaryStarsScene.setParams({
            [key]: asBoolean(value)
          } as Partial<BinaryStarsParams>);
        } else if (key === 'm1' || key === 'm2' || key === 'distance') {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          binaryStarsScene.setParams({
            [key]: number
          } as Partial<BinaryStarsParams>);
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
      if (key === 'autoRun' || key === 'showVectors') {
        const on = asBoolean(value);
        ctx.scene.setParams({ [key]: on } as Partial<BinaryStarsParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      if (key === 'm1' || key === 'm2' || key === 'distance') {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({ [key]: number } as Partial<BinaryStarsParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      return false;
    }
  }
});
