import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { LaserSpeedParams } from './scene.sim';
import { laserSpeedControlsSchema } from './controls-schema';
import { createLaserSpeedScene } from './scene.entry';
import { laserSpeedMeta } from './scene.meta';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

bootScenePage({
  meta: laserSpeedMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '测量数据',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('laser-speed requires a canvas');
    const scene = createLaserSpeedScene({ canvas, theme, mode, demoHints });
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
      schema: laserSpeedControlsSchema,
      onChange: (key, value) => {
        if (
          key === 'autoRun' ||
          key === 'showPulses' ||
          key === 'showVectors'
        ) {
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<LaserSpeedParams>);
        } else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          scene.setParams({ [key]: number } as Partial<LaserSpeedParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'reset') scene.reset();
        render();
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'autoRun' || key === 'showPulses' || key === 'showVectors') {
        const enabled = asBoolean(value);
        ctx.scene.setParams({ [key]: enabled } as Partial<LaserSpeedParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<LaserSpeedParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
