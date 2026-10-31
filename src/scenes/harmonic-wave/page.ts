import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeOwnedSceneParams } from '../../app/url-sync';
import { createStageInteraction } from '../../platform/input/stage-interaction';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { createHarmonicWaveScene } from './scene.entry';
import { harmonicWaveMeta } from './scene.meta';
import { harmonicWaveControlsSchema } from './controls-schema';
import {
  pointerToWorldX,
  stageLayoutFrom,
  type HarmonicWaveDirection,
  type HarmonicWaveParams
} from './scene.sim';
import { asBoolean } from '../../core/coerce';

bootScenePage({
  meta: harmonicWaveMeta,
  autoPlay: true,
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
  createScene: ({ canvas, theme, mode, demoHints, sceneWriter }) => {
    if (!canvas) throw new Error('harmonic-wave requires a canvas');
    const scene = createHarmonicWaveScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    const setPoint = (_id: string, model: { x: number; y: number }): void => {
      scene.setPointX(model.x);
    };
    const interaction = createStageInteraction({
      canvas,
      toModel: (local, size) => ({
        x: pointerToWorldX(
          local.x,
          local.y,
          size.width,
          size.height,
          stageLayoutFrom(canvas)
        ),
        y: 0
      }),
      pick: () => 'point',
      move: setPoint,
      onPress: setPoint,
      commit: () => {
        const pointInput = document.querySelector<HTMLInputElement>(
          '[data-control-key="pointX"] input[type="range"]'
        );
        if (pointInput) {
          const value = String(scene.getParams().pointX);
          if (pointInput.value !== value) {
            pointInput.value = value;
            pointInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        writeOwnedSceneParams(sceneWriter, {
          pointX: scene.getParams().pointX
        });
      }
    });
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        interaction.dispose();
        scene.dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const waveScene = scene as ReturnType<typeof createHarmonicWaveScene>;
    const renderer = renderSchema({
      mount,
      schema: harmonicWaveControlsSchema,
      onChange: (key, value) => {
        if (key === 'direction') {
          waveScene.setDirection(String(value) as HarmonicWaveDirection);
          renderer.setActive(key, String(value));
        } else if (
          key === 'showGhost' ||
          key === 'showVelocity' ||
          key === 'showAcceleration'
        ) {
          const on = asBoolean(value);
          waveScene.setParams({
            [key]: on
          } as Partial<HarmonicWaveParams>);
          writeParam?.(key, on ? 1 : 0);
          render();
          return;
        } else {
          waveScene.setParams({
            [key]: Number(value)
          } as Partial<HarmonicWaveParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });
    return exposeSchemaHandle(renderer);
  }
});
