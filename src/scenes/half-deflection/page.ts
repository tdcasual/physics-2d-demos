import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { halfDeflectionControlsSchema } from './controls-schema';
import { createHalfDeflectionScene, asMeterMethod } from './scene.entry';
import { halfDeflectionMeta } from './scene.meta';
import type { HalfDeflectionParams } from './scene.sim';

bootScenePage({
  meta: halfDeflectionMeta,
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
    if (!canvas) throw new Error('half-deflection requires a canvas');
    const scene = createHalfDeflectionScene({ canvas, theme, mode, demoHints });
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
      schema: halfDeflectionControlsSchema,
      onChange: (key, value) => {
        if (key === 'method') {
          const method = asMeterMethod(value);
          if (method) scene.setParams({ method });
        } else if (key === 'rheostat' || key === 'boxResistance') {
          scene.setParams({
            [key]: Number(value)
          } as Partial<HalfDeflectionParams>);
        } else if (
          key === 'mainSwitch' ||
          key === 'auxiliarySwitch' ||
          key === 'autoRun'
        ) {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<HalfDeflectionParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'recordFull') scene.record('满偏');
        if (key === 'recordHalf') scene.record('半偏');
        if (key === 'clear') scene.clearRecords();
        if (key === 'answer')
          scene.setParams({ showAnswer: !scene.getState().params.showAnswer });
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
      if (key === 'method') {
        const method = asMeterMethod(value);
        if (!method) return false;
        ctx.scene.setParams({ method });
        ctx.setControlValue(key, method);
        return true;
      }
      if (key === 'rheostat' || key === 'boxResistance') {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({ [key]: number } as Partial<HalfDeflectionParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      if (
        key === 'mainSwitch' ||
        key === 'auxiliarySwitch' ||
        key === 'autoRun' ||
        key === 'showAnswer'
      ) {
        const enabled = Number(value) > 0;
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<HalfDeflectionParams>);
        if (key !== 'showAnswer') ctx.setControlValue(key, enabled);
        return true;
      }
      return false;
    }
  }
});
