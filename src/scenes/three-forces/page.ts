import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createThreeForcesScene } from './scene.entry';
import { threeForcesMeta } from './scene.meta';
import { threeForcesControlsSchema } from './controls-schema';
import type { ThreeForcesParams, ThreeForcesTab } from './scene.sim';

bootScenePage({
  meta: threeForcesMeta,
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
    if (!canvas) throw new Error('three-forces requires a canvas');
    const scene = createThreeForcesScene({ canvas, theme, mode, demoHints });
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
    const renderer = renderSchema({
      mount,
      schema: threeForcesControlsSchema,
      onChange: (key, value) => {
        if (key === 'tab') {
          scene.setParams({ tab: String(value) as ThreeForcesTab });
          renderer.setActive(key, String(value));
        } else if (key === 'autoRun' || key === 'showComponents') {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<ThreeForcesParams>);
        } else {
          scene.setParams({
            [key]: Number(value)
          } as Partial<ThreeForcesParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });
    return {
      setValue(key: string, value: number | string | boolean): void {
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
