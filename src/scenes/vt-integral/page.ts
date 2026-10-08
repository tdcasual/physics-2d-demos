import { bootScenePage } from '../../app/scene-bootstrapper';
import { vtIntegralMeta } from './scene.meta';
import { createVtIntegralScene } from './scene.entry';
import {
  VT_CURVE_SECTION,
  VT_SPLIT_SECTION,
  vtIntegralControlsSchema
} from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import {
  decodeVtRule,
  decodeVtScene,
  encodeVtRule,
  encodeVtScene,
  isValidVtScene
} from './scene-values';
import type { VtCurveKind, VtScene } from './scene.sim';

/**
 * getParams().scene 是 1 基数字（scene1→1, scene2→2, scene3→3），
 * scene-selector 的 id 是 'scene1'..'scene3'。
 */
export function decodeVtSceneSelectorId(scene: number | string): string {
  return decodeVtScene(scene);
}

const CURVE_KEYS: readonly VtCurveKind[] = [
  'constant',
  'linear',
  'quadratic',
  'sine'
];

/**
 * 子场景相关控件可见性：函数类型、矩形取法只对场景一有意义；场景二
 * （拖动 A、B）不使用 n，整张「分割」卡片隐藏。
 *
 * 用 `hidden` 属性而非 inline display：演示模式 minimal 面板会记忆并
 * 恢复 inline display，两套机制互不覆盖（任一隐藏即隐藏）。
 */
export function applyVtSubsceneVisibility(
  mount: ParentNode,
  scene: VtScene
): void {
  const toggle = (selector: string, visible: boolean): void => {
    const node = mount.querySelector<HTMLElement>(selector);
    if (node) node.hidden = !visible;
  };
  toggle(`[data-control-section="${VT_CURVE_SECTION}"]`, scene === 'scene1');
  toggle(`[data-control-section="${VT_SPLIT_SECTION}"]`, scene !== 'scene2');
  toggle('[data-control-key="rule"]', scene === 'scene1');
}

bootScenePage({
  meta: vtIntegralMeta,
  createScene: ({ canvas, theme, mode, demoHints }) => {
    const scene = createVtIntegralScene({
      canvas,
      mode,
      demoHints,
      theme
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
    scheduleRender = () => scene.render(),
    writeParam
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
            applyVtSubsceneVisibility(mount, sceneId);
            // URL 用 1 基数字编码（meta.defaultParams.scene 为 number）
            writeParam?.(key, encodeVtScene(sceneId));
          }
        } else if (key === 'n') {
          scene.setParams({ n: value as number });
          scheduleRender();
          writeParam?.(key, value);
        } else if (key === 'rule') {
          const rule = decodeVtRule(value);
          scene.setParams({ rule });
          scheduleRender();
          writeParam?.(key, encodeVtRule(rule));
        }
      },
      onAction: (key) => {
        if ((CURVE_KEYS as readonly string[]).includes(key)) {
          scene.setCurveKind(key as VtCurveKind);
          scheduleRender();
        }
      }
    });

    const syncFromScene = (): void => {
      const params = scene.getParams();
      const sceneId = decodeVtScene(params.scene);
      renderer.setActiveSilently('scene', sceneId);
      renderer.setValueSilently('n', params.n);
      renderer.setValueSilently('rule', String(params.rule));
      applyVtSubsceneVisibility(mount, sceneId);
    };

    applyVtSubsceneVisibility(mount, decodeVtScene(scene.getParams().scene));

    return {
      ...exposeSchemaHandle(renderer),
      syncFromScene
    };
  },
  paramSync: {
    // scene 以数字进出 URL；scene-selector 只认 'sceneN' id，需解码后高亮
    applyParam: (key, value, ctx) => {
      if (key !== 'scene') return false;
      const sceneId = decodeVtScene(value);
      ctx.scene.setParams({ scene: encodeVtScene(sceneId) });
      ctx.setControlActive('scene', sceneId);
      applyVtSubsceneVisibility(ctx.mount, sceneId);
      return true;
    }
  },
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.35,
    hasGraph: false,
    controlColumns: 'auto',
    readoutCollapsed: false,
    hideTransport: true
  }
});
