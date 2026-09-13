import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createBellowsScene } from './scene.entry';
import { bellowsMeta } from './scene.meta';
import { bellowsControlsSchema } from './controls-schema';
import type { BellowsMotion, BellowsParams } from './scene.sim';

bootScenePage({
  meta: bellowsMeta,
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
    if (!canvas) throw new Error('bellows requires a canvas');
    const scene = createBellowsScene({ canvas, theme, mode, demoHints });
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
    const bellowsScene = scene as ReturnType<typeof createBellowsScene>;
    const renderer = renderSchema({
      mount,
      schema: bellowsControlsSchema,
      onChange: (key, value) => {
        if (key === 'motion') {
          bellowsScene.setMotion(String(value) as BellowsMotion);
          renderer.setActive(key, String(value));
        } else if (key === 'autoRun' || key === 'showFlow')
          bellowsScene.setParams({
            [key]: Boolean(value)
          } as Partial<BellowsParams>);
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
