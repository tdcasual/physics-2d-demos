import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { singleLoopControlsSchema } from './controls-schema';
import { createSingleLoopScene } from './scene.entry';
import { singleLoopMeta } from './scene.meta';
import type { SingleLoopParams } from './scene.sim';

bootScenePage({
  meta: singleLoopMeta,
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
    if (!canvas) throw new Error('single-loop requires a canvas');
    const scene = createSingleLoopScene({ canvas, theme, mode, demoHints });
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
      schema: singleLoopControlsSchema,
      onChange: (key, value) => {
        if (
          key === 'initialVelocity' ||
          key === 'fieldStrength' ||
          key === 'mass' ||
          key === 'resistance'
        ) {
          scene.setParams({
            [key]: Number(value)
          } as Partial<SingleLoopParams>);
          writeParam?.(key, value);
        } else if (key === 'autoRun' || key === 'showCurrent') {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<SingleLoopParams>);
          writeParam?.(key, value ? 1 : 0);
        }
        render();
      },
      onAction: () => {}
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
        key === 'initialVelocity' ||
        key === 'fieldStrength' ||
        key === 'mass' ||
        key === 'resistance'
      ) {
        const n = Number(value);
        if (!Number.isFinite(n)) return false;
        ctx.scene.setParams({ [key]: n } as Partial<SingleLoopParams>);
        ctx.setControlValue(key, n);
        return true;
      }
      if (key === 'autoRun' || key === 'showCurrent') {
        const on = Number(value) > 0;
        ctx.scene.setParams({ [key]: on } as Partial<SingleLoopParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      return false;
    }
  }
});
