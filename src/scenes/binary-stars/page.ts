import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createBinaryStarsScene } from './scene.entry';
import { binaryStarsMeta } from './scene.meta';
import { binaryStarsControlsSchema } from './controls-schema';
import type { BinaryStarsParams } from './scene.sim';

bootScenePage({
  meta: binaryStarsMeta,
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
    if (!canvas) throw new Error('binary-stars requires a canvas');
    const scene = createBinaryStarsScene({ canvas, theme, mode, demoHints });
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
    const binaryStarsScene = scene as ReturnType<typeof createBinaryStarsScene>;
    const renderer = renderSchema({
      mount,
      schema: binaryStarsControlsSchema,
      onChange: (key, value) => {
        if (key === 'autoRun' || key === 'showVectors') {
          binaryStarsScene.setParams({
            [key]: Boolean(value)
          } as Partial<BinaryStarsParams>);
        } else if (key === 'm1' || key === 'm2' || key === 'distance') {
          binaryStarsScene.setParams({
            [key]: Number(value)
          } as Partial<BinaryStarsParams>);
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
