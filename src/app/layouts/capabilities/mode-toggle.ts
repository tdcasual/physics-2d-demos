/**
 * Mode Toggle Capability — normal/presentation 模式切换按钮
 *
 * 从 DesktopSplitLayout.bindModeToggleEvents / setMode 提取为独立能力
 */

import type {
  CapabilityDefinition,
  CapabilityInstance,
  CapabilityContext,
  LayoutSlots
} from '../types';

export interface ModeToggleConfig {
  selector?: string;
  normalLabel?: string;
  presentationLabel?: string;
}

export function createModeToggle(
  cfg: ModeToggleConfig = {}
): CapabilityDefinition<ModeToggleConfig> {
  return {
    id: 'mode-toggle',

    mount(
      _slots: LayoutSlots,
      config: ModeToggleConfig,
      ctx: CapabilityContext
    ): CapabilityInstance {
      const merged = { ...cfg, ...config };
      const selector = merged.selector ?? '.mode-toggle-btn';
      const normalLabel = merged.normalLabel ?? '标准';
      const presentationLabel = merged.presentationLabel ?? '演示';

      let btn: HTMLButtonElement | null = null;
      let btnCreated = false;
      let handler: (() => void) | null = null;

      btn = ctx.container.querySelector(selector) as HTMLButtonElement | null;
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mode-toggle-btn';
        btn.setAttribute('aria-label', '切换到演示模式');
        btnCreated = true;
        ctx.container.appendChild(btn);
      }

      const updateLabel = (mode: string = 'normal') => {
        if (!btn) return;
        if (mode === 'presentation') {
          btn.textContent = normalLabel;
          btn.setAttribute('aria-label', '切换到标准模式');
        } else {
          btn.textContent = presentationLabel;
          btn.setAttribute('aria-label', '切换到演示模式');
        }
      };

      handler = () => {
        const next =
          ctx.getMode() === 'presentation' ? 'normal' : 'presentation';
        ctx.setMode(next);
        updateLabel(next);
      };

      btn.addEventListener('click', handler);
      updateLabel(ctx.getMode());

      return {
        dispose() {
          if (btn && handler) {
            btn.removeEventListener('click', handler);
          }
          if (btnCreated && btn) btn.remove();
          btn = null;
          handler = null;
        }
      };
    }
  };
}
