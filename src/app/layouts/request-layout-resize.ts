/**
 * 共享的"下一帧触发布局重算"helper：rAF 后派发 window resize，
 * 让容器与各场景走统一的重排通道（不进局部坐标系，纯通知）。
 */
export function requestLayoutResize(): void {
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'));
  });
}
