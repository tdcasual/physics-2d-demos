import { bootScenePage } from '../../app/scene-bootstrapper';
import { vtIntegralMeta } from './scene.meta';
import { createVtIntegralScene } from './scene.entry';
import { vtIntegralControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { isValidVtScene } from './scene-values';

bootScenePage({
  meta: vtIntegralMeta,
  createScene: ({ canvas, theme, mode, demoHints }) => {
    const scene = createVtIntegralScene({
      canvas,
      mode,
      demoHints,
      theme,
      onReadout: () => {}
    });

    return {
      ...scene,
      getState() {
        return scene.getSnapshot();
      }
    };
  },
  createControls: ({
    mount,
    scene,
    onStatus,
    scheduleRender = () => scene.render()
  }) => {
    const renderer = renderSchema({
      mount,
      schema: vtIntegralControlsSchema,
      onChange: (key, value) => {
        if (key === 'scene') {
          const sceneId = String(value);
          if (isValidVtScene(sceneId)) {
            scene.setScene(sceneId);
            scheduleRender();
            renderer.setActive(key, sceneId);
          }
        } else if (key === 'rects') {
          scene.setRects(value as number);
          scheduleRender();
        } else if (key === 'time') {
          scene.setTime(value as number);
          scheduleRender();
        } else if (key === 'amplitude') {
          scene.setCurveAmplitude(value as number);
          scheduleRender();
        } else if (key === 'circle-n') {
          scene.setCircleN(value as number);
          scheduleRender();
        } else if (key === 'division') {
          scene.setDivision(value as number);
          scheduleRender();
        } else if (key === 'surface-n') {
          scene.setSurfaceN(value as number);
          scheduleRender();
        }
      },
      onAction: (key) => {
        if (key === 'constant') {
          // scene.setPreset?.('constant');
          onStatus?.('匀速运动 v(t)=2');
        } else if (key === 'linear') {
          onStatus?.('匀加速运动 v(t)=0.5t');
        } else if (key === 'quadratic') {
          onStatus?.('变加速运动 v(t)=0.1t²');
        } else if (key === 'sine') {
          onStatus?.('正弦运动 v(t)=sin(t)');
        } else if (key === 'transport:play') {
          // 单步推进：保留同步渲染，用户期待立即看到这一帧
          scene.step(0.1);
          scene.render();
        } else if (key === 'transport:pause') {
          // no-op
        } else if (key === 'transport:reset') {
          scene.reset?.();
        } else if (key === 'transport:step') {
          // 单步推进：保留同步渲染，用户期待立即看到这一帧
          scene.step(0.1);
          scene.render();
        }
      }
    });

    return {
      dispose: () => {
        renderer.dispose();
      }
    };
  },
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.35,
    hasGraph: false,
    controlColumns: 'auto',
    readoutCollapsed: true
  }
});
