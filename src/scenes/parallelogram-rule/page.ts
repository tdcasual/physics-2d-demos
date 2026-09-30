import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { createParallelogramScene } from './scene.entry';
import { parallelogramMeta } from './scene.meta';
import { parallelogramControlsSchema } from './controls-schema';
import type { ParallelogramParams, ParallelogramStage } from './scene.sim';

bootScenePage({
  meta: parallelogramMeta,
  autoPlay: true,
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
  paramSync: {
    activeKeys: ['stage']
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
    let applying = false;
    let last = vectorScene.getParams();

    const renderer = renderSchema({
      mount,
      schema: parallelogramControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        if (key === 'stage') {
          vectorScene.setParams({ stage: String(value) as ParallelogramStage });
          renderer.setActive(key, String(value));
        } else {
          vectorScene.setParams({
            [key]: Number(value)
          } as Partial<ParallelogramParams>);
        }
        last = vectorScene.getParams();
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });

    const unsubscribe = vectorScene.subscribe(() => {
      const p = vectorScene.getParams();
      applying = true;
      if (p.f1 !== last.f1) renderer.setValue('f1', p.f1);
      if (p.f2 !== last.f2) renderer.setValue('f2', p.f2);
      if (p.angle !== last.angle) renderer.setValue('angle', p.angle);
      if (p.stage !== last.stage) renderer.setActive('stage', p.stage);
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
  }
});
