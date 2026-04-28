/**
 * Theme Toggle Capability — 亮/暗主题切换按钮
 *
 * 从 DesktopSplitLayout.bindThemeToggleEvents / setTheme 提取为独立能力
 */

import type {
  CapabilityDefinition,
  CapabilityInstance,
  CapabilityContext,
  LayoutSlots,
  Theme
} from '../core/types';

export interface ThemeToggleConfig {
  /** 按钮挂载到的 CSS 选择器（相对于 layout container） */
  selector?: string;
  /** 白天模式按钮文本 */
  lightLabel?: string;
  /** 夜间模式按钮文本 */
  darkLabel?: string;
}

export function createThemeToggle(
  cfg: ThemeToggleConfig = {}
): CapabilityDefinition<ThemeToggleConfig> {
  return {
    id: 'theme-toggle',

    mount(
      _slots: LayoutSlots,
      config: ThemeToggleConfig,
      ctx: CapabilityContext
    ): CapabilityInstance {
      const merged = { ...cfg, ...config };
      const selector = merged.selector ?? '.theme-toggle-btn';
      const lightLabel = merged.lightLabel ?? '白天';
      const darkLabel = merged.darkLabel ?? '夜间';

      let btn: HTMLButtonElement | null = null;
      let btnCreated = false;
      let handler: (() => void) | null = null;

      // 查找或创建按钮
      btn = ctx.container.querySelector(selector) as HTMLButtonElement | null;
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'theme-toggle-btn';
        btn.setAttribute('aria-label', '切换到夜间主题');
        btnCreated = true;
        // 默认挂到 container 末尾
        ctx.container.appendChild(btn);
      }

      const updateLabel = (theme: Theme = 'light') => {
        if (!btn) return;
        btn.textContent = theme === 'dark' ? lightLabel : darkLabel;
        btn.setAttribute(
          'aria-label',
          theme === 'dark' ? '切换到白天主题' : '切换到夜间主题'
        );
      };

      handler = () => {
        const next = ctx.getTheme() === 'dark' ? 'light' : 'dark';
        ctx.setTheme(next);
        updateLabel(next);
      };

      btn.addEventListener('click', handler);
      updateLabel(ctx.getTheme());

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
