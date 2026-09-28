import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeOwnedSceneParams } from '../../app/url-sync';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { rodModelControlsSchema } from './controls-schema';
import { asRodModel, createRodModelScene } from './scene.entry';
import { rodModelMeta } from './scene.meta';
import { asBool, restoredUrlParams, type RodParams } from './scene.sim';

bootScenePage({
  meta: rodModelMeta,
  shouldAutoPlay: (_params, urlParams) =>
    urlParams.autoRun === undefined ? true : asBool(urlParams.autoRun, true),
  preferredLayout: 'split-right-graph-bottom',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '数据读数',
    hasGraph: true,
    graphHeight: 250,
    graphMinHeight: 180,
    graphMaxHeight: 340,
    graphColumns: 1
  },
  createScene: ({ canvas, theme, mode, demoHints, sceneWriter }) => {
    if (!canvas) throw new Error('rod-model requires a canvas');
    const scene = createRodModelScene({ canvas, theme, mode, demoHints });
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
    const renderer = renderSchema({
      mount,
      schema: rodModelControlsSchema,
      onChange: (key, value) => {
        if (key === 'model') {
          const model = asRodModel(value) ?? 'resistor';
          scene.setParams({ model });
          renderer.setActive(key, model);
          writeParam?.(key, model === 'capacitor' ? 1 : 0);
        } else if (
          key === 'fieldStrength' ||
          key === 'railGap' ||
          key === 'externalForce' ||
          key === 'mass' ||
          key === 'resistance' ||
          key === 'capacitance'
        ) {
          scene.setParams({ [key]: Number(value) } as Partial<RodParams>);
          writeParam?.(key, value);
        }
        render();
      },
      onAction: () => {}
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'model') {
        const model = asRodModel(value) ?? 'resistor';
        ctx.scene.setParams({ model });
        ctx.setControlActive(key, model);
        return true;
      }
      if (
        key === 'fieldStrength' ||
        key === 'railGap' ||
        key === 'externalForce' ||
        key === 'mass' ||
        key === 'resistance' ||
        key === 'capacitance'
      ) {
        const n = Number(value);
        if (!Number.isFinite(n)) return false;
        ctx.scene.setParams({ [key]: n } as Partial<RodParams>);
        ctx.setControlValue(key, n);
        return true;
      }
      if (key === 'autoRun') {
        ctx.scene.setParams({ autoRun: asBool(value, false) });
        return true;
      }
      return false;
    }
  }
});
