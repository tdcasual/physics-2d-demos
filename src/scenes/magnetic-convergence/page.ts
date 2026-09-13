import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { magneticConvergenceControlsSchema } from './controls-schema';
import { createMagneticConvergenceScene } from './scene.entry';
import { magneticConvergenceMeta } from './scene.meta';
import type { MagneticConvergenceParams } from './scene.sim';

bootScenePage({
  meta: magneticConvergenceMeta,
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
    if (!canvas) throw new Error('magnetic-convergence requires a canvas');
    const scene = createMagneticConvergenceScene({
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
    const renderer = renderSchema({
      mount,
      schema: magneticConvergenceControlsSchema,
      onChange: (key, value) => {
        if (key === 'mode') {
          const mode = String(value) as MagneticConvergenceParams['mode'];
          scene.setParams({ mode });
          renderer.setActive(key, mode);
        } else if (key === 'autoRun' || key === 'showField') {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<MagneticConvergenceParams>);
        } else if (key === 'radiusRatio' || key === 'particleCount') {
          scene.setParams({
            [key]: Number(value)
          } as Partial<MagneticConvergenceParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'emit') scene.emit();
        if (key === 'clear') scene.clear();
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
        const mode = Number(value) > 0 ? 'diverge' : 'converge';
        ctx.scene.setParams({ mode });
        ctx.setControlActive(key, mode);
        return true;
      }
      if (key === 'autoRun' || key === 'showField') {
        const enabled = Number(value) > 0;
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<MagneticConvergenceParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      if (key === 'radiusRatio' || key === 'particleCount') {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({
          [key]: number
        } as Partial<MagneticConvergenceParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      return false;
    }
  }
});
