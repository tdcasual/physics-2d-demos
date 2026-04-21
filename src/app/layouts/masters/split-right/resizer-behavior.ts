/**
 * ResizerBehavior - 主分隔条拖拽行为
 *
 * 处理鼠标拖拽和键盘（ArrowLeft/ArrowRight）调整左侧面板宽度。
 */

export interface ResizerConfig {
  leftMinWidth?: number;
  leftMaxWidth?: number;
}

export class ResizerBehavior {
  private isDragging = false;
  private _handleKeyDown?: (e: KeyboardEvent) => void;

  constructor(
    private container: HTMLElement,
    private resizer: HTMLElement | null,
    private leftPanel: HTMLElement | null,
    private getConfig: () => ResizerConfig,
    private onChange: (leftRatio: number) => void
  ) {}

  /** 绑定到 resizer 的 mousedown 事件 */
  onMouseDown(e: MouseEvent, isCompactViewport: boolean): void {
    if (isCompactViewport) return;

    this.isDragging = true;
    e.preventDefault();
    this.resizer?.classList.add('is-dragging');

    const startX = e.clientX;
    const startWidth = this.leftPanel?.clientWidth || 0;
    const containerWidth = this.container.clientWidth;

    const handleMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - startX;
      const newWidth = startWidth + deltaX;

      const cfg = this.getConfig();
      const minWidth = cfg.leftMinWidth ?? 260;
      const maxWidth = Math.min(cfg.leftMaxWidth ?? 960, containerWidth * 0.5);

      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      const leftRatio = clampedWidth / containerWidth;

      this.container.style.gridTemplateColumns = `${clampedWidth}px 8px 1fr`;
      this.onChange(leftRatio);
    };

    const handleMouseUp = () => {
      this.isDragging = false;
      this.resizer?.classList.remove('is-dragging');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    // 先移除旧 keydown 监听器，防止快速点击时短暂累积
    this.resizer?.removeEventListener(
      'keydown',
      this._handleKeyDown as EventListener
    );

    this._handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const step = e.key === 'ArrowLeft' ? -10 : 10;
      const cfg = this.getConfig();
      const minWidth = cfg.leftMinWidth ?? 260;
      const maxWidth = Math.min(cfg.leftMaxWidth ?? 960, containerWidth * 0.5);
      const currentWidth = this.leftPanel?.clientWidth || minWidth;
      const newWidth = Math.max(
        minWidth,
        Math.min(maxWidth, currentWidth + step)
      );
      const leftRatio = newWidth / containerWidth;

      this.container.style.gridTemplateColumns = `${newWidth}px 8px 1fr`;
      this.onChange(leftRatio);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    this.resizer?.addEventListener('keydown', this._handleKeyDown, {
      once: true
    });
  }
}
