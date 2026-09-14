import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { airTrackMomentumControlsSchema } from './controls-schema';
import { createAirTrackMomentumScene } from './scene.entry';
import { airTrackMomentumMeta } from './scene.meta';
import type { AirTrackMomentumParams } from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}
const booleanKeys = new Set(['autoRun', 'showVectors']);
const enumKeys = new Set(['mode', 'preset']);

const modeValues = ['conservation', 'theorem'] as const;
const presetValues = [
  'equalElastic',
  'heavyMoving',
  'lightMoving',
  'inelastic'
] as const;
function enumValue(key: string, value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) {
    if (key === 'mode') return modeValues[value] ?? undefined;
    if (key === 'preset') return presetValues[value] ?? undefined;
  }
  if (typeof value === 'string') return value;
  return undefined;
}

bootScenePage({
  meta: airTrackMomentumMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '实验数据',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('air-track-momentum requires a canvas');
    const scene = createAirTrackMomentumScene({
      canvas,
      theme,
      mode,
      demoHints
    });
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
      schema: airTrackMomentumControlsSchema,
      onChange: (key, value) => {
        if (booleanKeys.has(key))
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<AirTrackMomentumParams>);
        else if (enumKeys.has(key))
          scene.setParams({
            [key]: String(value)
          } as Partial<AirTrackMomentumParams>);
        else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          scene.setParams({ [key]: number } as Partial<AirTrackMomentumParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'relaunch') scene.relaunch();
        if (key === 'reset') {
          scene.reset();
          const params = scene.getParams();
          Object.entries(params).forEach(([paramKey, paramValue]) => {
            if (enumKeys.has(paramKey))
              renderer.setActive(paramKey, String(paramValue));
            else renderer.setValue(paramKey, paramValue);
          });
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
      if (booleanKeys.has(key)) {
        const enabled = asBoolean(value);
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<AirTrackMomentumParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      if (enumKeys.has(key)) {
        const selected = enumValue(key, value);
        if (!selected) return false;
        ctx.scene.setParams({
          [key]: selected
        } as Partial<AirTrackMomentumParams>);
        ctx.setControlActive(key, selected);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<AirTrackMomentumParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
