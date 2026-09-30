/**
 * Layout Switch Capability — 布局切换按钮
 *
 * 在桌面端工具栏中显示一个按钮，点击切换到下一个可用布局。
 * 遵循 find-or-create 模式（与 theme/mode-toggle 一致）。
 */

import type {
  CapabilityDefinition,
  CapabilityInstance,
  CapabilityContext,
  LayoutSlots
} from '../types';

export interface LayoutSwitchConfig {
  selector?: string;
}

export function createLayoutSwitch(
  cfg: LayoutSwitchConfig = {}
): CapabilityDefinition<LayoutSwitchConfig> {
  return {
    id: 'layout-switch',

    mount(
      _slots: LayoutSlots,
      config: LayoutSwitchConfig,
      ctx: CapabilityContext
    ): CapabilityInstance {
      const merged = { ...cfg, ...config };
      const selector = merged.selector ?? '.layout-switch-btn';

      let btn: HTMLButtonElement | null = null;
      let btnCreated = false;

      btn = ctx.container.querySelector(selector) as HTMLButtonElement | null;
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'layout-switch-btn';
        btn.setAttribute('aria-label', '切换布局');
        btnCreated = true;
        ctx.container.appendChild(btn);
      }

      const updateLabel = () => {
        if (!btn) return;
        const layouts = ctx.getAvailableLayouts();
        if (layouts.length < 2) {
          btn.style.display = 'none';
          return;
        }
        btn.style.display = '';
        const currentId = ctx.getCurrentLayoutId();
        const currentIdx = layouts.findIndex((l) => l.id === currentId);
        const nextIdx = (currentIdx + 1) % layouts.length;
        const next = layouts[nextIdx];
        btn.textContent = next.name;
        btn.setAttribute('aria-label', `切换到${next.name}`);
      };

      const handler = () => {
        const layouts = ctx.getAvailableLayouts();
        if (layouts.length < 2) return;
        const currentId = ctx.getCurrentLayoutId();
        const currentIdx = layouts.findIndex((l) => l.id === currentId);
        const nextIdx = (currentIdx + 1) % layouts.length;
        // 切换期间本实例随旧布局被 orchestrator 销毁，新布局装配新的
        // layout-switch 实例（capability 一律销毁重建）。
        // Promise<void> | void 不能直接 .catch（TS2339）；host 适配器已
        // 旁路 surfaceSwitchError，此处只收口未处理 rejection。
        void Promise.resolve(ctx.switchLayout(layouts[nextIdx].id, true)).catch(
          (err: unknown) => {
            console.error('[layout-switch] switchLayout failed:', err);
          }
        );
      };

      btn.addEventListener('click', handler);
      updateLabel();

      return {
        dispose() {
          if (btn && handler) {
            btn.removeEventListener('click', handler);
          }
          if (btnCreated && btn) btn.remove();
          btn = null;
        }
      };
    }
  };
}
