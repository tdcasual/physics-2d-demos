import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { UniformElectricAccelerationParams } from './scene.sim';
import { uniformElectricAccelerationControlsSchema } from './controls-schema';
import { createUniformElectricAccelerationScene } from './scene.entry';
import { uniformElectricAccelerationMeta } from './scene.meta';

bootScenePage({
  meta: uniformElectricAccelerationMeta,
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
    if (!canvas)
      throw new Error('uniform-electric-acceleration requires a canvas');
    const scene = createUniformElectricAccelerationScene({
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
      schema: uniformElectricAccelerationControlsSchema,
      onAction: (key) => {
        if (key === 'narrow') scene.setParams({ plateGap: 6 });
        else if (key === 'wide') scene.setParams({ plateGap: 18 });
        else if (key === 'reset') scene.reset();
        render();
      },
      onChange: (key, value) => {
        if (
          key === 'voltage' ||
          key === 'plateGap' ||
          key === 'charge' ||
          key === 'mass'
        ) {
          scene.setParams({
            [key]: Number(value)
          } as Partial<UniformElectricAccelerationParams>);
        } else if (key === 'autoRun' || key === 'showVectors') {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<UniformElectricAccelerationParams>);
        }
        render();
        writeParam?.(key, value);
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (
        key === 'voltage' ||
        key === 'plateGap' ||
        key === 'charge' ||
        key === 'mass'
      ) {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({
          [key]: number
        } as Partial<UniformElectricAccelerationParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      if (key === 'autoRun' || key === 'showVectors') {
        const enabled =
          value === 1 ||
          value === '1' ||
          String(value).toLowerCase() === 'true';
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<UniformElectricAccelerationParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      return false;
    }
  }
});
