import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';

import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { precisionToolControlsSchema } from './controls-schema';
import { asPrecisionMode, createPrecisionToolScene } from './scene.entry';
import { precisionToolMeta } from './scene.meta';
import { asBool, type PrecisionToolParams } from './scene.sim';

function asFiniteNumber(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function paramsFromUrl(
  raw: Record<string, number | string>
): Partial<PrecisionToolParams> {
  const next: Partial<PrecisionToolParams> = {};
  const mode = asPrecisionMode(raw.mode);
  if (mode !== undefined) next.mode = mode;
  const adj = asFiniteNumber(raw.adjustment);
  if (adj !== undefined) next.adjustment = adj;
  for (const key of ['autoRun', 'showGuides', 'showReading'] as const) {
    if (raw[key] !== undefined) next[key] = asBool(raw[key], true);
  }
  return next;
}

function syncControls(
  renderer: ReturnType<typeof renderSchema>,
  params: PrecisionToolParams
): void {
  renderer.setActiveSilently('mode', params.mode);
  renderer.setValueSilently('adjustment', params.adjustment);
  renderer.setValueSilently('autoRun', params.autoRun);
  renderer.setValueSilently('showGuides', params.showGuides);
  renderer.setValueSilently('showReading', params.showReading);
}

bootScenePage({
  meta: precisionToolMeta,
  shouldAutoPlay: (_params, urlParams) =>
    paramsFromUrl(urlParams).autoRun !== false,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints, urlParams }) => {
    if (!canvas) throw new Error('precision-tools requires a canvas');
    const scene = createPrecisionToolScene({
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
    const toolScene = scene as ReturnType<typeof createPrecisionToolScene>;
    const render = scheduleRender ?? (() => toolScene.render());
    const renderer = renderSchema({
      mount,
      schema: precisionToolControlsSchema,
      onChange: (key, value) => {
        if (key === 'mode') {
          const next = asPrecisionMode(value) ?? 'caliper50';
          toolScene.setParams({ mode: next });
          renderer.setActive(key, next);
          writeParam?.(key, next);
        } else if (key === 'adjustment') {
          const n = Number(value);
          if (Number.isFinite(n)) {
            toolScene.setParams({ adjustment: n });
            writeParam?.(key, n);
          }
        } else if (
          key === 'autoRun' ||
          key === 'showGuides' ||
          key === 'showReading'
        ) {
          const on = asBool(value, true);
          toolScene.setParams({ [key]: on } as Partial<PrecisionToolParams>);
          writeParam?.(key, on ? 1 : 0);
        }
        render();
      },
      onAction: () => {}
    });
    return {
      ...exposeSchemaHandle(renderer),
      syncFromScene: () => syncControls(renderer, toolScene.getParams())
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'mode') {
        const next = asPrecisionMode(value) ?? 'caliper50';
        ctx.scene.setParams({ mode: next });
        ctx.setControlActive('mode', next);
        return true;
      }
      if (key === 'adjustment') {
        const n = Number(value);
        if (Number.isFinite(n)) {
          ctx.scene.setParams({ adjustment: n });
          ctx.setControlValue(key, n);
        }
        return true;
      }
      if (key === 'autoRun' || key === 'showGuides' || key === 'showReading') {
        const on = asBool(value, true);
        ctx.scene.setParams({ [key]: on } as Partial<PrecisionToolParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      return false;
    }
  }
});
