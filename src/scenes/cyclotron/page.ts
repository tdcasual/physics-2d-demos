import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createCyclotronScene } from './scene.entry';
import { cyclotronMeta } from './scene.meta';
import { cyclotronControlsSchema } from './controls-schema';
import type { CyclotronParams, CyclotronParticle } from './scene.sim';

bootScenePage({
  meta: cyclotronMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 520,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('cyclotron requires a canvas');
    const scene = createCyclotronScene({ canvas, theme, mode, demoHints });
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
    const cyclotronScene = scene as ReturnType<typeof createCyclotronScene>;
    const renderer = renderSchema({
      mount,
      schema: cyclotronControlsSchema,
      onChange: (key, value) => {
        if (key === 'particle') {
          cyclotronScene.setParticle(String(value) as CyclotronParticle);
          renderer.setActive(key, String(value));
        } else if (key === 'autoRun' || key === 'showField') {
          cyclotronScene.setParams({
            [key]: Boolean(value)
          } as Partial<CyclotronParams>);
        } else if (key === 'B' || key === 'U') {
          cyclotronScene.setParams({
            [key]: Number(value)
          } as Partial<CyclotronParams>);
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
