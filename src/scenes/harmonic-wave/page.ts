import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeSceneParams } from '../../app/url-sync';
import { applyTouchInteractionMode } from '../../platform/input/touch';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createHarmonicWaveScene } from './scene.entry';
import { harmonicWaveMeta } from './scene.meta';
import { harmonicWaveControlsSchema } from './controls-schema';
import {
  pointerToWorldX,
  stageLayoutFrom,
  type HarmonicWaveDirection,
  type HarmonicWaveParams
} from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

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
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('harmonic-wave requires a canvas');
    applyTouchInteractionMode(canvas, 'drag');
    const scene = createHarmonicWaveScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    const toWorldX = (event: PointerEvent): number => {
      const rect = canvas.getBoundingClientRect();
      return pointerToWorldX(
        event.clientX - rect.left,
        event.clientY - rect.top,
        rect.width,
        rect.height,
        stageLayoutFrom(canvas)
      );
    };
    const onPointerDown = (event: PointerEvent): void => {
      scene.setPointX(toWorldX(event));
      canvas.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (canvas.hasPointerCapture(event.pointerId))
        scene.setPointX(toWorldX(event));
    };
    const onPointerUp = (event: PointerEvent): void => {
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // no-op
      }
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
      writeSceneParams({ pointX: scene.getParams().pointX });
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
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
