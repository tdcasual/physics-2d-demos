import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { MicroDeformationParams } from './scene.sim';
import { microDeformationControlsSchema } from './controls-schema';
import {
  asDeformationMode,
  asMicroMaterial,
  createMicroDeformationScene
} from './scene.entry';
import { microDeformationMeta } from './scene.meta';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

bootScenePage({
  meta: microDeformationMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '形变读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('micro-deformation requires a canvas');
    const scene = createMicroDeformationScene({
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
      schema: microDeformationControlsSchema,
      onAction: () => render(),
      onChange: (key, value) => {
        if (key === 'material') {
          const material = asMicroMaterial(value);
          if (material) scene.setParams({ material });
        } else if (key === 'deformationMode') {
          const deformationMode = asDeformationMode(value);
          if (deformationMode) scene.setParams({ deformationMode });
        } else if (key === 'loadKg') {
          scene.setParams({ loadKg: Number(value) });
        } else if (key === 'mirrorGap' || key === 'screenDistance') {
          scene.setParams({
            [key]: Number(value)
          } as Partial<MicroDeformationParams>);
        } else if (key === 'showOpticalPath' || key === 'autoRun') {
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<MicroDeformationParams>);
        }
        render();
        writeParam?.(key, value);
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'material') {
        const material = asMicroMaterial(value);
        if (!material) return false;
        ctx.scene.setParams({ material });
        ctx.setControlActive(key, material);
        return true;
      }
      if (key === 'deformationMode') {
        const deformationMode = asDeformationMode(value);
        if (!deformationMode) return false;
        ctx.scene.setParams({ deformationMode });
        ctx.setControlActive(key, deformationMode);
        return true;
      }
      if (key === 'loadKg') {
        const loadKg = Number(value);
        if (!Number.isFinite(loadKg)) return false;
        ctx.scene.setParams({ loadKg });
        ctx.setControlActive(key, String(loadKg));
        return true;
      }
      if (key === 'showOpticalPath' || key === 'autoRun') {
        const enabled = asBoolean(value);
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<MicroDeformationParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<MicroDeformationParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
