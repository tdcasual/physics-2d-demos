import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createDisplacementTimeScene } from './scene.entry';
import { displacementTimeMeta } from './scene.meta';
import { displacementTimeControlsSchema } from './controls-schema';
import type { DisplacementTimeParams } from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

bootScenePage({
  meta: displacementTimeMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 290,
    leftMaxWidth: 440,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('displacement-time requires a canvas');
    const scene = createDisplacementTimeScene({
      canvas,
      theme,
      mode,
      demoHints
    });
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
    const dtScene = scene as ReturnType<typeof createDisplacementTimeScene>;
    const renderer = renderSchema({
      mount,
      schema: displacementTimeControlsSchema,
      onChange: (key, value) => {
        if (key === 'autoRun' || key === 'showArea') {
          dtScene.setParams({
            [key]: asBoolean(value)
          } as Partial<DisplacementTimeParams>);
        } else if (key === 'v0' || key === 'acceleration') {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          dtScene.setParams({
            [key]: number
          } as Partial<DisplacementTimeParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });
    return {
      setValue(key: string, value: number | string | boolean): void {
        renderer.setValue(key, value);
      },
      setActive(key: string, value: string): void {
        renderer.setActive(key, value);
      },
      dispose(): void {
        renderer.dispose();
      }
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'autoRun' || key === 'showArea') {
        const on = asBoolean(value);
        ctx.scene.setParams({ [key]: on } as Partial<DisplacementTimeParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      if (key === 'v0' || key === 'acceleration') {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({
          [key]: number
        } as Partial<DisplacementTimeParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      return false;
    }
  }
});
