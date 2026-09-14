import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { VelocitySelectorParams } from './scene.sim';
import { velocitySelectorControlsSchema } from './controls-schema';
import { asSelectorCharge, createVelocitySelectorScene } from './scene.entry';
import { velocitySelectorMeta } from './scene.meta';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

bootScenePage({
  meta: velocitySelectorMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '受力读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('velocity-selector requires a canvas');
    const scene = createVelocitySelectorScene({
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
      schema: velocitySelectorControlsSchema,
      onAction: () => {
        render();
      },
      onChange: (key, value) => {
        if (
          key === 'electricField' ||
          key === 'magneticField' ||
          key === 'initialSpeed' ||
          key === 'plateGap'
        ) {
          scene.setParams({
            [key]: Number(value)
          } as Partial<VelocitySelectorParams>);
        } else if (key === 'charge') {
          const charge = asSelectorCharge(value);
          if (charge) scene.setParams({ charge });
        } else if (
          key === 'autoRun' ||
          key === 'showField' ||
          key === 'showVectors'
        ) {
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<VelocitySelectorParams>);
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
        const charge = asSelectorCharge(value);
        if (!charge) return false;
        ctx.scene.setParams({ charge });
        ctx.setControlValue(key, charge);
        return true;
      }
      if (key === 'autoRun' || key === 'showField' || key === 'showVectors') {
        const enabled = asBoolean(value);
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<VelocitySelectorParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<VelocitySelectorParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
