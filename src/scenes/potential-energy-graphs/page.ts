import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeOwnedSceneParams } from '../../app/url-sync';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { potentialGraphControlsSchema } from './controls-schema';
import { asPotentialScenario, createPotentialGraphScene } from './scene.entry';
import { potentialGraphMeta } from './scene.meta';
import { restoredUrlParams, type PotentialGraphParams } from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

bootScenePage({
  meta: potentialGraphMeta,
  autoPlay: false,
  preferredLayout: 'split-right-graph-bottom',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '数据读数',
    hasGraph: true,
    graphHeight: 320,
    graphMinHeight: 200,
    graphMaxHeight: 460,
    graphColumns: 1
  },
  createScene: ({ canvas, theme, mode, demoHints, sceneWriter }) => {
    if (!canvas) throw new Error('potential-energy-graphs requires a canvas');
    const scene = createPotentialGraphScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    const originalReset = scene.reset.bind(scene);
    const originalStartAll = scene.startAll.bind(scene);
    const originalPauseAll = scene.pauseAll.bind(scene);
    const syncUrl = (): void => {
      writeOwnedSceneParams(sceneWriter, restoredUrlParams(scene.getParams()));
    };
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        dispose();
      },
      reset(): void {
        originalReset();
        syncUrl();
      },
      startAll(): void {
        originalStartAll();
        syncUrl();
      },
      pauseAll(): void {
        originalPauseAll();
        syncUrl();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const graphScene = scene as ReturnType<typeof createPotentialGraphScene>;
    let applying = false;
    let last = graphScene.getParams();

    const renderer = renderSchema({
      mount,
      schema: potentialGraphControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        if (key === 'scenario') {
          const scenario = asPotentialScenario(value) ?? 'segments';
          graphScene.setParams({ scenario });
          renderer.setActive(key, scenario);
          writeParam?.(key, scenario);
        } else if (key === 'probeCharge') {
          const probeCharge = Number(value) === -1 ? -1 : 1;
          graphScene.setParams({ probeCharge });
          renderer.setActive(key, String(probeCharge));
          writeParam?.(key, probeCharge);
        } else if (key === 'chargeMagnitude' || key === 'probePosition') {
          graphScene.setParams({
            [key]: Number(value)
          } as Partial<PotentialGraphParams>);
          writeParam?.(key, value);
        } else if (key === 'showTangent' || key === 'showArea') {
          graphScene.setParams({
            [key]: asBoolean(value)
          } as Partial<PotentialGraphParams>);
          writeParam?.(key, asBoolean(value) ? 1 : 0);
        }
        last = graphScene.getParams();
        render();
      },
      onAction: () => {}
    });

    const unsubscribe = graphScene.subscribe(() => {
      const p = graphScene.getParams();
      applying = true;
      if (p.scenario !== last.scenario)
        renderer.setActive('scenario', p.scenario);
      if (p.probeCharge !== last.probeCharge) {
        renderer.setActive('probeCharge', String(p.probeCharge));
      }
      if (p.chargeMagnitude !== last.chargeMagnitude) {
        renderer.setValue('chargeMagnitude', p.chargeMagnitude);
      }
      if (p.probePosition !== last.probePosition) {
        renderer.setValue('probePosition', p.probePosition);
      }
      if (p.showTangent !== last.showTangent) {
        renderer.setValue('showTangent', p.showTangent);
      }
      if (p.showArea !== last.showArea) {
        renderer.setValue('showArea', p.showArea);
      }
      applying = false;
      last = p;
    });

    return {
      ...exposeSchemaHandle(renderer),
      dispose: () => {
        unsubscribe();
        renderer.dispose();
      }
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
        const on = asBoolean(value) || Number(value) > 0;
        ctx.scene.setParams({ [key]: on } as Partial<PotentialGraphParams>);
        if (key !== 'autoRun') ctx.setControlValue(key, on);
        return true;
      }
      return false;
    }
  }
});
