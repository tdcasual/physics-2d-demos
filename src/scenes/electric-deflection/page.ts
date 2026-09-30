import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { electricDeflectionControlsSchema } from './controls-schema';
import {
  asDeflectionParticle,
  createElectricDeflectionScene
} from './scene.entry';
import { electricDeflectionMeta } from './scene.meta';
import type { ElectricDeflectionParams } from './scene.sim';

bootScenePage({
  meta: electricDeflectionMeta,
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
    if (!canvas) throw new Error('electric-deflection requires a canvas');
    const scene = createElectricDeflectionScene({
      canvas,
      theme,
      mode,
      demoHints
    });
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
      schema: electricDeflectionControlsSchema,
      onAction: () => {},
      onChange: (key, value) => {
        if (key === 'particle') {
          const particle = asDeflectionParticle(value);
          if (particle) scene.setParams({ particle });
        } else if (
          key === 'voltage' ||
          key === 'plateGap' ||
          key === 'initialSpeed'
        ) {
          scene.setParams({
            [key]: Number(value)
          } as Partial<ElectricDeflectionParams>);
        } else if (
          key === 'autoRun' ||
          key === 'showField' ||
          key === 'showComponents'
        ) {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<ElectricDeflectionParams>);
        }
        render();
        writeParam?.(key, value);
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'particle') {
        const particle = asDeflectionParticle(value);
        if (!particle) return false;
        ctx.scene.setParams({ particle });
        ctx.setControlValue(key, particle);
        return true;
      }
      if (key === 'voltage' || key === 'plateGap' || key === 'initialSpeed') {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({
          [key]: number
        } as Partial<ElectricDeflectionParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      if (
        key === 'autoRun' ||
        key === 'showField' ||
        key === 'showComponents'
      ) {
        const enabled =
          value === 1 ||
          value === '1' ||
          String(value).toLowerCase() === 'true';
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<ElectricDeflectionParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      return false;
    }
  }
});
