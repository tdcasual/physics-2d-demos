import { bootScenePage } from '../../app/scene-bootstrapper';
import type { ReadoutItem } from '../../app/layouts/types';
import { emfAnalogyMeta } from './scene.meta';
import { createEmfAnalogyScene } from './scene.entry';
import { emfAnalogyControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { EmfAnalogySnapshot } from './scene.sim';

function formatReadout(snapshot: EmfAnalogySnapshot): ReadoutItem[] {
  return [
    { label: '系统状态', value: snapshot.state.isSystemOn ? '通路' : '断路' },
    {
      label: '外电阻 R',
      value:
        snapshot.state.externalR === Infinity
          ? '∞ Ω'
          : `${snapshot.state.externalR.toFixed(1)} Ω`
    },
    { label: '电流 I', value: `${snapshot.state.currentI.toFixed(2)} A` },
    {
      label: '内阻压降 Ir',
      value: `${snapshot.state.internalDrop.toFixed(2)} V`
    },
    {
      label: '路端电压 U',
      value: `${snapshot.state.terminalVoltage.toFixed(2)} V`
    }
  ];
}

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
      },
      startAll() {
        scene.start();
      },
      pauseAll() {
        scene.stop();
      }
    };
  },
  createControls: ({ mount, scene, onStatus }) => {
    renderSchema({
      mount,
      schema: emfAnalogyControlsSchema,
      onChange: (key, value) => {
        if (key === 'tap') {
          scene.setTapOpening(value as number);
          scene.render();
          scene.startAll?.();
          const snapshot = scene.getSnapshot?.() as EmfAnalogySnapshot;
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
          scene.render();
          scene.startAll?.();
          onStatus?.('开关闭合');
        } else if (key === 'off') {
          scene.setSystemOn(false);
          scene.render();
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
          scene.step?.(0.016);
          scene.render?.();
        }
      }
    });

    return {
      dispose: () => {
        mount.replaceChildren();
      }
    };
  },
  formatReadout: (state) => formatReadout(state as EmfAnalogySnapshot),
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.3,
    hasGraph: false,
    controlColumns: 1,
    readoutCollapsed: true
  }
});
