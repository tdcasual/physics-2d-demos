import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { readSceneParams, writeOwnedSceneParams } from '../../app/url-sync';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { variableWorkControlsSchema } from './controls-schema';
import { createVariableWorkScene } from './scene.entry';
import { variableWorkMeta } from './scene.meta';
import {
  asBool,
  asMode,
  restoredUrlParams,
  shouldShowK,
  shouldShowPower,
  type VariableWorkParams
} from './scene.sim';

const rawInitial = readSceneParams(variableWorkMeta);
const NUMBER_KEYS = ['mass', 'k', 'power', 'microsteps'] as const;

bootScenePage({
  meta: variableWorkMeta,
  autoPlay: asBool(rawInitial.autoRun, false),
  preferredLayout:
    typeof window !== 'undefined' && window.innerWidth <= 720
      ? 'mobile-stack'
      : 'split-right-graph-bottom',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: true,
    graphHeight: 240,
    graphMinHeight: 170,
    graphMaxHeight: 360,
    graphColumns: 1
  },
  createScene: ({ canvas, theme, mode, demoHints, sceneWriter }) => {
    if (!canvas) throw new Error('variable-work requires a canvas');
    const scene = createVariableWorkScene({
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
      writeOwnedSceneParams(
        sceneWriter,
        restoredUrlParams(
          scene.getParams(),
          scene.getTransportState().isPlaying
        )
      );
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
    const workScene = scene as ReturnType<typeof createVariableWorkScene>;
    let applying = false;

    const renderer = renderSchema({
      mount,
      schema: variableWorkControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        if (key === 'mode') {
          const mode = asMode(value);
          workScene.setParams({ mode });
          renderer.setActive(key, mode);
          renderer.setVisible('k', shouldShowK(mode));
          renderer.setVisible('power', shouldShowPower(mode));
          writeParam?.(
            key,
            mode === 'power' ? 1 : mode === 'piecewise' ? 2 : 0
          );
        } else if ((NUMBER_KEYS as readonly string[]).includes(key)) {
          workScene.setParams({
            [key]: Number(value)
          } as Partial<VariableWorkParams>);
          writeParam?.(key, value);
        }
        render();
      },
      onAction: () => undefined
    });
    renderer.setVisible('k', shouldShowK(workScene.getParams().mode));
    renderer.setVisible('power', shouldShowPower(workScene.getParams().mode));

    const syncFromScene = (): void => {
      const params = workScene.getParams();
      renderer.setActiveSilently('mode', params.mode);
      renderer.setValueSilently('mass', params.mass);
      renderer.setValueSilently('k', params.k);
      renderer.setValueSilently('power', params.power);
      renderer.setValueSilently('microsteps', params.microsteps);
      renderer.setVisible('k', shouldShowK(params.mode));
      renderer.setVisible('power', shouldShowPower(params.mode));
    };

    return {
      ...exposeSchemaHandle(renderer),
      setValue: (key: string, value: number | string | boolean) => {
        applying = true;
        renderer.setValue(key, value);
        applying = false;
      },
      setActive: (key: string, value: string) => {
        applying = true;
        renderer.setActive(key, value);
        if (key === 'mode') {
          const mode = asMode(value);
          renderer.setVisible('k', shouldShowK(mode));
          renderer.setVisible('power', shouldShowPower(mode));
        }
        applying = false;
      },
      syncFromScene
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'mode') {
        const mode = asMode(value);
        ctx.scene.setParams({ mode } as Partial<VariableWorkParams>);
        ctx.setControlActive?.('mode', mode);
        ctx.setControlValue(key, mode);
        return true;
      }
      if (key === 'autoRun') return true;
      const n = Number(value);
      if (!Number.isFinite(n)) return false;
      ctx.scene.setParams({ [key]: n } as Partial<VariableWorkParams>);
      ctx.setControlValue(key, n);
      return true;
    }
  }
});
