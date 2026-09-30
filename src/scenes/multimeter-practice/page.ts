import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { MultimeterParams } from './scene.sim';
import { multimeterControlsSchema } from './controls-schema';
import {
  createMultimeterScene,
  asMeterMode,
  asMeterRange,
  asTarget
} from './scene.entry';
import { multimeterMeta } from './scene.meta';

const MODE_IDS = ['resistance', 'voltage', 'diode'] as const;
const TARGET_IDS = [
  'short',
  'resistor15',
  'resistor150',
  'resistor1500',
  'diodeForward',
  'diodeReverse',
  'battery15',
  'battery9'
] as const;
const RANGE_IDS = [
  'ohm1',
  'ohm10',
  'ohm100',
  'ohm1k',
  'volt2_5',
  'volt10'
] as const;

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

function decode<T extends string>(
  value: unknown,
  values: readonly T[]
): T | null {
  const raw = String(value);
  if (/^\d+$/.test(raw)) return values[Number(raw)] ?? null;
  return values.includes(raw as T) ? (raw as T) : null;
}

bootScenePage({
  meta: multimeterMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '测量读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('multimeter-practice requires a canvas');
    const scene = createMultimeterScene({ canvas, theme, mode, demoHints });
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
      schema: multimeterControlsSchema,
      onChange: (key, value) => {
        if (key === 'mode') {
          const mode = asMeterMode(value);
          if (!mode) return;
          scene.setParams({ mode });
          renderer.setActive(key, mode);
        } else if (key === 'target') {
          const target = asTarget(value);
          if (!target) return;
          scene.setParams({ target });
          renderer.setActive(key, target);
        } else if (key === 'range') {
          const range = asMeterRange(value);
          if (!range) return;
          scene.setParams({ range });
          renderer.setActive(key, range);
        } else if (key === 'autoRun')
          scene.setParams({ autoRun: asBoolean(value) });
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'autoConnect') scene.autoConnect();
        else if (key === 'disconnect') scene.disconnect();
        else if (key === 'calibrateZero') scene.calibrateZero();
        render();
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'mode') {
        const mode = decode(value, MODE_IDS);
        if (!mode) return false;
        ctx.scene.setParams({ mode });
        ctx.setControlActive(key, mode);
        return true;
      }
      if (key === 'target') {
        const target = decode(value, TARGET_IDS);
        if (!target) return false;
        ctx.scene.setParams({ target });
        ctx.setControlActive(key, target);
        return true;
      }
      if (key === 'range') {
        const range = decode(value, RANGE_IDS);
        if (!range) return false;
        ctx.scene.setParams({ range });
        ctx.setControlActive(key, range);
        return true;
      }
      if (key === 'connected' || key === 'autoRun') {
        ctx.scene.setParams({
          [key]: asBoolean(value)
        } as Partial<MultimeterParams>);
        if (key === 'autoRun') ctx.setControlValue(key, asBoolean(value));
        return true;
      }
      return false;
    }
  }
});
