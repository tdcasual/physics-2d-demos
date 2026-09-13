import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { FrictionParams } from './scene.sim';
import { frictionControlsSchema } from './controls-schema';
import { createFrictionScene } from './scene.entry';
import { frictionMeta } from './scene.meta';
bootScenePage({
  meta: frictionMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '实时读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('friction-critical requires a canvas');
    const scene = createFrictionScene({ canvas, theme, mode, demoHints });
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
      schema: frictionControlsSchema,
      onChange: (key, value) => {
        const next =
          key === 'mode'
            ? { mode: String(value) as FrictionParams['mode'] }
            : key === 'autoRun'
              ? { autoRun: Boolean(value) }
              : { [key]: Number(value) };
        scene.setParams(next as Partial<FrictionParams>);
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'reset') {
          scene.reset();
          renderer.setActive('mode', 'single');
          renderer.setValue('force', 21.5);
          renderer.setValue('mass', 2);
          renderer.setValue('upperMass', 1);
          renderer.setValue('lowerMass', 2);
          renderer.setValue('muK', 0.4);
          renderer.setValue('autoRun', false);
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
      if (key === 'mode') {
        ctx.scene.setParams({
          mode: value === 'stacked' ? 'stacked' : 'single'
        });
        ctx.setControlValue(key, value);
        return true;
      }
      if (key === 'autoRun') {
        const flag = value === '1' || value === 'true';
        ctx.scene.setParams({ autoRun: flag });
        ctx.setControlValue(key, flag);
        return true;
      }
      const n = Number(value);
      if (!Number.isFinite(n)) return false;
      ctx.scene.setParams({ [key]: n } as Partial<FrictionParams>);
      ctx.setControlValue(key, n);
      return true;
    }
  }
});
