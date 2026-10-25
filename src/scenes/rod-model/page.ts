import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeOwnedSceneParams } from '../../app/url-sync';
import { rodModelControlsSchema } from './controls-schema';
import { createRodModelScene } from './scene.entry';
import { rodModelMeta } from './scene.meta';
import { asBool, restoredUrlParams } from './scene.sim';
import { createBoundControls } from '../../ui/components/bound-controls';

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
  createControls: ({ mount, scene, scheduleRender, writeParam }) =>
    createBoundControls({
      mount,
      schema: rodModelControlsSchema,
      scene,
      scheduleRender,
      writeParam
    })
});
