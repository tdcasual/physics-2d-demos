import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { MaxwellParams } from './scene.sim';
import { maxwellControlsSchema } from './controls-schema';
import { asBool, createMaxwellScene } from './scene.entry';
import { maxwellMeta } from './scene.meta';
bootScenePage({
  meta: maxwellMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '速率读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas)
      throw new Error('maxwell-speed-distribution requires a canvas');
    const scene = createMaxwellScene({ canvas, theme, mode, demoHints });
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
      schema: maxwellControlsSchema,
      onAction: () => render(),
      onChange: (key, value) => {
        if (key === 'autoRun') scene.setParams({ autoRun: asBool(value) });
        else
          scene.setParams({ [key]: Number(value) } as Partial<MaxwellParams>);
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
      if (key === 'autoRun') {
        const autoRun = asBool(value);
        ctx.scene.setParams({ autoRun });
        ctx.setControlValue(key, autoRun);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<MaxwellParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
