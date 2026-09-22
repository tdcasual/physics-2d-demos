import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { AlternatingElectricDeflectionParams } from './scene.sim';
import { alternatingElectricDeflectionControlsSchema } from './controls-schema';
import {
  asDeflectionCharge,
  createAlternatingElectricDeflectionScene
} from './scene.entry';
import { alternatingElectricDeflectionMeta } from './scene.meta';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

const timingPresets: Record<string, number> = {
  t0: 0,
  tQuarter: 0.25,
  tHalf: 0.5,
  tThreeQuarter: 0.75,
  refire: 0
};

bootScenePage({
  meta: alternatingElectricDeflectionMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '运动读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas)
      throw new Error('alternating-electric-deflection requires a canvas');
    const scene = createAlternatingElectricDeflectionScene({
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
      schema: alternatingElectricDeflectionControlsSchema,
      onAction: (key) => {
        const phase = timingPresets[key];
        if (phase !== undefined) {
          const previous = scene.getParams();
          scene.reset();
          scene.setParams({ ...previous, releasePhase: phase, autoRun: true });
          renderer.setValue('releasePhase', phase);
        }
        render();
      },
      onChange: (key, value) => {
        if (
          key === 'voltageAmplitude' ||
          key === 'period' ||
          key === 'plateGap' ||
          key === 'flightDuration' ||
          key === 'releasePhase'
        ) {
          scene.setParams({
            [key]: Number(value)
          } as Partial<AlternatingElectricDeflectionParams>);
        } else if (key === 'charge') {
          const charge = asDeflectionCharge(value);
          if (charge) scene.setParams({ charge });
        } else if (
          key === 'autoRun' ||
          key === 'showVectors' ||
          key === 'showGhosts'
        ) {
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<AlternatingElectricDeflectionParams>);
        }
        render();
        writeParam?.(key, value);
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
      if (key === 'charge') {
        const charge = asDeflectionCharge(value);
        if (!charge) return false;
        ctx.scene.setParams({ charge });
        ctx.setControlValue(key, charge);
        return true;
      }
      if (key === 'autoRun' || key === 'showVectors' || key === 'showGhosts') {
        const enabled = asBoolean(value);
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<AlternatingElectricDeflectionParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({
        [key]: number
      } as Partial<AlternatingElectricDeflectionParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
