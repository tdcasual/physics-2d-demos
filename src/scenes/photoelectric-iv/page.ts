import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { PhotoelectricParams } from './scene.sim';
import { photoelectricControlsSchema } from './controls-schema';
import { asPhotoCathode, createPhotoelectricScene } from './scene.entry';
import { photoelectricMeta } from './scene.meta';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}
bootScenePage({
  meta: photoelectricMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '光电读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('photoelectric-iv requires a canvas');
    const scene = createPhotoelectricScene({ canvas, theme, mode, demoHints });
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
      schema: photoelectricControlsSchema,
      onAction: () => render(),
      onChange: (key, value) => {
        if (key === 'cathode') {
          const cathode = asPhotoCathode(value);
          if (cathode) scene.setParams({ cathode });
        } else if (
          key === 'wavelength' ||
          key === 'intensity' ||
          key === 'voltage'
        )
          scene.setParams({
            [key]: Number(value)
          } as Partial<PhotoelectricParams>);
        else if (key === 'autoRun')
          scene.setParams({ autoRun: asBoolean(value) });
        render();
        writeParam?.(key, value);
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'cathode') {
        const cathode = asPhotoCathode(value);
        if (!cathode) return false;
        ctx.scene.setParams({ cathode });
        ctx.setControlActive(key, cathode);
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
      ctx.scene.setParams({ [key]: number } as Partial<PhotoelectricParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
