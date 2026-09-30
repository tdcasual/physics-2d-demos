import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { CollisionParams } from './scene.sim';
import { collisionControlsSchema } from './controls-schema';
import { createCollisionScene } from './scene.entry';
import { collisionMeta } from './scene.meta';

bootScenePage({
  meta: collisionMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '守恒读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('elastic-collision requires a canvas');
    const scene = createCollisionScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    return {
      ...scene,
      step(dt: number) {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose() {
        scheduler.dispose();
        scene.dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const renderer = renderSchema({
      mount,
      schema: collisionControlsSchema,
      onChange: (key, value) => {
        scene.setParams({ [key]: Number(value) } as Partial<CollisionParams>);
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'reset') {
          scene.reset();
          renderer.setValue('massA', 5);
          renderer.setValue('velocityA', 5);
          renderer.setValue('massB', 4);
          renderer.setValue('velocityB', -5);
        }
        render();
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return false;
      ctx.scene.setParams({ [key]: n } as Partial<CollisionParams>);
      ctx.setControlValue(key, n);
      return true;
    }
  }
});
