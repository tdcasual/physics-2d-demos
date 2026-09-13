import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { BoundedMagneticParams } from './scene.sim';
import { boundedMagneticControlsSchema } from './controls-schema';
import { createBoundedMagneticScene } from './scene.entry';
import { boundedMagneticMeta } from './scene.meta';
bootScenePage({
  meta: boundedMagneticMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '实时数据看板',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('bounded-magnetic requires a canvas');
    const scene = createBoundedMagneticScene({
      canvas,
      theme,
      mode,
      demoHints
    });
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
      schema: boundedMagneticControlsSchema,
      onChange: (key, value) => {
        if (key === 'shape' || key === 'model') {
          scene.setParams({
            [key]: String(value)
          } as Partial<BoundedMagneticParams>);
          renderer.setActive(key, String(value));
        } else {
          scene.setParams({
            [key]:
              key === 'autoRun' || key === 'showVectors'
                ? Boolean(value)
                : Number(value)
          } as Partial<BoundedMagneticParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'emit' || key === 'clear') scene.reset();
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
      if (key === 'shape' || key === 'model') {
        const text = String(value);
        const valid =
          key === 'shape'
            ? ['half-plane', 'circle', 'triangle']
            : ['standard', 'rotate', 'scale'];
        if (!valid.includes(text)) return false;
        ctx.scene.setParams({ [key]: text } as Partial<BoundedMagneticParams>);
        ctx.setControlActive(key, text);
        return true;
      }
      if (key === 'autoRun' || key === 'showVectors') {
        const enabled =
          value === 1 ||
          value === '1' ||
          String(value).toLowerCase() === 'true';
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<BoundedMagneticParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<BoundedMagneticParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
