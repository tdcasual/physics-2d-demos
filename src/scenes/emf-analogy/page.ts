import { bootScenePage } from '../../app/scene-bootstrapper';
import { emfAnalogyMeta } from './scene.meta';
import { createEmfAnalogyScene } from './scene.entry';
import { emfAnalogyControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
bootScenePage({
  meta: emfAnalogyMeta,
  createScene: ({ canvas, theme, mode, demoHints }) => {
    const scene = createEmfAnalogyScene({
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
      schema: emfAnalogyControlsSchema,
      onChange: (key, value) => {
        if (key === 'tap') {
          scene.setTapOpening(value as number);
          scheduleRender();
          scene.startAll?.();
          const snapshot = scene.getSnapshot?.();
          const rText =
            snapshot?.state.externalR === Infinity
              ? '∞'
              : snapshot?.state.externalR.toFixed(1);
          onStatus?.(`外电阻 R=${rText}Ω`);
        } else if (key === 'speed') {
          onStatus?.(`播放速度: ${value}x`);
        }
      },
      onAction: (key) => {
        if (key === 'on') {
          scene.setSystemOn(true);
          scheduleRender();
          scene.startAll?.();
          onStatus?.('开关闭合');
        } else if (key === 'off') {
          scene.setSystemOn(false);
          scheduleRender();
          scene.pauseAll?.();
          onStatus?.('开关断开');
        } else if (key === 'circuit') {
          scene.setView?.('circuit');
          onStatus?.('切换到电路视图');
        } else if (key === 'water') {
          scene.setView?.('water');
          onStatus?.('切换到水类比视图');
        } else if (key === 'reset') {
          scene.reset?.();
          onStatus?.('系统已重置');
        } else if (key === 'transport:play') {
          scene.startAll?.();
        } else if (key === 'transport:pause') {
          scene.pauseAll?.();
        } else if (key === 'transport:reset') {
          scene.reset?.();
        } else if (key === 'transport:step') {
          // 单步推进：保留同步渲染，用户期待立即看到这一帧
          scene.step?.(0.016);
          scene.render?.();
        }
      }
    });

    return exposeSchemaHandle(renderer);
  },

  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.3,
    hasGraph: false,
    controlColumns: 'auto',
    readoutCollapsed: true
  }
});
