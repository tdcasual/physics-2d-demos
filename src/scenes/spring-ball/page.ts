import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { springBallControlsSchema } from './controls-schema';
import { asMode, asPreset, createSpringBallScene } from './scene.entry';
import { springBallMeta } from './scene.meta';
import type { SpringBallParams } from './scene.sim';

bootScenePage({
  meta: springBallMeta,
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
    if (!canvas) throw new Error('spring-ball requires a canvas');
    const scene = createSpringBallScene({ canvas, theme, mode, demoHints });
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
      schema: springBallControlsSchema,
      onChange: (key, value) => {
        if (key === 'preset') {
          const preset = asPreset(value) ?? 'h0';
          scene.setParams({ preset });
          renderer.setActive('preset', preset);
          renderer.setValue('releaseHeight', scene.getParams().releaseHeight);
          writeParam?.(key, ['h0', 'h-x0', 'h-2x0', 'h-3x0'].indexOf(preset));
        } else if (key === 'mode') {
          const next = asMode(value) ?? 'single';
          scene.setParams({ mode: next });
          renderer.setActive('mode', next);
          writeParam?.(key, next === 'continuous' ? 1 : 0);
        } else if (key === 'releaseHeight') {
          scene.setParams({ releaseHeight: Number(value) });
          writeParam?.(key, value);
        } else if (key === 'autoRun' || key === 'slow') {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<SpringBallParams>);
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
      if (key === 'preset') {
        const preset = asPreset(value) ?? 'h0';
        ctx.scene.setParams({ preset });
        ctx.setControlActive('preset', preset);
        ctx.setControlValue(
          'releaseHeight',
          ctx.scene.getParams().releaseHeight
        );
        return true;
      }
      if (key === 'mode') {
        const next = asMode(value) ?? 'single';
        ctx.scene.setParams({ mode: next });
        ctx.setControlActive('mode', next);
        return true;
      }
      if (key === 'releaseHeight') {
        const n = Number(value);
        if (Number.isFinite(n)) {
          ctx.scene.setParams({ releaseHeight: n });
          ctx.setControlValue(key, n);
        }
        return true;
      }
      if (key === 'autoRun' || key === 'slow') {
        const on = Number(value) > 0;
        ctx.scene.setParams({ [key]: on } as Partial<SpringBallParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      return false;
    }
  }
});
