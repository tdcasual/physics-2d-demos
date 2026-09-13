import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { resistorControlsSchema } from './controls-schema';
import { asCircuitMode, asMeterMode, createResistorScene } from './scene.entry';
import { resistorMeta } from './scene.meta';
import type { ResistorParams } from './scene.sim';

bootScenePage({
  meta: resistorMeta,
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
    if (!canvas) throw new Error('resistor-measurement requires a canvas');
    const scene = createResistorScene({ canvas, theme, mode, demoHints });
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
      schema: resistorControlsSchema,
      onChange: (key, value) => {
        if (key === 'circuitMode') {
          const mode = asCircuitMode(value) ?? 'divider';
          scene.setParams({ circuitMode: mode });
          renderer.setActive(key, mode);
        } else if (key === 'meterMode') {
          const mode = asMeterMode(value) ?? 'external';
          scene.setParams({ meterMode: mode });
          renderer.setActive(key, mode);
        } else if (key === 'autoRun') {
          scene.setParams({ autoRun: Boolean(value) });
        } else if (
          key === 'targetResistance' ||
          key === 'supplyVoltage' ||
          key === 'rheostatPosition'
        ) {
          scene.setParams({ [key]: Number(value) } as Partial<ResistorParams>);
        }
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
      if (key === 'circuitMode') {
        const mode = asCircuitMode(value) ?? 'divider';
        ctx.scene.setParams({ circuitMode: mode });
        ctx.setControlActive('circuitMode', mode);
        return true;
      }
      if (key === 'meterMode') {
        const mode = asMeterMode(value) ?? 'external';
        ctx.scene.setParams({ meterMode: mode });
        ctx.setControlActive('meterMode', mode);
        return true;
      }
      if (key === 'autoRun') {
        const on = Number(value) > 0;
        ctx.scene.setParams({ autoRun: on });
        ctx.setControlValue(key, on);
        return true;
      }
      if (
        key === 'targetResistance' ||
        key === 'supplyVoltage' ||
        key === 'rheostatPosition'
      ) {
        const n = Number(value);
        if (Number.isFinite(n)) {
          ctx.scene.setParams({ [key]: n } as Partial<ResistorParams>);
          ctx.setControlValue(key, n);
        }
        return true;
      }
      return false;
    }
  }
});
