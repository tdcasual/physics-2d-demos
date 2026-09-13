import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { clothesRodControlsSchema } from './controls-schema';
import { clothesRodMeta } from './scene.meta';
import { createClothesRodScene } from './scene.entry';
import type { RodParams } from './scene.sim';
bootScenePage({
  meta: clothesRodMeta,
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
    if (!canvas) throw new Error('clothes-rod requires a canvas');
    const scene = createClothesRodScene({ canvas, theme, mode, demoHints });
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
      schema: clothesRodControlsSchema,
      onChange: (key, value) => {
        if (key === 'model') {
          scene.setParams({ model: String(value) as RodParams['model'] });
          renderer.setActive(key, String(value));
        } else scene.setParams({ [key]: Number(value) } as Partial<RodParams>);
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
      if (key === 'model') {
        const model =
          String(value) === '1'
            ? 'fixed'
            : (String(value) as RodParams['model']);
        ctx.scene.setParams({ model });
        ctx.setControlActive(key, model);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<RodParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
