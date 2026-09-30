import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { ClosedPowerParams } from './scene.sim';
import { closedPowerControlsSchema } from './controls-schema';
import { createClosedPowerScene } from './scene.entry';
import { closedPowerMeta } from './scene.meta';

bootScenePage({
  meta: closedPowerMeta,
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
    if (!canvas) throw new Error('closed-power requires a canvas');
    const scene = createClosedPowerScene({ canvas, theme, mode, demoHints });
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
      schema: closedPowerControlsSchema,
      onAction: (key) => {
        if (key === 'short') scene.setParams({ externalResistance: 0 });
        else if (key === 'matched')
          scene.setParams({
            externalResistance: scene.getParams().internalResistance
          });
        else if (key === 'max') scene.setParams({ externalResistance: 20 });
        render();
      },
      onChange: (key, value) => {
        if (
          key === 'emf' ||
          key === 'internalResistance' ||
          key === 'externalResistance'
        ) {
          scene.setParams({
            [key]: Number(value)
          } as Partial<ClosedPowerParams>);
        } else if (key === 'autoRun' || key === 'showPowerArea') {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<ClosedPowerParams>);
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
        key === 'emf' ||
        key === 'internalResistance' ||
        key === 'externalResistance'
      ) {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({ [key]: number } as Partial<ClosedPowerParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      if (key === 'autoRun' || key === 'showPowerArea') {
        const enabled =
          value === 1 ||
          value === '1' ||
          String(value).toLowerCase() === 'true';
        ctx.scene.setParams({ [key]: enabled } as Partial<ClosedPowerParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      return false;
    }
  }
});
