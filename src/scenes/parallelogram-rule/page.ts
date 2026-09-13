import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createParallelogramScene } from './scene.entry';
import { parallelogramMeta } from './scene.meta';
import { parallelogramControlsSchema } from './controls-schema';
import type { ParallelogramParams, ParallelogramStage } from './scene.sim';

bootScenePage({
  meta: parallelogramMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 300,
    leftMaxWidth: 520,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('parallelogram-rule requires a canvas');
    const scene = createParallelogramScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        scene.dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const vectorScene = scene as ReturnType<typeof createParallelogramScene>;
    const renderer = renderSchema({
      mount,
      schema: parallelogramControlsSchema,
      onChange: (key, value) => {
        if (key === 'stage') {
          vectorScene.setParams({ stage: String(value) as ParallelogramStage });
          renderer.setActive(key, String(value));
        } else {
          vectorScene.setParams({
            [key]: Number(value)
          } as Partial<ParallelogramParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });
    return {
      setValue(key: string, value: number | string): void {
        renderer.setValue(key, value);
      },
      setActive(key: string, value: string): void {
        renderer.setActive(key, value);
      },
      dispose(): void {
        renderer.dispose();
      }
    };
  }
});
