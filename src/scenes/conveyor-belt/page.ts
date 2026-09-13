import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { ConveyorParams } from './scene.sim';
import { conveyorControlsSchema } from './controls-schema';
import { createConveyorScene } from './scene.entry';
import { conveyorBeltMeta } from './scene.meta';

bootScenePage({
  meta: conveyorBeltMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '运动状态',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('conveyor-belt requires a canvas');
    const scene = createConveyorScene({ canvas, theme, mode, demoHints });
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
      schema: conveyorControlsSchema,
      onChange: (key, value) => {
        if (key === 'direction') {
          scene.setParams({
            direction: String(value) as ConveyorParams['direction']
          });
          renderer.setActive(key, String(value));
        } else {
          scene.setParams({ [key]: Number(value) } as Partial<ConveyorParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: (key) => {
        if (key === 'releaseBottom') scene.release('bottom');
        if (key === 'releaseTop') scene.release('top');
        if (key === 'reset') {
          scene.reset();
          renderer.setValue('angle', 30);
          renderer.setValue('beltSpeed', 4);
          renderer.setValue('mu', 0.8);
          renderer.setValue('blockMass', 1);
          renderer.setActive('direction', 'up');
        }
        render();
      }
    });
    return {
      setValue: (key: string, value: number | string | boolean) =>
        renderer.setValue(key, value),
      setActive: (key: string, value: string) => renderer.setActive(key, value),
      dispose: () => renderer.dispose()
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'direction') {
        const direction = String(value) === 'down' ? 'down' : 'up';
        ctx.scene.setParams({ direction });
        ctx.setControlActive(key, direction);
        return true;
      }
      const n = Number(value);
      if (!Number.isFinite(n)) return false;
      ctx.scene.setParams({ [key]: n } as Partial<ConveyorParams>);
      ctx.setControlValue(key, n);
      return true;
    }
  }
});
