import { bootScenePage } from '../../app/scene-bootstrapper';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { projectileLabControlsSchema } from './controls-schema';
import { createProjectileLabScene } from './scene.entry';
import { projectileLabMeta } from './scene.meta';

const TOGGLE_KEYS = ['useLocator', 'recordOrigin', 'showLabels'] as const;
const SLIDER_KEYS = ['releaseH', 'chuteTilt', 'plateY'] as const;

function isToggleKey(key: string): key is (typeof TOGGLE_KEYS)[number] {
  return (TOGGLE_KEYS as readonly string[]).includes(key);
}

function isSliderKey(key: string): key is (typeof SLIDER_KEYS)[number] {
  return (SLIDER_KEYS as readonly string[]).includes(key);
}

bootScenePage({
  meta: projectileLabMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 300,
    leftMaxWidth: 460,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '实验状态',
    hideTransport: true,
    hasGraph: false,
    dataWorkspace: true
  },
  createScene: ({ canvas, theme, mode, demoHints }) =>
    createProjectileLabScene({ canvas, theme, mode, demoHints }),
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (!isToggleKey(key)) return false;
      const on = Number(value) > 0;
      ctx.scene.setParams({ [key]: on });
      ctx.setControlValue(key, on);
      return true;
    }
  },
  createControls: ({ mount, scene, onStatus, writeParam }) => {
    const renderer = renderSchema({
      mount,
      schema: projectileLabControlsSchema,
      onChange: (key, value) => {
        if (isToggleKey(key)) {
          scene.setParams({ [key]: Boolean(value) });
          writeParam?.(key, value ? 1 : 0);
        } else if (isSliderKey(key)) {
          scene.setParams({ [key]: Number(value) });
          writeParam?.(key, Number(value));
        }
      },
      onAction: (key) => {
        if (key === 'release') {
          const gate = scene.release();
          onStatus?.(gate.ok ? '小球已释放' : gate.reason);
        } else if (key === 'lowerPlate') {
          const moved = scene.lowerPlate();
          const plateY = scene.getParams().plateY;
          renderer.setValueSilently('plateY', plateY);
          writeParam?.('plateY', plateY);
          onStatus?.(moved ? `挡板下移到 y = ${plateY} cm` : '挡板已在最低处');
        } else if (key === 'trace') {
          const gate = scene.trace();
          onStatus?.(gate.ok ? '已取下白纸，描出轨迹' : gate.reason);
        } else if (key === 'newPaper') {
          scene.newPaper();
          onStatus?.('已换上新的白纸');
        }
      }
    });

    const syncFromScene = (): void => {
      const params = scene.getParams();
      for (const key of SLIDER_KEYS) {
        renderer.setValueSilently(key, params[key]);
      }
      for (const key of TOGGLE_KEYS) {
        renderer.setValueSilently(key, params[key] > 0);
      }
    };

    return { ...exposeSchemaHandle(renderer), syncFromScene };
  }
});
