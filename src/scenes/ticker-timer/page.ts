import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { readSceneParams } from '../../app/url-sync';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { tickerTimerControlsSchema } from './controls-schema';
import { asModel, createTickerTimerScene } from './scene.entry';
import { tickerTimerMeta } from './scene.meta';
import type { TickerTimerParams } from './scene.sim';

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === '1' || v === 'true' || v === 'on' || v === 'yes') return true;
    if (v === '0' || v === 'false' || v === 'off' || v === 'no' || v === '')
      return false;
  }
  return fallback;
}

const rawInitialParams = readSceneParams(tickerTimerMeta);
const initialParams: Partial<TickerTimerParams> = {};
const initialModel = asModel(rawInitialParams.model);
if (initialModel !== undefined) initialParams.model = initialModel;
for (const key of ['initialVelocity', 'acceleration'] as const) {
  const value = Number(rawInitialParams[key]);
  if (Number.isFinite(value)) initialParams[key] = value;
}
if (rawInitialParams.autoRun !== undefined)
  initialParams.autoRun = asBool(rawInitialParams.autoRun);

bootScenePage({
  meta: tickerTimerMeta,
  autoPlay: initialParams.autoRun !== false,
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
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('ticker-timer requires a canvas');
    const scene = createTickerTimerScene({
      canvas,
      theme,
      mode,
      demoHints,
      initialParams
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
    const renderer = renderSchema({
      mount,
      schema: tickerTimerControlsSchema,
      onChange: (key, value) => {
        if (key === 'model') {
          const nextModel = asModel(value) ?? 'ua';
          scene.setParams({ model: nextModel });
          renderer.setActive('model', nextModel);
          renderer.setValue('acceleration', scene.getParams().acceleration);
          writeParam?.(key, nextModel);
        } else if (key === 'autoRun') {
          const on = asBool(value, true);
          scene.setParams({ autoRun: on });
          writeParam?.(key, on ? 1 : 0);
        } else if (key === 'initialVelocity' || key === 'acceleration') {
          scene.setParams({
            [key]: Number(value)
          } as Partial<TickerTimerParams>);
          writeParam?.(key, value);
        }
        render();
      },
      onAction: (key) => {
        if (key === 'power') scene.powerOn();
        else if (key === 'release') scene.releaseTape();
        else if (key === 'reset') {
          scene.reset();
          const params = scene.getParams();
          renderer.setActive('model', params.model);
          renderer.setValue('initialVelocity', params.initialVelocity);
          renderer.setValue('acceleration', params.acceleration);
          renderer.setValue('autoRun', params.autoRun);
        }
        render();
      }
    });
    return {
      setValue: (key: string, value: number | string | boolean) =>
        renderer.setValue(key, value),
      setActive: (key: string, value: string) => renderer.setActive(key, value),
      dispose: () => renderer.dispose()
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'model') {
        const nextModel = asModel(value) ?? 'ua';
        ctx.scene.setParams({ model: nextModel });
        ctx.setControlActive('model', nextModel);
        ctx.setControlValue('acceleration', ctx.scene.getParams().acceleration);
        return true;
      }
      if (key === 'initialVelocity' || key === 'acceleration') {
        const n = Number(value);
        if (Number.isFinite(n)) {
          ctx.scene.setParams({ [key]: n } as Partial<TickerTimerParams>);
          ctx.setControlValue(key, n);
        }
        return true;
      }
      if (key === 'autoRun') {
        const on = asBool(value);
        ctx.scene.setParams({ autoRun: on });
        ctx.setControlValue(key, on);
        return true;
      }
      return false;
    }
  }
});
