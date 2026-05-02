import { bootScenePage } from '../../app/scene-bootstrapper';
import type { ReadoutItem } from '../../app/layouts/types';
import { electrificationMeta } from './scene.meta';
import { createElectrificationScene } from './scene.entry';
import { electrificationControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type {
  ElectrificationSnapshot,
  ElectrificationScene
} from './scene.sim';

function formatReadout(snapshot: ElectrificationSnapshot): ReadoutItem[] {
  return [
    {
      label: '场景',
      value:
        snapshot.state.scene === 'friction'
          ? '摩擦起电'
          : snapshot.state.scene === 'induction'
            ? '感应起电'
            : '接触起电'
    },
    { label: '下一步动作', value: snapshot.state.nextActionLabel },
    { label: '说明', value: snapshot.state.explanation }
  ];
}

bootScenePage({
  meta: electrificationMeta,
  createScene: ({ canvas, theme, mode, demoHints }) => {
    const scene = createElectrificationScene({
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
  createControls: ({ mount, scene, onStatus }) => {
    const renderer = renderSchema({
      mount,
      schema: electrificationControlsSchema,
      onChange: (key, value) => {
        if (key === 'scene') {
          scene.setScene(value as ElectrificationScene);
          scene.render();
          renderer.setActive(key, String(value));
        }
      },
      onAction: (key) => {
        if (key === 'step') {
          scene.runSceneAction();
          scene.render();
          onStatus?.('执行下一步');
        } else if (key === 'reset') {
          scene.reset?.();
          renderer.setActive('scene', 'friction');
          onStatus?.('已重置');
        }
      }
    });

    return {
      setActiveScene(scene: string) {
        renderer.setActive('scene', scene);
      },
      dispose: () => {
        renderer.dispose();
      }
    };
  },
  formatReadout: (state) => formatReadout(state as ElectrificationSnapshot),
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.35,
    hasGraph: false,
    controlColumns: 'auto',
    readoutCollapsed: false
  }
});
