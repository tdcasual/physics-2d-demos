/**
 * 主题管理器
 *
 * 支持跟随系统主题偏好（prefers-color-scheme）
 */

import type { Theme } from '../../../types';

export class ThemeManager {
  private systemThemeQuery: MediaQueryList | null = null;
  private currentTheme: Theme = 'light';

  constructor(
    private container: HTMLElement,
    private followSystem: boolean = true,
    private onThemeChange?: (theme: Theme) => void
  ) {
    this.init();
  }

  private init() {
    if (this.followSystem && typeof window !== 'undefined') {
      this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.handleSystemThemeChange();
      this.systemThemeQuery.addEventListener('change', this.handleSystemThemeChange);
    }
  }

  private handleSystemThemeChange = () => {
    if (!this.followSystem) return;
    const newTheme = this.systemThemeQuery?.matches ? 'dark' : 'light';
    this.setTheme(newTheme);
  };

  setTheme(theme: Theme) {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;
    this.container.setAttribute('data-theme', theme);
    this.onThemeChange?.(theme);
  }

  getTheme(): Theme {
    return this.currentTheme;
  }

  destroy() {
    this.systemThemeQuery?.removeEventListener('change', this.handleSystemThemeChange);
  }
}
