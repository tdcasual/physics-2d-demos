import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { PendulumParams } from './scene.sim';
import { pendulumControlsSchema } from './controls-schema';
import { createPendulumScene } from './scene.entry';
import { pendulumPeriodMeta } from './scene.meta';

const ENVIRONMENTS: Record<string, number> = {
  earth: 9.8,
  moon: 1.63,
  mars: 3.71
};

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

bootScenePage({
  meta: pendulumPeriodMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '实验读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('pendulum-period requires a canvas');
    const scene = createPendulumScene({ canvas, theme, mode, demoHints });
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
      schema: pendulumControlsSchema,
      onChange: (key, value) => {
        if (key === 'environment') {
          const id = String(value);
          const gravity = ENVIRONMENTS[id];
          if (gravity === undefined) return;
          scene.setParams({ gravity });
          renderer.setValue('gravity', gravity);
          renderer.setActive('environment', id);
        } else if (
          key === 'autoRun' ||
          key === 'showForces' ||
          key === 'showComponents'
        ) {
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<PendulumParams>);
        } else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          scene.setParams({ [key]: number } as Partial<PendulumParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'startPhotogate') scene.startPhotogate();
        else if (key === 'resetMeasurement') scene.resetMeasurement();
        else if (key === 'resetSmallAngle') {
          scene.resetSmallAngle();
          renderer.setValue('amplitude', 5);
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
      if (key === 'environment') {
        const id = String(value);
        const gravity = ENVIRONMENTS[id];
        if (gravity === undefined) return false;
        ctx.scene.setParams({ gravity });
        ctx.setControlValue('gravity', gravity);
        ctx.setControlActive(key, id);
        return true;
      }
      if (
        key === 'autoRun' ||
        key === 'showForces' ||
        key === 'showComponents'
      ) {
        const enabled = asBoolean(value);
        ctx.scene.setParams({ [key]: enabled } as Partial<PendulumParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<PendulumParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
