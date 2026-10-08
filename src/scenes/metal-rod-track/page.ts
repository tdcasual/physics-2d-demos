import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import type { MetalRodMode, MetalRodParams } from './scene.sim';
import {
  METAL_ROD_CHARGE_SECTION,
  METAL_ROD_DYNAMICS_KEYS,
  metalRodControlsSchema
} from './controls-schema';
import { createMetalRodScene } from './scene.entry';
import { metalRodMeta } from './scene.meta';

const MODES: readonly MetalRodMode[] = ['coast', 'pull', 'charge'];

export function decodeMetalRodMode(value: unknown): MetalRodMode | null {
  const mode = String(value) as MetalRodMode;
  return MODES.includes(mode) ? mode : null;
}

/**
 * 模式相关控件可见性：电荷量模式下 m、v₀ 无意义（运动由所选 v(t) 给定），
 * 「微元法求电荷量」卡片只在该模式出现。
 *
 * 用 `hidden` 属性而非 inline display：演示模式 minimal 面板 / 停靠芯片会
 * 记忆并恢复 inline display，两套机制互不覆盖（任一隐藏即隐藏）。
 */
export function applyMetalRodModeVisibility(
  mount: ParentNode,
  mode: MetalRodMode
): void {
  const charge = mode === 'charge';
  const toggle = (selector: string, visible: boolean): void => {
    mount
      .querySelectorAll<HTMLElement>(selector)
      .forEach((node) => (node.hidden = !visible));
  };
  toggle(`[data-control-section="${METAL_ROD_CHARGE_SECTION}"]`, charge);
  toggle('[data-control-key="profile"]', charge);
  toggle('[data-control-key="strips"]', charge);
  METAL_ROD_DYNAMICS_KEYS.forEach((key) =>
    toggle(`[data-control-key="${key}"]`, !charge)
  );
}

/** 控件节点在演示模式可能被移进读数面板，按文档根查找才不会漏掉 */
function controlRoot(mount: HTMLElement): ParentNode {
  return mount.ownerDocument ?? mount;
}

bootScenePage({
  meta: metalRodMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '核心状态追踪',
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('metal-rod-track requires a canvas');
    const scene = createMetalRodScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    return {
      ...scene,
      step(dt: number) {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose() {
        scheduler.dispose();
        scene.dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const root = controlRoot(mount);
    const renderer = renderSchema({
      mount,
      schema: metalRodControlsSchema,
      onChange: (key, value) => {
        if (key === 'mode') {
          const mode = decodeMetalRodMode(value);
          if (!mode) return;
          scene.setParams({ mode });
          renderer.setActive(key, mode);
          applyMetalRodModeVisibility(root, mode);
        } else if (key === 'autoRun') {
          scene.setParams({ autoRun: Boolean(value) });
        } else {
          scene.setParams({ [key]: Number(value) } as Partial<MetalRodParams>);
        }
        render();
        // profile 由 select 给出字符串，URL 按数字编码（defaultParams 为 number）
        writeParam?.(key, key === 'profile' ? Number(value) : value);
      },
      onAction: () => render()
    });

    const syncFromScene = (): void => {
      const params = scene.getParams();
      renderer.setActiveSilently('mode', params.mode);
      renderer.setValueSilently('magneticField', params.magneticField);
      renderer.setValueSilently('resistance', params.resistance);
      renderer.setValueSilently('mass', params.mass);
      renderer.setValueSilently('initialVelocity', params.initialVelocity);
      renderer.setValueSilently('autoRun', params.autoRun);
      renderer.setValueSilently('profile', String(params.profile));
      renderer.setValueSilently('strips', params.strips);
      applyMetalRodModeVisibility(root, params.mode);
    };

    applyMetalRodModeVisibility(root, scene.getParams().mode);

    return { ...exposeSchemaHandle(renderer), syncFromScene };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'mode') {
        const mode = decodeMetalRodMode(value);
        if (!mode) return false;
        ctx.scene.setParams({ mode });
        ctx.setControlActive(key, mode);
        applyMetalRodModeVisibility(controlRoot(ctx.mount), mode);
        return true;
      }
      if (key === 'autoRun') {
        const enabled =
          value === 1 ||
          value === '1' ||
          String(value).toLowerCase() === 'true';
        ctx.scene.setParams({ autoRun: enabled });
        ctx.setControlValue(key, enabled);
        return true;
      }
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      ctx.scene.setParams({ [key]: number } as Partial<MetalRodParams>);
      ctx.setControlValue(key, key === 'profile' ? String(number) : number);
      return true;
    }
  }
});
