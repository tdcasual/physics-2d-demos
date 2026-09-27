import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeOwnedSceneParams } from '../../app/url-sync';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { impulseMomentumControlsSchema } from './controls-schema';
import { asForceModel, createImpulseMomentumScene } from './scene.entry';
import { impulseMomentumMeta } from './scene.meta';
import { restoredUrlParams, type ImpulseMomentumParams } from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

bootScenePage({
  meta: impulseMomentumMeta,
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
    graphHeight: 260,
    graphMinHeight: 180,
    graphMaxHeight: 360,
    graphColumns: 1
  },
  createScene: ({ canvas, theme, mode, demoHints, sceneWriter }) => {
    if (!canvas) throw new Error('impulse-momentum requires a canvas');
    const scene = createImpulseMomentumScene({
      canvas,
      theme,
      mode,
      demoHints
    });
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
    const impulseScene = scene as ReturnType<typeof createImpulseMomentumScene>;
    let applying = false;
    let last = impulseScene.getParams();

    const renderer = renderSchema({
      mount,
      schema: impulseMomentumControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        if (key === 'forceModel') {
          const forceModel = asForceModel(value) ?? 'constant';
          impulseScene.setParams({ forceModel });
          renderer.setActive(key, forceModel);
          writeParam?.(key, forceModel);
        } else if (
          key === 'mass' ||
          key === 'initialVelocity' ||
          key === 'peakForce'
        ) {
          impulseScene.setParams({
            [key]: Number(value)
          } as Partial<ImpulseMomentumParams>);
          writeParam?.(key, value);
        } else if (key === 'showArea') {
          const on = asBoolean(value);
          impulseScene.setParams({ showArea: on });
          writeParam?.(key, on ? 1 : 0);
        }
        last = impulseScene.getParams();
        render();
      },
      onAction: () => {}
    });

    const unsubscribe = impulseScene.subscribe(() => {
      const p = impulseScene.getParams();
      applying = true;
      if (p.forceModel !== last.forceModel) {
        renderer.setActive('forceModel', p.forceModel);
      }
      if (p.mass !== last.mass) renderer.setValue('mass', p.mass);
      if (p.initialVelocity !== last.initialVelocity) {
        renderer.setValue('initialVelocity', p.initialVelocity);
      }
      if (p.peakForce !== last.peakForce) {
        renderer.setValue('peakForce', p.peakForce);
      }
      if (p.showArea !== last.showArea) {
        renderer.setValue('showArea', p.showArea);
      }
      applying = false;
      last = p;
    });

    return {
      setValue: (key: string, value: number | string | boolean) =>
        renderer.setValue(key, value),
      setActive: (key: string, value: string) => renderer.setActive(key, value),
      dispose: () => {
        unsubscribe();
        renderer.dispose();
      }
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'forceModel') {
        const forceModel = asForceModel(value) ?? 'constant';
        ctx.scene.setParams({ forceModel });
        ctx.setControlActive(key, forceModel);
        return true;
      }
      if (key === 'mass' || key === 'initialVelocity' || key === 'peakForce') {
        const n = Number(value);
        if (!Number.isFinite(n)) return false;
        ctx.scene.setParams({ [key]: n } as Partial<ImpulseMomentumParams>);
        ctx.setControlValue(key, n);
        return true;
      }
      if (key === 'showArea' || key === 'autoRun') {
        const on = asBoolean(value) || Number(value) > 0;
        ctx.scene.setParams({ [key]: on } as Partial<ImpulseMomentumParams>);
        if (key === 'showArea') ctx.setControlValue(key, on);
        return true;
      }
      return false;
    }
  }
});
