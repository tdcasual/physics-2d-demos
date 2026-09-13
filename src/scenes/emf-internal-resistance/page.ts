import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { emfInternalControlsSchema } from './controls-schema';
import {
  asInternalResistance,
  asSourceVoltage,
  createEmfInternalScene
} from './scene.entry';
import { emfInternalMeta } from './scene.meta';
import type { EmfInternalParams } from './scene.sim';

bootScenePage({
  meta: emfInternalMeta,
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
    if (!canvas) throw new Error('emf-internal-resistance requires a canvas');
    const scene = createEmfInternalScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const renderer = renderSchema({
      mount,
      schema: emfInternalControlsSchema,
      onChange: (key, value) => {
        if (key === 'sourceVoltage') {
          const sourceVoltage = asSourceVoltage(value) ?? 1.5;
          scene.setParams({ sourceVoltage });
          writeParam?.(key, sourceVoltage);
        } else if (key === 'internalResistance') {
          const internalResistance = asInternalResistance(value) ?? 0.5;
          scene.setParams({ internalResistance });
          writeParam?.(key, internalResistance);
        } else if (key === 'rheostatResistance') {
          scene.setParams({ rheostatResistance: Number(value) });
          writeParam?.(key, value);
        } else if (key === 'systematicError' || key === 'autoRun') {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<EmfInternalParams>);
          writeParam?.(key, value ? 1 : 0);
        }
        render();
      },
      onAction: (key) => {
        if (key === 'toggleSwitch') {
          const closed = scene.toggleSwitch();
          writeParam?.('switchClosed', closed ? 1 : 0);
        } else if (key === 'record') {
          scene.recordPoint();
        } else if (key === 'fit') {
          scene.fitRecords();
        } else if (key === 'clear') {
          scene.clearRecords();
        }
        render();
      }
    });
    return {
      setValue: (key: string, value: number | string | boolean) => {
        renderer.setValue(key, value);
        const select = mount.querySelector(
          `[data-control-key="${key}"] select`
        ) as HTMLSelectElement | null;
        if (select) select.value = String(value);
      },
      setActive: (key: string, value: string) => renderer.setActive(key, value),
      dispose: () => renderer.dispose()
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'sourceVoltage') {
        const sourceVoltage = asSourceVoltage(value);
        if (sourceVoltage === undefined) return false;
        ctx.scene.setParams({ sourceVoltage });
        ctx.setControlValue(key, String(sourceVoltage));
        return true;
      }
      if (key === 'internalResistance') {
        const internalResistance = asInternalResistance(value);
        if (internalResistance === undefined) return false;
        ctx.scene.setParams({ internalResistance });
        ctx.setControlValue(key, String(internalResistance));
        return true;
      }
      if (key === 'rheostatResistance') {
        const rheostatResistance = Number(value);
        if (!Number.isFinite(rheostatResistance)) return false;
        ctx.scene.setParams({ rheostatResistance });
        ctx.setControlValue(key, rheostatResistance);
        return true;
      }
      if (
        key === 'switchClosed' ||
        key === 'systematicError' ||
        key === 'autoRun'
      ) {
        const on = Number(value) > 0;
        ctx.scene.setParams({ [key]: on } as Partial<EmfInternalParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      return false;
    }
  }
});
