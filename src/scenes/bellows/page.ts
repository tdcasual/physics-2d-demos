import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { createBellowsScene } from './scene.entry';
import { bellowsMeta } from './scene.meta';
import { bellowsControlsSchema } from './controls-schema';
import type { BellowsMotion, BellowsParams } from './scene.sim';

bootScenePage({
  meta: bellowsMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 280,
    leftMaxWidth: 460,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '联动监测',
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
        } else if (key === 'autoRun' || key === 'showFlow') {
          bellowsScene.setParams({
            [key]: Boolean(value)
          } as Partial<BellowsParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    activeKeys: ['motion'],
    applyParam: (key, value, ctx) => {
      if (key === 'motion') {
        const motion = value === 'left' || value === 'right' ? value : 'auto';
        ctx.scene.setMotion(motion);
        ctx.setControlActive('motion', motion);
        return true;
      }
      if (key === 'autoRun' || key === 'showFlow') {
        const enabled =
          value === 1 ||
          value === '1' ||
          String(value).toLowerCase() === 'true';
        ctx.scene.setParams({ [key]: enabled } as Partial<BellowsParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      return false;
    }
  }
});
