import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createUvtScene } from './scene.entry';
import { uvtMeta } from './scene.meta';
import { uvtControlsSchema } from './controls-schema';
import type { UvtParams } from './scene.sim';
bootScenePage({
  meta: uvtMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 520,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('uniformly-varied-motion requires a canvas');
    const scene = createUvtScene({ canvas, theme, mode, demoHints });
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
    const uvtScene = scene as ReturnType<typeof createUvtScene>;
    const renderer = renderSchema({
      mount,
      schema: uvtControlsSchema,
      onChange: (key, value) => {
        if (key === 'v0' || key === 'acceleration')
          uvtScene.setParams({ [key]: Number(value) } as Partial<UvtParams>);
        else if (key === 'autoRun' || key === 'showArea')
          uvtScene.setParams({ [key]: Boolean(value) } as Partial<UvtParams>);
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
