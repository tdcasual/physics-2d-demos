import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { MomentumComparisonParams } from './scene.sim';
import { momentumComparisonControlsSchema } from './controls-schema';
import {
  asMomentumCollision,
  asMomentumScheme,
  createMomentumComparisonScene
} from './scene.entry';
import { momentumComparisonMeta } from './scene.meta';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

bootScenePage({
  meta: momentumComparisonMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '动量读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas)
      throw new Error('momentum-conservation-comparison requires a canvas');
    const scene = createMomentumComparisonScene({
      canvas,
      theme,
      mode,
      demoHints
    });
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
      schema: momentumComparisonControlsSchema,
      onAction: () => render(),
      onChange: (key, value) => {
        if (key === 'scheme') {
          const scheme = asMomentumScheme(value);
          if (scheme) scene.setParams({ scheme });
        } else if (key === 'collision') {
          const collision = asMomentumCollision(value);
          if (collision) scene.setParams({ collision });
        } else if (
          key === 'massA' ||
          key === 'massB' ||
          key === 'velocityA' ||
          key === 'velocityB'
        ) {
          scene.setParams({
            [key]: Number(value)
          } as Partial<MomentumComparisonParams>);
        } else if (key === 'autoRun' || key === 'showVectors') {
          scene.setParams({
            [key]: asBoolean(value)
          } as Partial<MomentumComparisonParams>);
        }
        render();
        writeParam?.(key, value);
      }
    });
    return exposeSchemaHandle(renderer);
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'scheme') {
        const scheme = asMomentumScheme(value);
        if (!scheme) return false;
        ctx.scene.setParams({ scheme });
        ctx.setControlValue(key, scheme);
        return true;
      }
      if (key === 'collision') {
        const collision = asMomentumCollision(value);
        if (!collision) return false;
        ctx.scene.setParams({ collision });
        ctx.setControlValue(key, collision);
        return true;
      }
      if (key === 'autoRun' || key === 'showVectors') {
        const enabled = asBoolean(value);
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<MomentumComparisonParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({
        [key]: number
      } as Partial<MomentumComparisonParams>);
      ctx.setControlValue(key, number);
      return true;
    }
  }
});
