import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';

import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { createOscilloscopeScene } from './scene.entry';
import { oscilloscopeMeta } from './scene.meta';
import { oscilloscopeControlsSchema } from './controls-schema';
import type { OscilloscopeParams } from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

const FLAG_KEYS = ['scanEnabled', 'autoRun'] as const;
const NUMBER_KEYS = [
  'signalAmplitude',
  'signalFrequency',
  'scanAmplitude',
  'scanFrequency'
] as const;

function paramsFromUrl(
  raw: Record<string, number | string>
): Partial<OscilloscopeParams> {
  const next: Partial<OscilloscopeParams> = {};
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
  meta: oscilloscopeMeta,
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
    graphHeight: 280,
    graphMinHeight: 200,
    graphMaxHeight: 340,
    graphColumns: 1
  },
  createScene: ({ canvas, theme, mode, demoHints, urlParams }) => {
    if (!canvas) throw new Error('oscilloscope requires a canvas');
    const scene = createOscilloscopeScene({
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
    const scopeScene = scene as ReturnType<typeof createOscilloscopeScene>;
    const renderer = renderSchema({
      mount,
      schema: oscilloscopeControlsSchema,
      onChange: (key, value) => {
        if ((FLAG_KEYS as readonly string[]).includes(key)) {
          scopeScene.setParams({
            [key]: asBoolean(value)
          } as Partial<OscilloscopeParams>);
        } else if ((NUMBER_KEYS as readonly string[]).includes(key)) {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          scopeScene.setParams({
            [key]: number
          } as Partial<OscilloscopeParams>);
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
        ctx.scene.setParams({ [key]: on } as Partial<OscilloscopeParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      if ((NUMBER_KEYS as readonly string[]).includes(key)) {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({
          [key]: number
        } as Partial<OscilloscopeParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      return false;
    }
  }
});
