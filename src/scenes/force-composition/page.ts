import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeSceneParams } from '../../app/url-sync';
import { applyTouchInteractionMode } from '../../platform/input/touch';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createForceCompositionScene } from './scene.entry';
import { forceCompositionMeta } from './scene.meta';
import { forceCompositionControlsSchema } from './controls-schema';
import {
  pointerToBaseNorm,
  stageLayoutFrom,
  type ForceCompositionParams,
  type ForceCompositionTab
} from './scene.sim';

function urlSnapshot(
  p: ForceCompositionParams
): Record<string, string | number> {
  return {
    tab: p.tab,
    rule: p.rule,
    f1: p.f1,
    f2: p.f2,
    angle: p.angle,
    orthogonalF: p.orthogonalF,
    orthogonalAngle: p.orthogonalAngle,
    gravity: p.gravity,
    inclineAngle: p.inclineAngle,
    rangeSweep: p.rangeSweep ? 1 : 0
  };
}

bootScenePage({
  meta: forceCompositionMeta,
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
    if (!canvas) throw new Error('force-composition requires a canvas');
    applyTouchInteractionMode(canvas, 'drag');
    const scene = createForceCompositionScene({
      canvas,
      theme,
      mode,
      demoHints
    });
    const scheduler = createRenderScheduler(() => scene.render());
    let dragHandle: 'f1' | 'f2' | 'orthogonal' | null = null;
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

    const applyTabVisibility = (tab: string): void => {
      renderer.setVisible('两力参数', tab === 'synthesis' || tab === 'range');
      renderer.setVisible('rule', tab === 'synthesis');
      renderer.setVisible('正交分解', tab === 'orthogonal');
      renderer.setVisible('斜面分解', tab === 'effect');
      renderer.setVisible('范围演变', tab === 'range');
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

    const queueUrl = (p: ForceCompositionParams, immediate: boolean): void => {
      pendingUrl = urlSnapshot(p);
      if (immediate) {
        flushUrl();
        return;
      }
      if (urlTimer) {
        window.clearTimeout(urlTimer);
      }
      urlTimer = window.setTimeout(() => {
        urlTimer = 0;
        flushUrl();
      }, 200);
    };

    const syncFromScene = (): void => {
      const p = scene.getParams();
      applying = true;
      if (p.f1 !== lastUi.f1) renderer.setValue('f1', p.f1);
      if (p.f2 !== lastUi.f2) renderer.setValue('f2', p.f2);
      if (Math.round(p.angle) !== Math.round(lastUi.angle))
        renderer.setValue('angle', p.angle);
      if (p.orthogonalF !== lastUi.orthogonalF)
        renderer.setValue('orthogonalF', p.orthogonalF);
      if (Math.round(p.orthogonalAngle) !== Math.round(lastUi.orthogonalAngle))
        renderer.setValue('orthogonalAngle', p.orthogonalAngle);
      if (p.gravity !== lastUi.gravity) renderer.setValue('gravity', p.gravity);
      if (p.inclineAngle !== lastUi.inclineAngle)
        renderer.setValue('inclineAngle', p.inclineAngle);
      if (p.rangeSweep !== lastUi.rangeSweep)
        renderer.setValue('rangeSweep', p.rangeSweep);
      if (p.tab !== lastUi.tab) {
        renderer.setActive('tab', p.tab);
        applyTabVisibility(p.tab);
      }
      if (p.rule !== lastUi.rule) renderer.setActive('rule', p.rule);
      applying = false;
      const changed =
        p.f1 !== lastUi.f1 ||
        p.f2 !== lastUi.f2 ||
        p.angle !== lastUi.angle ||
        p.orthogonalF !== lastUi.orthogonalF ||
        p.orthogonalAngle !== lastUi.orthogonalAngle ||
        p.gravity !== lastUi.gravity ||
        p.inclineAngle !== lastUi.inclineAngle ||
        p.rangeSweep !== lastUi.rangeSweep ||
        p.tab !== lastUi.tab ||
        p.rule !== lastUi.rule;
      lastUi = { ...p };
      if (changed) queueUrl(p, false);
    };

    const renderer = renderSchema({
      mount,
      schema: forceCompositionControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        const next: Partial<ForceCompositionParams> = {};
        if (key === 'tab') next.tab = String(value) as ForceCompositionTab;
        else if (key === 'rule')
          next.rule = String(value) as ForceCompositionParams['rule'];
        else if (key === 'rangeSweep')
          next.rangeSweep = value === true || value === 1 || value === '1';
        else next[key as keyof ForceCompositionParams] = Number(value) as never;
        scene.setParams(next);
        if (key === 'tab' || key === 'rule')
          renderer.setActive(key, String(value));
        if (key === 'tab') applyTabVisibility(String(value));
        lastUi = scene.getParams();
        render();
        queueUrl(lastUi, true);
      },
      onAction: () => {}
    });

    applyTabVisibility(scene.getParams().tab);
    const unsubscribe = scene.subscribe(syncFromScene);

    return {
      setValue(key: string, value: number | string | boolean): void {
        renderer.setValue(key, value);
      },
      setActive(key: string, value: string): void {
        renderer.setActive(key, value);
        if (key === 'tab') applyTabVisibility(value);
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
