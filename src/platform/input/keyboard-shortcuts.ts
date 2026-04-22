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
    if (this.isTypingInInput(e)) return;
    const handler = this.shortcuts.get(e.key.toLowerCase());
    if (handler) {
      e.preventDefault();
      handler();
    }
  };

  private isTypingInInput(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement | null;
    if (!target) return false;
    return (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
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
