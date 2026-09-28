import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';

import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { createBlockBoardScene } from './scene.entry';
import { blockBoardMeta } from './scene.meta';
import { blockBoardControlsSchema } from './controls-schema';
import type { BlockBoardParams } from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

const FLAG_KEYS = ['autoRun', 'showArea', 'showForces'] as const;
const NUMBER_KEYS = [
  'blockMass',
  'boardMass',
  'initialVelocity',
  'friction'
] as const;

function paramsFromUrl(
  raw: Record<string, number | string>
): Partial<BlockBoardParams> {
  const next: Partial<BlockBoardParams> = {};
  for (const key of NUMBER_KEYS) {
    if (raw[key] === undefined) continue;
    const number = Number(raw[key]);
    if (Number.isFinite(number)) next[key] = number;
  }
  for (const key of FLAG_KEYS) {
    if (raw[key] === undefined) continue;
    next[key] = asBoolean(raw[key]);
  }
  return next;
}

bootScenePage({
  meta: blockBoardMeta,
  // Keep the established auto-play default, but let an explicit URL
  // autoRun=0 remain paused from the first frame.
  shouldAutoPlay: (_params, urlParams) =>
    paramsFromUrl(urlParams).autoRun !== false,
  preferredLayout: 'split-right-graph-bottom',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 300,
    leftMaxWidth: 460,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: true,
    graphHeight: 236,
    graphMinHeight: 180,
    graphMaxHeight: 300,
    graphColumns: 1
  },
  createScene: ({ canvas, theme, mode, demoHints, urlParams }) => {
    if (!canvas) throw new Error('block-board requires a canvas');
    const scene = createBlockBoardScene({
      canvas,
      theme,
      mode,
      demoHints,
      initialParams: paramsFromUrl(urlParams ?? {})
    });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const boardScene = scene as ReturnType<typeof createBlockBoardScene>;
    const renderer = renderSchema({
      mount,
      schema: blockBoardControlsSchema,
      onChange: (key, value) => {
        if ((FLAG_KEYS as readonly string[]).includes(key)) {
          boardScene.setParams({
            [key]: asBoolean(value)
          } as Partial<BlockBoardParams>);
        } else if ((NUMBER_KEYS as readonly string[]).includes(key)) {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          boardScene.setParams({
            [key]: number
          } as Partial<BlockBoardParams>);
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
      if ((FLAG_KEYS as readonly string[]).includes(key)) {
        const on = asBoolean(value);
        ctx.scene.setParams({ [key]: on } as Partial<BlockBoardParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      if ((NUMBER_KEYS as readonly string[]).includes(key)) {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({
          [key]: number
        } as Partial<BlockBoardParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      return false;
    }
  }
});
