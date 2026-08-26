/**
 * 全局键盘快捷键管理器
 *
 * 为物理演示场景提供统一的键盘操作支持：
 * - Space: 播放/暂停
 * - R: 重置
 * - T: 切换主题
 * - +/-: 调整速度
 * - ←/→: 单步前进/后退
 */

export type ShortcutHandler = () => void;

export class KeyboardShortcutManager {
  /**
   * 焦点位于这些可交互元素上时不触发全局快捷键，
   * 避免与元素自身的键盘行为冲突（如 tab/radio 的方向键导航、
   * button 的 Space 激活、separator/slider 的方向键调整、
   * tabpanel 的方向键滚动）。
   * 注意：canvas 可聚焦且 ←/→ 单步是刻意功能，不在豁免之列。
   */
  private static readonly INTERACTIVE_SELECTOR = [
    'button',
    'a[href]',
    'input',
    'textarea',
    'select',
    '[contenteditable="true"]',
    '[role="tab"]',
    '[role="tabpanel"]',
    '[role="region"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="separator"]',
    '[role="slider"]',
    '[role="checkbox"]',
    '[role="menuitem"]'
  ].join(',');

  private shortcuts = new Map<string, ShortcutHandler>();
  private enabled = false;

  register(key: string, handler: ShortcutHandler): void {
    this.shortcuts.set(key.toLowerCase(), handler);
  }

  registerMultiple(map: Record<string, ShortcutHandler>): void {
    Object.entries(map).forEach(([key, handler]) => {
      this.shortcuts.set(key.toLowerCase(), handler);
    });
  }

  init(): void {
    if (this.enabled) return;
    document.addEventListener('keydown', this.onKeyDown);
    this.enabled = true;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.isInteractiveTarget(e)) return;
    const handler = this.shortcuts.get(e.key.toLowerCase());
    if (handler) {
      e.preventDefault();
      handler();
    }
  };

  private isInteractiveTarget(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement | null;
    if (!target || typeof target.closest !== 'function') return false;
    return (
      target.closest(KeyboardShortcutManager.INTERACTIVE_SELECTOR) !== null ||
      target.isContentEditable
    );
  }

  dispose(): void {
    if (!this.enabled) return;
    document.removeEventListener('keydown', this.onKeyDown);
    this.enabled = false;
    this.shortcuts.clear();
  }
}
