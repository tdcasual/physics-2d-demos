import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';

import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { springBallControlsSchema } from './controls-schema';
import { asBool, asMode, asPreset, createSpringBallScene } from './scene.entry';
import { springBallMeta } from './scene.meta';
import type { SpringBallParams } from './scene.sim';

function paramsFromUrl(
  raw: Record<string, number | string>
): Partial<SpringBallParams> {
  const next: Partial<SpringBallParams> = {};
  if (raw.releaseHeight !== undefined) {
    const n = Number(raw.releaseHeight);
    if (Number.isFinite(n)) next.releaseHeight = n;
  }
  const preset = asPreset(raw.preset);
  if (preset) next.preset = preset;
  const mode = asMode(raw.mode);
  if (mode) next.mode = mode;
  if (raw.autoRun !== undefined) next.autoRun = asBool(raw.autoRun, false);
  if (raw.slow !== undefined) next.slow = asBool(raw.slow, false);
  return next;
}

function syncControls(
  renderer: ReturnType<typeof renderSchema>,
  params: SpringBallParams
): void {
  renderer.setValueSilently('releaseHeight', params.releaseHeight);
  renderer.setActiveSilently('preset', params.preset);
  renderer.setActiveSilently('mode', params.mode);
  renderer.setValueSilently('autoRun', params.autoRun);
  renderer.setValueSilently('slow', params.slow);
}

bootScenePage({
  meta: springBallMeta,
  shouldAutoPlay: (_params, urlParams) =>
    paramsFromUrl(urlParams).autoRun !== false,
  preferredLayout: 'split-right-graph-bottom',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: true,
    graphHeight: 236,
    graphMinHeight: 180,
    graphMaxHeight: 300,
    graphColumns: 1
  },
  createScene: ({ canvas, theme, mode, demoHints, urlParams }) => {
    if (!canvas) throw new Error('spring-ball requires a canvas');
    const scene = createSpringBallScene({
      canvas,
      theme,
      mode,
      demoHints,
      initialParams: paramsFromUrl(urlParams ?? {})
    });
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
    const springScene = scene as ReturnType<typeof createSpringBallScene>;
    const renderer = renderSchema({
      mount,
      schema: springBallControlsSchema,
      onChange: (key, value) => {
        if (key === 'preset') {
          const preset = asPreset(value) ?? 'h0';
          springScene.setParams({ preset });
          renderer.setActive(key, preset);
          renderer.setValue(
            'releaseHeight',
            springScene.getParams().releaseHeight
          );
          writeParam?.(key, ['h0', 'h-x0', 'h-2x0', 'h-3x0'].indexOf(preset));
        } else if (key === 'mode') {
          const mode = asMode(value) ?? 'single';
          springScene.setParams({ mode });
          renderer.setActive(key, mode);
          writeParam?.(key, mode === 'continuous' ? 1 : 0);
        } else if (key === 'releaseHeight') {
          const n = Number(value);
          if (Number.isFinite(n)) {
            const applied = springScene.setParams({ releaseHeight: n });
            renderer.setValue(key, applied.releaseHeight);
            writeParam?.(key, applied.releaseHeight);
          }
        } else if (key === 'autoRun' || key === 'slow') {
          const on = asBool(value, false);
          springScene.setParams({ [key]: on } as Partial<SpringBallParams>);
          renderer.setValue(key, on);
          writeParam?.(key, on ? 1 : 0);
        }
        render();
      },
      onAction: () => {}
    });
    const originalReset = springScene.reset.bind(springScene);
    springScene.reset = () => {
      originalReset();
      syncControls(renderer, springScene.getParams());
    };
    return {
      ...exposeSchemaHandle(renderer),
      syncFromScene: () => syncControls(renderer, springScene.getParams())
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'preset') {
        const preset = asPreset(value) ?? 'h0';
        ctx.scene.setParams({ preset });
        ctx.setControlActive(key, preset);
        ctx.setControlValue(
          'releaseHeight',
          ctx.scene.getParams().releaseHeight
        );
        return true;
      }
      if (key === 'mode') {
        const mode = asMode(value) ?? 'single';
        ctx.scene.setParams({ mode });
        ctx.setControlActive(key, mode);
        return true;
      }
      if (key === 'releaseHeight') {
        const n = Number(value);
        if (Number.isFinite(n)) {
          const applied = ctx.scene.setParams({ releaseHeight: n });
          ctx.setControlValue(key, applied.releaseHeight);
        }
        return true;
      }
      if (key === 'autoRun' || key === 'slow') {
        ctx.scene.setParams({
          [key]: asBool(value, false)
        } as Partial<SpringBallParams>);
        ctx.setControlValue(key, asBool(value, false));
        return true;
      }
      return false;
    }
  }
});
