import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import {
  asPhotoelectricMaterial,
  createPhotoelectricScene,
  photoelectricMaterialIndex
} from './scene.entry';
import { photoelectricControlsSchema } from './controls-schema';
import { photoelectricSwitchMeta } from './scene.meta';
import type { PhotoelectricParams } from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

const booleanKeys = new Set(['autoRun', 'showVectors']);

bootScenePage({
  meta: photoelectricSwitchMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '实验数据',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('photoelectric-switch requires a canvas');
    const scene = createPhotoelectricScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
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
      onChange: (key, value) => {
        if (key === 'material') {
          const material = asPhotoelectricMaterial(value);
          if (!material) return;
          scene.setParams({ material });
          renderer.setActive(key, material);
        } else if (booleanKeys.has(key)) {
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<PhotoelectricParams>);
        } else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          scene.setParams({ [key]: number } as Partial<PhotoelectricParams>);
        }
        render();
        writeParam?.(
          key,
          key === 'material'
            ? photoelectricMaterialIndex(scene.getParams().material)
            : value
        );
      },
      onAction: (key) => {
        if (key === 'reset') {
          scene.reset();
          const resetParams = scene.getParams();
          Object.entries(resetParams).forEach(([paramKey, paramValue]) =>
            renderer.setValue(paramKey, paramValue)
          );
          renderer.setActive('material', resetParams.material);
        }
        render();
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'material') {
        const material = asPhotoelectricMaterial(value);
        if (!material) return false;
        ctx.scene.setParams({ material });
        ctx.setControlActive(key, material);
        return true;
      }
      if (booleanKeys.has(key)) {
        const enabled = asBoolean(value);
        ctx.scene.setParams({ [key]: enabled } as Partial<PhotoelectricParams>);
        ctx.setControlValue(key, enabled);
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
