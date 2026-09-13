import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { closedCircuitControlsSchema } from './controls-schema';
import { createClosedCircuitScene } from './scene.entry';
import { closedCircuitMeta } from './scene.meta';
import type { ClosedCircuitParams } from './scene.sim';

bootScenePage({
  meta: closedCircuitMeta,
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
    if (!canvas) throw new Error('closed-circuit requires a canvas');
    const scene = createClosedCircuitScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      step(dt: number) {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose() {
        scheduler.dispose();
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const renderer = renderSchema({
      mount,
      schema: closedCircuitControlsSchema,
      onChange: (key, value) => {
        if (
          key === 'emf' ||
          key === 'internalResistance' ||
          key === 'externalResistance'
        )
          scene.setParams({
            [key]: Number(value)
          } as Partial<ClosedCircuitParams>);
        if (key === 'autoRun' || key === 'showPowerArea')
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<ClosedCircuitParams>);
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
      if (
        key === 'emf' ||
        key === 'internalResistance' ||
        key === 'externalResistance'
      ) {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({ [key]: number } as Partial<ClosedCircuitParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      if (key === 'autoRun' || key === 'showPowerArea') {
        const enabled = Number(value) > 0;
        ctx.scene.setParams({ [key]: enabled } as Partial<ClosedCircuitParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      return false;
    }
  }
});
