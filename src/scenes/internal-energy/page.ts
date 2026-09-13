import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { internalEnergyControlsSchema } from './controls-schema';
import { internalEnergyMeta } from './scene.meta';
import { createInternalEnergyScene } from './scene.entry';
import type {
  InternalEnergyExperiment,
  InternalEnergyParams
} from './scene.sim';

bootScenePage({
  meta: internalEnergyMeta,
  autoPlay: false,
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
    if (!canvas) throw new Error('internal-energy requires a canvas');
    const scene = createInternalEnergyScene({ canvas, theme, mode, demoHints });
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
      schema: internalEnergyControlsSchema,
      onChange: (key, value) => {
        if (key === 'experiment') {
          const experiment = String(value) as InternalEnergyExperiment;
          scene.setParams({ experiment });
          renderer.setActive(key, experiment);
        } else if (key === 'autoRun') {
          scene.setParams({ autoRun: Boolean(value) });
        } else {
          scene.setParams({
            [key]: Number(value)
          } as Partial<InternalEnergyParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'quickCompress') scene.triggerExperiment('compress');
        if (key === 'slowCompress') scene.triggerExperiment('expand');
        if (key === 'reset') {
          scene.reset();
          renderer.setActive('experiment', 'compress');
          renderer.setValue('compression', 0.45);
          renderer.setValue('heatInput', 40);
          renderer.setValue('autoRun', false);
        }
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
      if (key === 'experiment') {
        const raw = String(value);
        const experiment =
          raw === '1'
            ? 'expand'
            : raw === '2'
              ? 'heat'
              : raw === '3'
                ? 'law'
                : (raw as InternalEnergyExperiment);
        ctx.scene.setParams({ experiment });
        ctx.setControlActive(key, experiment);
        return true;
      }
      if (key === 'autoRun') {
        const autoRun = Number(value) > 0;
        ctx.scene.setParams({ autoRun });
        ctx.setControlValue(key, autoRun);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<InternalEnergyParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
