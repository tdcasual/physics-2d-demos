/**
 * 节流、防抖和 RAF 节流工具
 */

export class ThrottleDebounce {
  static throttle<T extends (...args: any[]) => void>(
    fn: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;
    return (...args) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  static debounce<T extends (...args: any[]) => void>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }

  static rafThrottle<T extends (...args: any[]) => void>(
    fn: T
  ): (...args: Parameters<T>) => void {
    let rafId: number | null = null;
    return (...args) => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        fn(...args);
        rafId = null;
      });
    };
  }
}
