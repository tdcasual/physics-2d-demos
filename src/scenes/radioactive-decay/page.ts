import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { RadioactiveParams } from './scene.sim';
import { radioactiveControlsSchema } from './controls-schema';
import { createRadioactiveScene } from './scene.entry';
import { radioactiveMeta } from './scene.meta';
function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}
bootScenePage({
  meta: radioactiveMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '衰变读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('radioactive-decay requires a canvas');
    const scene = createRadioactiveScene({ canvas, theme, mode, demoHints });
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
      schema: radioactiveControlsSchema,
      onAction: () => render(),
      onChange: (key, value) => {
        if (key === 'autoRun') scene.setParams({ autoRun: asBoolean(value) });
        else if (key === 'halfLife')
          scene.setParams({
            halfLife: Number(value)
          } as Partial<RadioactiveParams>);
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
        const autoRun = asBoolean(value);
        ctx.scene.setParams({ autoRun });
        ctx.setControlValue(key, autoRun);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<RadioactiveParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
