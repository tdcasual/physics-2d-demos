import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createProjectileDataScene } from './scene.entry';
import { projectileDataMeta } from './scene.meta';
import { projectileDataControlsSchema } from './controls-schema';
import type { ProjectileDataMode, ProjectileDataParams } from './scene.sim';

bootScenePage({
  meta: projectileDataMeta,
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
    if (!canvas) throw new Error('projectile-data-analysis requires a canvas');
    const scene = createProjectileDataScene({ canvas, theme, mode, demoHints });
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
    const dataScene = scene as ReturnType<typeof createProjectileDataScene>;
    const renderer = renderSchema({
      mount,
      schema: projectileDataControlsSchema,
      onChange: (key, value) => {
        if (key === 'mode') {
          dataScene.setParams({ mode: String(value) as ProjectileDataMode });
          renderer.setActive(key, String(value));
        } else if (key === 'showVectors') {
          dataScene.setParams({ showVectors: Boolean(value) });
        } else {
          dataScene.setParams({
            [key]: Number(value)
          } as Partial<ProjectileDataParams>);
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
