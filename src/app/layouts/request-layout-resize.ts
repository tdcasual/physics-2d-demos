/**
 * 共享的"下一帧触发布局重算"helper：rAF 后派发 window resize，
 * 让容器与各场景走统一的重排通道（不进局部坐标系，纯通知）。
 *
 * Capability dispose / layout switch must not inject a synthetic resize
 * into a half-switched tree. The switch coordinator raises a suppress
 * gate; scheduled rAFs also no-op while the gate is held.
 */

let suppressCount = 0;

export function suppressLayoutResize(): () => void {
  suppressCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    suppressCount = Math.max(0, suppressCount - 1);
  };
}

export function requestLayoutResize(): void {
  if (suppressCount > 0) return;
  requestAnimationFrame(() => {
    if (suppressCount > 0) return;
    window.dispatchEvent(new Event('resize'));
  });
}
