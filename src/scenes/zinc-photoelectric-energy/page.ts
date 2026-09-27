import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { ZincPhotoelectricParams } from './scene.sim';
import { zincPhotoelectricControlsSchema } from './controls-schema';
import { asChargeState, createZincPhotoelectricScene } from './scene.entry';
import { zincPhotoelectricMeta } from './scene.meta';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}
bootScenePage({
  meta: zincPhotoelectricMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '能量读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('zinc-photoelectric-energy requires a canvas');
    const scene = createZincPhotoelectricScene({
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
      schema: zincPhotoelectricControlsSchema,
      onAction: () => render(),
      onChange: (key, value) => {
        if (key === 'chargeState') {
          const chargeState = asChargeState(value);
          if (chargeState) scene.setParams({ chargeState });
        } else if (key === 'autoRun')
          scene.setParams({ autoRun: asBoolean(value) });
        else if (key === 'wavelength' || key === 'intensity')
          scene.setParams({
            [key]: Number(value)
          } as Partial<ZincPhotoelectricParams>);
        render();
        writeParam?.(key, value);
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'chargeState') {
        const chargeState = asChargeState(value);
        if (!chargeState) return false;
        ctx.scene.setParams({ chargeState });
        ctx.setControlActive(key, chargeState);
        return true;
      }
      if (key === 'autoRun') {
        const autoRun = asBoolean(value);
        ctx.scene.setParams({ autoRun });
        ctx.setControlValue(key, autoRun);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({
        [key]: number
      } as Partial<ZincPhotoelectricParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
