import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { potentialGraphControlsSchema } from './controls-schema';
import { asPotentialScenario, createPotentialGraphScene } from './scene.entry';
import { potentialGraphMeta } from './scene.meta';
import type { PotentialGraphParams } from './scene.sim';

bootScenePage({
  meta: potentialGraphMeta,
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
    if (!canvas) throw new Error('potential-energy-graphs requires a canvas');
    const scene = createPotentialGraphScene({ canvas, theme, mode, demoHints });
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
      schema: potentialGraphControlsSchema,
      onChange: (key, value) => {
        if (key === 'scenario') {
          const scenario = asPotentialScenario(value) ?? 'segments';
          scene.setParams({ scenario });
          renderer.setActive(key, scenario);
          writeParam?.(key, scenario);
        } else if (key === 'probeCharge') {
          const probeCharge = Number(value) === -1 ? -1 : 1;
          scene.setParams({ probeCharge });
          renderer.setActive(key, String(probeCharge));
          writeParam?.(key, probeCharge);
        } else if (key === 'chargeMagnitude' || key === 'probePosition') {
          scene.setParams({
            [key]: Number(value)
          } as Partial<PotentialGraphParams>);
          writeParam?.(key, value);
        } else if (
          key === 'showTangent' ||
          key === 'showArea' ||
          key === 'autoRun'
        ) {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<PotentialGraphParams>);
          writeParam?.(key, value ? 1 : 0);
        }
        render();
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
      if (key === 'scenario') {
        const scenario = asPotentialScenario(value) ?? 'segments';
        ctx.scene.setParams({ scenario });
        ctx.setControlActive(key, scenario);
        return true;
      }
      if (key === 'probeCharge') {
        const probeCharge = Number(value) === -1 ? -1 : 1;
        ctx.scene.setParams({ probeCharge });
        ctx.setControlActive(key, String(probeCharge));
        return true;
      }
      if (key === 'chargeMagnitude' || key === 'probePosition') {
        const n = Number(value);
        if (!Number.isFinite(n)) return false;
        ctx.scene.setParams({ [key]: n } as Partial<PotentialGraphParams>);
        ctx.setControlValue(key, n);
        return true;
      }
      if (key === 'showTangent' || key === 'showArea' || key === 'autoRun') {
        const on = Number(value) > 0;
        ctx.scene.setParams({ [key]: on } as Partial<PotentialGraphParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      return false;
    }
  }
});
