import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeOwnedSceneParams } from '../../app/url-sync';
import { createStageInteraction } from '../../platform/input/stage-interaction';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { createForceCompositionScene } from './scene.entry';
import { forceCompositionMeta } from './scene.meta';
import { forceCompositionControlsSchema } from './controls-schema';
import {
  pointerToBaseNorm,
  stageLayoutFrom,
  type ForceCompositionParams,
  type ForceCompositionTab
} from './scene.sim';

function urlSnapshot(
  p: ForceCompositionParams
): Record<string, string | number> {
  return {
    tab: p.tab,
    rule: p.rule,
    f1: p.f1,
    f2: p.f2,
    angle: p.angle,
    orthogonalF: p.orthogonalF,
    orthogonalAngle: p.orthogonalAngle,
    gravity: p.gravity,
    inclineAngle: p.inclineAngle,
    rangeSweep: p.rangeSweep ? 1 : 0
  };
}

bootScenePage({
  meta: forceCompositionMeta,
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
    if (!canvas) throw new Error('force-composition requires a canvas');
    const scene = createForceCompositionScene({
      canvas,
      theme,
      mode,
      demoHints
    });
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
        scene.moveHandle(id as 'f1' | 'f2' | 'orthogonal', model.x, model.y);
      },
      onChange: () => scheduler.schedule()
    });
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      dispose(): void {
        scheduler.dispose();
        interaction.dispose();
        dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, sceneWriter }) => {
    const render = scheduleRender ?? (() => scene.render());
    let applying = false;
    let lastUi = scene.getParams();

    const writeUrl = (p: ForceCompositionParams): void => {
      writeOwnedSceneParams(sceneWriter, urlSnapshot(p));
    };

    const syncFromScene = (): void => {
      const p = scene.getParams();
      applying = true;
      if (p.f1 !== lastUi.f1) renderer.setValue('f1', p.f1);
      if (p.f2 !== lastUi.f2) renderer.setValue('f2', p.f2);
      if (Math.round(p.angle) !== Math.round(lastUi.angle))
        renderer.setValue('angle', p.angle);
      if (p.orthogonalF !== lastUi.orthogonalF)
        renderer.setValue('orthogonalF', p.orthogonalF);
      if (Math.round(p.orthogonalAngle) !== Math.round(lastUi.orthogonalAngle))
        renderer.setValue('orthogonalAngle', p.orthogonalAngle);
      if (p.gravity !== lastUi.gravity) renderer.setValue('gravity', p.gravity);
      if (p.inclineAngle !== lastUi.inclineAngle)
        renderer.setValue('inclineAngle', p.inclineAngle);
      if (p.rangeSweep !== lastUi.rangeSweep)
        renderer.setValue('rangeSweep', p.rangeSweep);
      if (p.tab !== lastUi.tab) {
        renderer.setActive('tab', p.tab);
      }
      if (p.rule !== lastUi.rule) renderer.setActive('rule', p.rule);
      applying = false;
      const changed =
        p.f1 !== lastUi.f1 ||
        p.f2 !== lastUi.f2 ||
        p.angle !== lastUi.angle ||
        p.orthogonalF !== lastUi.orthogonalF ||
        p.orthogonalAngle !== lastUi.orthogonalAngle ||
        p.gravity !== lastUi.gravity ||
        p.inclineAngle !== lastUi.inclineAngle ||
        p.rangeSweep !== lastUi.rangeSweep ||
        p.tab !== lastUi.tab ||
        p.rule !== lastUi.rule;
      lastUi = { ...p };
      if (changed) writeUrl(p);
    };

    const renderer = renderSchema({
      mount,
      schema: forceCompositionControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        const next: Partial<ForceCompositionParams> = {};
        if (key === 'tab') next.tab = String(value) as ForceCompositionTab;
        else if (key === 'rule')
          next.rule = String(value) as ForceCompositionParams['rule'];
        else if (key === 'rangeSweep')
          next.rangeSweep = value === true || value === 1 || value === '1';
        else next[key as keyof ForceCompositionParams] = Number(value) as never;
        scene.setParams(next);
        if (key === 'tab' || key === 'rule')
          renderer.setActive(key, String(value));
        lastUi = scene.getParams();
        render();
        writeUrl(lastUi);
      },
      onAction: () => {}
    });

    const unsubscribe = scene.subscribe(syncFromScene);

    const projectFromLive = (): void => {
      const p = scene.getParams();
      applying = true;
      renderer.setValueSilently('f1', p.f1);
      renderer.setValueSilently('f2', p.f2);
      renderer.setValueSilently('angle', p.angle);
      renderer.setValueSilently('orthogonalF', p.orthogonalF);
      renderer.setValueSilently('orthogonalAngle', p.orthogonalAngle);
      renderer.setValueSilently('gravity', p.gravity);
      renderer.setValueSilently('inclineAngle', p.inclineAngle);
      renderer.setValueSilently('rangeSweep', p.rangeSweep);
      renderer.setActiveSilently('tab', p.tab);
      renderer.setActiveSilently('rule', p.rule);
      applying = false;
      lastUi = { ...p };
    };

    return {
      ...exposeSchemaHandle(renderer),
      setActive(key: string, value: string): void {
        renderer.setActive(key, value);
      },
      syncFromScene: projectFromLive,
      dispose(): void {
        unsubscribe();
        renderer.dispose();
      }
    };
  }
});
