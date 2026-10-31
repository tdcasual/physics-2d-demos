import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeOwnedSceneParams } from '../../app/url-sync';
import { createStageInteraction } from '../../platform/input/stage-interaction';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { createThreeForcesScene } from './scene.entry';
import { threeForcesMeta } from './scene.meta';
import { threeForcesControlsSchema } from './controls-schema';
import {
  parseThreeForcesTab,
  pointerToBaseNorm,
  stageLayoutFrom,
  type ThreeForcesHandle,
  type ThreeForcesParams
} from './scene.sim';
import { asBoolean } from '../../core/coerce';

bootScenePage({
  meta: threeForcesMeta,
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
    if (!canvas) throw new Error('three-forces requires a canvas');
    const scene = createThreeForcesScene({ canvas, theme, mode, demoHints });
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
          id as Exclude<ThreeForcesHandle, null>,
          model.x,
          model.y
        );
      },
      commit: () => {
        const p = scene.getParams();
        if (p.tab === 'spring') {
          writeOwnedSceneParams(sceneWriter, { springX: p.springX });
        }
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
    const forceScene = scene as ReturnType<typeof createThreeForcesScene>;
    let applying = false;
    let last = forceScene.getParams();

    const renderer = renderSchema({
      mount,
      schema: threeForcesControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        if (key === 'tab') {
          const tab = parseThreeForcesTab(value, 'gravity');
          forceScene.setParams({ tab });
          renderer.setActive(key, tab);
        } else if (key === 'autoRun' || key === 'showComponents') {
          forceScene.setParams({
            [key]: asBoolean(value)
          } as Partial<ThreeForcesParams>);
        } else {
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          forceScene.setParams({
            [key]: number
          } as Partial<ThreeForcesParams>);
        }
        last = forceScene.getParams();
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });

    const unsubscribe = forceScene.subscribe(() => {
      const p = forceScene.getParams();
      applying = true;
      if (p.mass !== last.mass) renderer.setValue('mass', p.mass);
      if (p.inclineAngle !== last.inclineAngle) {
        renderer.setValue('inclineAngle', p.inclineAngle);
      }
      if (p.mu !== last.mu) renderer.setValue('mu', p.mu);
      if (p.springK !== last.springK) renderer.setValue('springK', p.springK);
      if (p.springX !== last.springX) renderer.setValue('springX', p.springX);
      if (p.autoRun !== last.autoRun) renderer.setValue('autoRun', p.autoRun);
      if (p.showComponents !== last.showComponents) {
        renderer.setValue('showComponents', p.showComponents);
      }
      if (p.tab !== last.tab) {
        renderer.setActive('tab', p.tab);
      }
      applying = false;
      last = p;
    });

    const syncFromScene = (): void => {
      const p = forceScene.getParams();
      renderer.setValueSilently('mass', p.mass);
      renderer.setValueSilently('inclineAngle', p.inclineAngle);
      renderer.setValueSilently('mu', p.mu);
      renderer.setValueSilently('springK', p.springK);
      renderer.setValueSilently('springX', p.springX);
      renderer.setValueSilently('autoRun', p.autoRun);
      renderer.setValueSilently('showComponents', p.showComponents);
      renderer.setActiveSilently('tab', p.tab);
      last = p;
    };

    return {
      ...exposeSchemaHandle(renderer),
      syncFromScene,
      dispose(): void {
        unsubscribe();
        renderer.dispose();
      }
    };
  },
  paramSync: {
    activeKeys: ['tab'],
    applyParam: (key, value, ctx) => {
      if (key === 'tab') {
        const tab = parseThreeForcesTab(value, 'gravity');
        ctx.scene.setParams({ tab });
        ctx.setControlActive('tab', tab);
        return true;
      }
      if (key === 'autoRun' || key === 'showComponents') {
        const on = asBoolean(value);
        ctx.scene.setParams({ [key]: on } as Partial<ThreeForcesParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      if (
        key === 'mass' ||
        key === 'inclineAngle' ||
        key === 'mu' ||
        key === 'springK' ||
        key === 'springX'
      ) {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({
          [key]: number
        } as Partial<ThreeForcesParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      return false;
    },
    afterApply: (ctx) => {
      const tab = parseThreeForcesTab(
        (ctx.scene as ReturnType<typeof createThreeForcesScene>).getParams()
          .tab,
        'gravity'
      );
      ctx.setControlActive('tab', tab);
    }
  }
});
