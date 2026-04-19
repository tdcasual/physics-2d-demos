/**
 * 移动端手势识别器
 *
 * 支持：滑动、边缘滑动、双击、长按
 * 默认排除 Canvas 区域以避免与场景内部拖拽冲突
 */

export interface GestureCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onEdgeSwipeLeft?: () => void;
  onEdgeSwipeRight?: () => void;
}

export interface GestureConfig {
  edgeThreshold?: number;
  swipeThreshold?: number;
  longPressDelay?: number;
  excludeCanvas?: boolean;
}

export class GestureRecognizer {
  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private lastTapTime = 0;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private isLongPress = false;

  constructor(
    private element: HTMLElement,
    private callbacks: GestureCallbacks,
    private config: GestureConfig = {}
  ) {
    this.config = {
      edgeThreshold: 30,
      swipeThreshold: 50,
      longPressDelay: 500,
      excludeCanvas: true,
      ...config
    };
    this.attach();
  }

  private attach() {
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    this.element.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    this.element.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    this.element.addEventListener('touchcancel', this.handleTouchCancel, { passive: true });
  }

  destroy() {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
  }

  private handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    const target = e.target as HTMLElement;

    // 排除 Canvas 区域（避免与场景内部拖拽冲突）
    if (this.config.excludeCanvas && (target instanceof HTMLCanvasElement || target.closest('canvas'))) {
      return;
    }

    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = Date.now();
    this.isLongPress = false;

    // 检测双击
    const now = Date.now();
    if (now - this.lastTapTime < 300) {
      this.callbacks.onDoubleTap?.();
      this.lastTapTime = 0;
      return;
    }
    this.lastTapTime = now;

    // 长按检测
    this.longPressTimer = setTimeout(() => {
      this.isLongPress = true;
      this.callbacks.onLongPress?.();
    }, this.config.longPressDelay);
  };

  private handleTouchMove = () => {
    // 移动时取消长按
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (this.isLongPress) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.startX;
    const deltaY = touch.clientY - this.startY;
    const deltaTime = Date.now() - this.startTime;

    // 快速滑动检测
    const velocity = Math.abs(deltaX) / deltaTime;
    const threshold = velocity > 0.5 ? 30 : this.config.swipeThreshold!;

    // 边缘滑动检测
    const isEdgeLeft = this.startX < this.config.edgeThreshold!;
    const isEdgeRight = this.startX > this.element.clientWidth - this.config.edgeThreshold!;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        if (isEdgeLeft) {
          this.callbacks.onEdgeSwipeRight?.();
        } else {
          this.callbacks.onSwipeRight?.();
        }
      } else {
        if (isEdgeRight) {
          this.callbacks.onEdgeSwipeLeft?.();
        } else {
          this.callbacks.onSwipeLeft?.();
        }
      }
    } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > threshold) {
      if (deltaY > 0) {
        this.callbacks.onSwipeDown?.();
      } else {
        this.callbacks.onSwipeUp?.();
      }
    }
  };

  private handleTouchCancel = () => {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  };
}
