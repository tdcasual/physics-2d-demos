import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { AlternatingElectricFieldParams } from './scene.sim';
import { alternatingElectricFieldControlsSchema } from './controls-schema';
import {
  asAlternatingCharge,
  createAlternatingElectricFieldScene
} from './scene.entry';
import { alternatingElectricFieldMeta } from './scene.meta';

bootScenePage({
  meta: alternatingElectricFieldMeta,
  autoPlay: true,
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
    if (!canvas)
      throw new Error('alternating-electric-field requires a canvas');
    const scene = createAlternatingElectricFieldScene({
      canvas,
      theme,
      mode,
      demoHints
    });
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
    const renderer = renderSchema({
      mount,
      schema: alternatingElectricFieldControlsSchema,
      onAction: (key) => {
        if (key === 'start') scene.setParams({ phaseOffset: 0 });
        else if (key === 'quarter') scene.setParams({ phaseOffset: 0.25 });
        else if (key === 'reverse') scene.setParams({ phaseOffset: 0.375 });
        render();
      },
      onChange: (key, value) => {
        if (
          key === 'voltageAmplitude' ||
          key === 'period' ||
          key === 'plateGap' ||
          key === 'phaseOffset'
        ) {
          scene.setParams({
            [key]: Number(value)
          } as Partial<AlternatingElectricFieldParams>);
        } else if (key === 'charge') {
          const charge = asAlternatingCharge(value);
          if (charge) scene.setParams({ charge });
        } else if (
          key === 'autoRun' ||
          key === 'showFieldLines' ||
          key === 'showVelocityVector'
        ) {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<AlternatingElectricFieldParams>);
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
      if (
        key === 'voltageAmplitude' ||
        key === 'period' ||
        key === 'plateGap' ||
        key === 'phaseOffset'
      ) {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({
          [key]: number
        } as Partial<AlternatingElectricFieldParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      if (key === 'charge') {
        const charge = asAlternatingCharge(value);
        if (!charge) return false;
        ctx.scene.setParams({ charge });
        ctx.setControlValue(key, charge);
        return true;
      }
      if (
        key === 'autoRun' ||
        key === 'showFieldLines' ||
        key === 'showVelocityVector'
      ) {
        const enabled =
          value === 1 ||
          value === '1' ||
          String(value).toLowerCase() === 'true';
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<AlternatingElectricFieldParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      return false;
    }
  }
});
