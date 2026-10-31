import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeOwnedSceneParams } from '../../app/url-sync';
import { createStageInteraction } from '../../platform/input/stage-interaction';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { createDynamicCircleScene } from './scene.entry';
import { dynamicCircleMeta } from './scene.meta';
import { dynamicCircleControlsSchema } from './controls-schema';
import {
  pointerToBaseNorm,
  stageLayoutFrom,
  type DynamicCircleBoundary,
  type DynamicCircleHandle,
  type DynamicCircleParams,
  type DynamicCircleTab
} from './scene.sim';

function urlSnapshot(p: DynamicCircleParams): Record<string, string | number> {
  return {
    tab: p.tab,
    boundary: p.boundary,
    B: p.B,
    v: p.v,
    theta: p.theta,
    y0: p.y0,
    xBound: p.xBound,
    triX: p.triX,
    triH: p.triH,
    circleR: p.circleR,
    circleX: p.circleX,
    circleY: p.circleY,
    autoSweep: p.autoSweep ? 1 : 0,
    showCenter: p.showCenter ? 1 : 0
  };
}

bootScenePage({
  meta: dynamicCircleMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 300,
    leftMaxWidth: 520,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('dynamic-circle requires a canvas');
    const scene = createDynamicCircleScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    const interaction = createStageInteraction({
      canvas,
      toModel: (local, size) =>
        pointerToBaseNorm(
          local.x,
          local.y,
          size.width,
          size.height,
          stageLayoutFrom(canvas)
        ),
      pick: (model) => scene.pickHandle(model.x, model.y),
      move: (id, model) => {
        scene.moveHandle(
          id as Exclude<DynamicCircleHandle, null>,
          model.x,
          model.y
        );
      },
      onChange: () => scheduler.schedule()
    });
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      dispose(): void {
        scheduler.dispose();
        interaction.dispose();
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, sceneWriter }) => {
    const render = scheduleRender ?? (() => scene.render());
    let applying = false;
    let lastUi = scene.getParams();

    const writeUrl = (p: DynamicCircleParams): void => {
      writeOwnedSceneParams(sceneWriter, urlSnapshot(p));
    };

    const syncFromScene = (): void => {
      const p = scene.getParams();
      applying = true;
      if (p.B !== lastUi.B) renderer.setValue('B', p.B);
      if (p.v !== lastUi.v) renderer.setValue('v', p.v);
      if (Math.round(p.theta) !== Math.round(lastUi.theta))
        renderer.setValue('theta', p.theta);
      if (p.y0 !== lastUi.y0) renderer.setValue('y0', p.y0);
      if (p.xBound !== lastUi.xBound) renderer.setValue('xBound', p.xBound);
      if (p.triX !== lastUi.triX) renderer.setValue('triX', p.triX);
      if (p.triH !== lastUi.triH) renderer.setValue('triH', p.triH);
      if (p.circleR !== lastUi.circleR) renderer.setValue('circleR', p.circleR);
      if (p.circleX !== lastUi.circleX) renderer.setValue('circleX', p.circleX);
      if (p.circleY !== lastUi.circleY) renderer.setValue('circleY', p.circleY);
      if (p.autoSweep !== lastUi.autoSweep)
        renderer.setValue('autoSweep', p.autoSweep);
      if (p.showCenter !== lastUi.showCenter)
        renderer.setValue('showCenter', p.showCenter);
      if (p.tab !== lastUi.tab) renderer.setActive('tab', p.tab);
      if (p.boundary !== lastUi.boundary)
        renderer.setActive('boundary', p.boundary);
      applying = false;
      const changed =
        p.tab !== lastUi.tab ||
        p.boundary !== lastUi.boundary ||
        p.B !== lastUi.B ||
        p.v !== lastUi.v ||
        p.theta !== lastUi.theta ||
        p.y0 !== lastUi.y0 ||
        p.xBound !== lastUi.xBound ||
        p.triX !== lastUi.triX ||
        p.triH !== lastUi.triH ||
        p.circleR !== lastUi.circleR ||
        p.circleX !== lastUi.circleX ||
        p.circleY !== lastUi.circleY ||
        p.autoSweep !== lastUi.autoSweep ||
        p.showCenter !== lastUi.showCenter;
      lastUi = { ...p };
      if (changed) writeUrl(p);
    };

    const renderer = renderSchema({
      mount,
      schema: dynamicCircleControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        if (key === 'tab') {
          const params = scene.setTab(String(value) as DynamicCircleTab);
          renderer.setActive('tab', params.tab);
          renderer.setValue('v', params.v);
          renderer.setValue('theta', params.theta);
          renderer.setValue('y0', params.y0);
          lastUi = params;
          render();
          writeUrl(params);
          return;
        }
        if (key === 'boundary') {
          const params = scene.setBoundary(
            String(value) as DynamicCircleBoundary
          );
          renderer.setActive('boundary', params.boundary);
          lastUi = params;
          render();
          writeUrl(params);
          return;
        }
        if (key === 'autoSweep' || key === 'showCenter') {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<DynamicCircleParams>);
        } else {
          scene.setParams({
            [key]: Number(value)
          } as Partial<DynamicCircleParams>);
        }
        lastUi = scene.getParams();
        render();
        writeUrl(lastUi);
      },
      onAction: () => {}
    });

    const unsubscribe = scene.subscribe(syncFromScene);

    const projectFromLive = (): void => {
      const p = scene.getParams();
      applying = true;
      renderer.setValueSilently('B', p.B);
      renderer.setValueSilently('v', p.v);
      renderer.setValueSilently('theta', p.theta);
      renderer.setValueSilently('y0', p.y0);
      renderer.setValueSilently('xBound', p.xBound);
      renderer.setValueSilently('triX', p.triX);
      renderer.setValueSilently('triH', p.triH);
      renderer.setValueSilently('circleR', p.circleR);
      renderer.setValueSilently('circleX', p.circleX);
      renderer.setValueSilently('circleY', p.circleY);
      renderer.setValueSilently('autoSweep', p.autoSweep);
      renderer.setValueSilently('showCenter', p.showCenter);
      renderer.setActiveSilently('tab', p.tab);
      renderer.setActiveSilently('boundary', p.boundary);
      applying = false;
      lastUi = { ...p };
    };

    return {
      ...exposeSchemaHandle(renderer),
      syncFromScene: projectFromLive,
      dispose(): void {
        unsubscribe();
        renderer.dispose();
      }
    };
  }
});
