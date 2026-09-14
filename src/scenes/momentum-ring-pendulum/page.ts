import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { RingPendulumParams } from './scene.sim';
import { ringPendulumControlsSchema } from './controls-schema';
import { asBool, createRingPendulumScene } from './scene.entry';
import { ringPendulumMeta } from './scene.meta';
bootScenePage({
  meta: ringPendulumMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '动量读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('momentum-ring-pendulum requires a canvas');
    const scene = createRingPendulumScene({ canvas, theme, mode, demoHints });
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
      schema: ringPendulumControlsSchema,
      onAction: () => render(),
      onChange: (key, value) => {
        if (key === 'showForces' || key === 'showTrail' || key === 'autoRun')
          scene.setParams({
            [key]: asBool(value)
          } as Partial<RingPendulumParams>);
        else
          scene.setParams({
            [key]: Number(value)
          } as Partial<RingPendulumParams>);
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
      if (key === 'showForces' || key === 'showTrail' || key === 'autoRun') {
        ctx.scene.setParams({
          [key]: asBool(value)
        } as Partial<RingPendulumParams>);
        ctx.setControlValue(key, asBool(value));
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<RingPendulumParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
