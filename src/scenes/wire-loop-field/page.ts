import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { WireLoopFieldParams } from './scene.sim';
import { wireLoopFieldControlsSchema } from './controls-schema';
import { createWireLoopFieldScene } from './scene.entry';
import { wireLoopFieldMeta } from './scene.meta';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}
function asShape(value: unknown): WireLoopFieldParams['shape'] | null {
  return value === 'rectangle' ||
    value === 'triangle' ||
    value === 'circle' ||
    value === 'semicircle'
    ? value
    : null;
}
function asDirection(
  value: unknown
): WireLoopFieldParams['fieldDirection'] | null {
  return value === 'into' || value === 'out' ? value : null;
}

bootScenePage({
  meta: wireLoopFieldMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '感应数据',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('wire-loop-field requires a canvas');
    const scene = createWireLoopFieldScene({ canvas, theme, mode, demoHints });
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
      schema: wireLoopFieldControlsSchema,
      onChange: (key, value) => {
        if (key === 'shape') {
          const shape = asShape(value);
          if (shape) scene.setParams({ shape });
        } else if (key === 'fieldDirection') {
          const fieldDirection = asDirection(value);
          if (fieldDirection) scene.setParams({ fieldDirection });
        } else if (key === 'autoRun' || key === 'showCurrent')
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<WireLoopFieldParams>);
        else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          scene.setParams({ [key]: number } as Partial<WireLoopFieldParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'reset') scene.reset();
        render();
      }
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
      if (key === 'shape') {
        const shape = asShape(value);
        if (!shape) return false;
        ctx.scene.setParams({ shape });
        ctx.setControlValue(key, shape);
        return true;
      }
      if (key === 'fieldDirection') {
        const fieldDirection = asDirection(value);
        if (!fieldDirection) return false;
        ctx.scene.setParams({ fieldDirection });
        ctx.setControlValue(key, fieldDirection);
        return true;
      }
      if (key === 'autoRun' || key === 'showCurrent') {
        ctx.scene.setParams({
          [key]: asBoolean(value)
        } as Partial<WireLoopFieldParams>);
        ctx.setControlValue(key, asBoolean(value));
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<WireLoopFieldParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
