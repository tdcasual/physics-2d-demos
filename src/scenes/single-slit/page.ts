import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeOwnedSceneParams } from '../../app/url-sync';
import { createStageInteraction } from '../../platform/input/stage-interaction';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { createSingleSlitScene } from './scene.entry';
import { singleSlitMeta } from './scene.meta';
import { singleSlitControlsSchema } from './controls-schema';
import {
  pointerToBaseNorm,
  stageLayoutFrom,
  type SingleSlitHandle,
  type SingleSlitParams
} from './scene.sim';
import { asBoolean } from '../../core/coerce';

bootScenePage({
  meta: singleSlitMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 280,
    leftMaxWidth: 460,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints, sceneWriter }) => {
    if (!canvas) throw new Error('single-slit requires a canvas');
    const scene = createSingleSlitScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    const moveDetector = (
      id: string,
      model: { x: number; y: number }
    ): void => {
      scene.moveHandle(id as Exclude<SingleSlitHandle, null>, model.x, model.y);
    };
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
      move: moveDetector,
      onPress: moveDetector,
      commit: () => {
        writeOwnedSceneParams(sceneWriter, {
          detectorX: scene.getParams().detectorX,
          autoScan: scene.getParams().autoScan ? 1 : 0
        });
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
    const slitScene = scene as ReturnType<typeof createSingleSlitScene>;
    let applying = false;
    let last = slitScene.getParams();

    const renderer = renderSchema({
      mount,
      schema: singleSlitControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        if (key === 'autoScan') {
          slitScene.setParams({ autoScan: asBoolean(value) });
        } else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          slitScene.setParams({
            [key]: number
          } as Partial<SingleSlitParams>);
        }
        last = slitScene.getParams();
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });

    const unsubscribe = slitScene.subscribe(() => {
      const p = slitScene.getParams();
      applying = true;
      if (p.detectorX !== last.detectorX) {
        renderer.setValue('detectorX', p.detectorX);
      }
      if (p.lambda !== last.lambda) renderer.setValue('lambda', p.lambda);
      if (p.slitWidth !== last.slitWidth) {
        renderer.setValue('slitWidth', p.slitWidth);
      }
      if (p.distance !== last.distance) {
        renderer.setValue('distance', p.distance);
      }
      if (p.autoScan !== last.autoScan)
        renderer.setValue('autoScan', p.autoScan);
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
    applyParam: (key, value, ctx) => {
      if (key === 'autoScan') {
        const on = asBoolean(value);
        ctx.scene.setParams({ autoScan: on });
        ctx.setControlValue(key, on);
        return true;
      }
      if (
        key === 'lambda' ||
        key === 'slitWidth' ||
        key === 'distance' ||
        key === 'detectorX'
      ) {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({ [key]: number } as Partial<SingleSlitParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      return false;
    }
  }
});
