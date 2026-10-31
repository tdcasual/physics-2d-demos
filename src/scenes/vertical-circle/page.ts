import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeOwnedSceneParams } from '../../app/url-sync';
import { createStageInteraction } from '../../platform/input/stage-interaction';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { createVerticalCircleScene } from './scene.entry';
import { verticalCircleMeta } from './scene.meta';
import { verticalCircleControlsSchema } from './controls-schema';
import {
  pointerToBaseNorm,
  stageLayoutFrom,
  type VerticalCircleHandle,
  type VerticalCircleParams
} from './scene.sim';
import { asBoolean } from '../../core/coerce';

function parseModel(value: unknown): 'rope' | 'rod' | null {
  if (value === 'rod' || value === 1 || value === '1') return 'rod';
  if (value === 'rope' || value === 0 || value === '0') return 'rope';
  return null;
}

bootScenePage({
  meta: verticalCircleMeta,
  autoPlay: true,
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
  createScene: ({ canvas, theme, mode, demoHints, sceneWriter }) => {
    if (!canvas) throw new Error('vertical-circle requires a canvas');
    const scene = createVerticalCircleScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    const interaction = createStageInteraction({
      canvas,
      toModel: (local, size) =>
        pointerToBaseNorm(
          local.x,
          local.y,
          size.width,
          size.height,
          stageLayoutFrom(canvas)
        ),
      pick: (model) => scene.pickHandle(model.x, model.y),
      move: (id, model) => {
        scene.moveHandle(
          id as Exclude<VerticalCircleHandle, null>,
          model.x,
          model.y
        );
      },
      commit: () => {
        writeOwnedSceneParams(sceneWriter, { theta: scene.getParams().theta });
      },
      onChange: () => scheduler.schedule()
    });
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      step(dt: number): void {
        if (interaction.draggingId()) {
          scheduler.schedule();
          return;
        }
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        interaction.dispose();
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const circleScene = scene as ReturnType<typeof createVerticalCircleScene>;
    let applying = false;
    let last = circleScene.getParams();

    const renderer = renderSchema({
      mount,
      schema: verticalCircleControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        if (key === 'model') {
          const model = parseModel(value) ?? 'rope';
          circleScene.setParams({ model });
          renderer.setActive(key, model);
        } else if (
          key === 'autoRun' ||
          key === 'showVectors' ||
          key === 'showPath'
        ) {
          circleScene.setParams({
            [key]: asBoolean(value)
          } as Partial<VerticalCircleParams>);
        } else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          circleScene.setParams({
            [key]: number
          } as Partial<VerticalCircleParams>);
        }
        last = circleScene.getParams();
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });

    const unsubscribe = circleScene.subscribe(() => {
      const p = circleScene.getParams();
      applying = true;
      if (p.theta !== last.theta) renderer.setValue('theta', p.theta);
      if (p.vBottom !== last.vBottom) renderer.setValue('vBottom', p.vBottom);
      if (p.model !== last.model) renderer.setActive('model', p.model);
      applying = false;
      last = p;
    });

    return {
      ...exposeSchemaHandle(renderer),
      dispose: () => {
        unsubscribe();
        renderer.dispose();
      }
    };
  },
  paramSync: {
    activeKeys: ['model'],
    applyParam: (key, value, ctx) => {
      if (key === 'model') {
        const model = parseModel(value) ?? 'rope';
        ctx.scene.setParams({ model });
        ctx.setControlActive('model', model);
        return true;
      }
      if (key === 'autoRun' || key === 'showVectors' || key === 'showPath') {
        const on = asBoolean(value);
        ctx.scene.setParams({ [key]: on } as Partial<VerticalCircleParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      if (key === 'vBottom' || key === 'theta') {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({
          [key]: number
        } as Partial<VerticalCircleParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      return false;
    }
  }
});
