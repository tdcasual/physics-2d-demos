import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { variableWorkControlsSchema } from './controls-schema';
import { variableWorkMeta } from './scene.meta';
import { createVariableWorkScene } from './scene.entry';
import type { VariableWorkParams } from './scene.sim';
bootScenePage({
  meta: variableWorkMeta,
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
    if (!canvas) throw new Error('variable-work requires a canvas');
    const scene = createVariableWorkScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      step(dt: number) {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose() {
        scheduler.dispose();
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const renderer = renderSchema({
      mount,
      schema: variableWorkControlsSchema,
      onChange: (key, value) => {
        if (key === 'mode') {
          const mode =
            String(value) === 'power' || String(value) === 'piecewise'
              ? String(value)
              : 'linear';
          scene.setParams({ mode } as Partial<VariableWorkParams>);
          renderer.setActive(key, mode);
        } else if (key === 'autoRun')
          scene.setParams({ autoRun: Boolean(value) });
        else
          scene.setParams({
            [key]: Number(value)
          } as Partial<VariableWorkParams>);
        render();
        writeParam?.(key, value);
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
      if (key === 'mode') {
        const mode =
          String(value) === '1'
            ? 'power'
            : String(value) === '2'
              ? 'piecewise'
              : String(value);
        ctx.scene.setParams({ mode } as Partial<VariableWorkParams>);
        ctx.setControlValue(key, mode);
        return true;
      }
      if (key === 'autoRun') {
        ctx.scene.setParams({ autoRun: Number(value) > 0 });
        ctx.setControlValue(key, Number(value) > 0);
        return true;
      }
      const n = Number(value);
      if (!Number.isFinite(n)) return false;
      ctx.scene.setParams({ [key]: n } as Partial<VariableWorkParams>);
      ctx.setControlValue(key, n);
      return true;
    }
  }
});
