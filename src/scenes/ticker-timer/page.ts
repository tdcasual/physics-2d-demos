import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { tickerTimerControlsSchema } from './controls-schema';
import { asModel, createTickerTimerScene } from './scene.entry';
import { tickerTimerMeta } from './scene.meta';
import type { TickerTimerParams } from './scene.sim';

bootScenePage({
  meta: tickerTimerMeta,
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
    if (!canvas) throw new Error('ticker-timer requires a canvas');
    const scene = createTickerTimerScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const renderer = renderSchema({
      mount,
      schema: tickerTimerControlsSchema,
      onChange: (key, value) => {
        if (key === 'model') {
          const model = asModel(value) ?? 'ua';
          scene.setParams({ model });
          renderer.setActive('model', model);
          renderer.setValue('acceleration', scene.getParams().acceleration);
          writeParam?.(key, model);
        } else if (key === 'autoRun') {
          scene.setParams({ autoRun: Boolean(value) });
          writeParam?.(key, value ? 1 : 0);
        } else if (key === 'initialVelocity' || key === 'acceleration') {
          scene.setParams({
            [key]: Number(value)
          } as Partial<TickerTimerParams>);
          writeParam?.(key, value);
        }
        render();
      },
      onAction: (key) => {
        if (key === 'power') scene.powerOn();
        else if (key === 'release') scene.releaseTape();
        else if (key === 'reset') scene.reset();
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
      if (key === 'model') {
        const model = asModel(value) ?? 'ua';
        ctx.scene.setParams({ model });
        ctx.setControlActive('model', model);
        ctx.setControlValue('acceleration', ctx.scene.getParams().acceleration);
        return true;
      }
      if (key === 'initialVelocity' || key === 'acceleration') {
        const n = Number(value);
        if (Number.isFinite(n)) {
          ctx.scene.setParams({ [key]: n } as Partial<TickerTimerParams>);
          ctx.setControlValue(key, n);
        }
        return true;
      }
      if (key === 'autoRun') {
        const on = Number(value) > 0;
        ctx.scene.setParams({ autoRun: on });
        ctx.setControlValue(key, on);
        return true;
      }
      return false;
    }
  }
});
