/**
 * 舞台读数遮挡契约。
 *
 * 布局在根元素打 `data-readout-overlay`：'true' = 读数以浮层遮挡舞台
 * （split-right / split-right-graph-bottom / lab-stage），'false' =
 * 读数不遮挡（mobile-stack 的 tab 面板在舞台下方）。场景侧据此决定
 * 画布留白；演示模式不改该属性。
 *
 * helper 只从锚点向上读属性，不 import 布局/registry（platform 分层约束；
 * closest 先例见 platform/input/keyboard-shortcuts.ts）。
 */
export const READOUT_OVERLAY_ATTR = 'data-readout-overlay';

/**
 * 从锚点元素向上读 `[data-readout-overlay]`，缺省 true
 * （与各场景历史副本的 fallback 一致）。
 */
export function readoutOccludesStage(anchorEl?: Element | null): boolean {
  if (typeof document === 'undefined') return true;
  const node = anchorEl ?? document.body;
  const host = node.closest(`[${READOUT_OVERLAY_ATTR}]`);
  if (!host) return true;
  return host.getAttribute(READOUT_OVERLAY_ATTR) !== 'false';
}
