import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeSceneParams } from '../../app/url-sync';
import { applyTouchInteractionMode } from '../../platform/input/touch';
import { renderSchema } from '../../ui/components/SchemaRenderer';
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
    applyTouchInteractionMode(canvas, 'drag');
    const scene = createDynamicCircleScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    let dragHandle: DynamicCircleHandle = null;
    const toNorm = (event: PointerEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      return pointerToBaseNorm(
        event.clientX - rect.left,
        event.clientY - rect.top,
        rect.width,
        rect.height,
        stageLayoutFrom(canvas)
      );
    };
    const onPointerDown = (event: PointerEvent): void => {
      const point = toNorm(event);
      dragHandle = scene.pickHandle(point.x, point.y);
      if (dragHandle) canvas.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (!dragHandle) return;
      const point = toNorm(event);
      scene.moveHandle(dragHandle, point.x, point.y);
      scheduler.schedule();
    };
    const onPointerUp = (event: PointerEvent): void => {
      dragHandle = null;
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // no-op
      }
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      dispose(): void {
        scheduler.dispose();
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender }) => {
    const render = scheduleRender ?? (() => scene.render());
    let applying = false;
    let lastUi = scene.getParams();
    let urlTimer = 0;
    let pendingUrl: ReturnType<typeof urlSnapshot> | null = null;

    const applyVisibility = (p: DynamicCircleParams): void => {
      renderer.setVisible('theta', p.tab === 'rotating');
      renderer.setVisible('y0', p.tab === 'translating');
      renderer.setVisible('xBound', p.boundary === 'straight');
      renderer.setVisible('triX', p.boundary === 'triangle');
      renderer.setVisible('triH', p.boundary === 'triangle');
      renderer.setVisible('circleR', p.boundary === 'circle');
      renderer.setVisible('circleX', p.boundary === 'circle');
      renderer.setVisible('circleY', p.boundary === 'circle');
    };

    const flushUrl = (): void => {
      if (urlTimer) {
        window.clearTimeout(urlTimer);
        urlTimer = 0;
      }
      if (!pendingUrl) return;
      writeSceneParams(pendingUrl);
      pendingUrl = null;
    };

    const queueUrl = (p: DynamicCircleParams, immediate: boolean): void => {
      pendingUrl = urlSnapshot(p);
      if (immediate) {
        flushUrl();
        return;
      }
      if (urlTimer) window.clearTimeout(urlTimer);
      urlTimer = window.setTimeout(() => {
        urlTimer = 0;
        flushUrl();
      }, 200);
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
      if (p.tab !== lastUi.tab || p.boundary !== lastUi.boundary)
        applyVisibility(p);
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
      if (changed) queueUrl(p, false);
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
          applyVisibility(params);
          lastUi = params;
          render();
          queueUrl(params, true);
          return;
        }
        if (key === 'boundary') {
          const params = scene.setBoundary(
            String(value) as DynamicCircleBoundary
          );
          renderer.setActive('boundary', params.boundary);
          applyVisibility(params);
          lastUi = params;
          render();
          queueUrl(params, true);
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
        queueUrl(lastUi, true);
      },
      onAction: () => {}
    });

    applyVisibility(scene.getParams());
    const unsubscribe = scene.subscribe(syncFromScene);

    return {
      setValue(key: string, value: number | string | boolean): void {
        renderer.setValue(key, value);
      },
      setActive(key: string, value: string): void {
        renderer.setActive(key, value);
        if (key === 'tab' || key === 'boundary')
          applyVisibility(scene.getParams());
      },
      dispose(): void {
        unsubscribe();
        if (urlTimer) window.clearTimeout(urlTimer);
        urlTimer = 0;
        pendingUrl = null;
        renderer.dispose();
      }
    };
  }
});
