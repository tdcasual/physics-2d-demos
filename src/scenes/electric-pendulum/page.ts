import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { electricPendulumControlsSchema } from './controls-schema';
import { electricPendulumMeta } from './scene.meta';
import { createElectricPendulumScene } from './scene.entry';
import type { PendulumMode, PendulumParams } from './scene.sim';
bootScenePage({
  meta: electricPendulumMeta,
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
    if (!canvas) throw new Error('electric-pendulum requires a canvas');
    const scene = createElectricPendulumScene({
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
      schema: electricPendulumControlsSchema,
      onChange: (key, value) => {
        if (key === 'mode') {
          const mode = String(value) as PendulumMode;
          scene.setParams({ mode });
          renderer.setActive(key, mode);
        } else if (key === 'showForces' || key === 'showVelocity')
          scene.setParams({ [key]: Boolean(value) } as Partial<PendulumParams>);
        else scene.setParams({ voltage: Number(value) });
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
      if (key === 'mode') {
        const raw = String(value);
        const mode =
          raw === '1'
            ? 'oscillate'
            : raw === '2'
              ? 'explore'
              : (raw as PendulumMode);
        ctx.scene.setParams({ mode });
        ctx.setControlActive(key, mode);
        return true;
      }
      if (key === 'showForces' || key === 'showVelocity') {
        const enabled = Number(value) > 0;
        ctx.scene.setParams({ [key]: enabled } as Partial<PendulumParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ voltage: number });
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
