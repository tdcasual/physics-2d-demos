/**
 * Debug Overlay Capability — FPS / 调试信息覆盖层
 *
 * 从 DesktopSplitLayout.initDebugOverlay 提取为独立能力
 */

import type {
  CapabilityDefinition,
  CapabilityInstance,
  CapabilityContext,
  LayoutSlots
} from '../types';

export interface DebugOverlayConfig {
  intervalMs?: number;
}

export function createDebugOverlay(
  cfg: DebugOverlayConfig = {}
): CapabilityDefinition<DebugOverlayConfig> {
  return {
    id: 'debug-overlay',

    mount(
      _slots: LayoutSlots,
      config: DebugOverlayConfig,
      ctx: CapabilityContext
    ): CapabilityInstance {
      const intervalMs = config.intervalMs ?? cfg.intervalMs ?? 1000;

      const el = document.createElement('div');
      el.style.cssText = `
        position: absolute; left: 8px; bottom: 8px; z-index: 9999;
        background: rgba(0,0,0,0.7); color: #0f0; font-family: monospace;
        font-size: 12px; padding: 6px 10px; border-radius: 4px;
        pointer-events: none; line-height: 1.5;
      `;
      el.textContent = 'FPS: --';
      ctx.container.appendChild(el);

      const interval = window.setInterval(() => {
        const pm = (
          window as Window & { __perfMonitor?: { getRecommendedFps?(): number } }
        ).__perfMonitor;
        el.textContent = `FPS: ${pm?.getRecommendedFps?.() ?? '--'}`;
      }, intervalMs);

      return {
        dispose() {
          window.clearInterval(interval);
          el.remove();
        }
      };
    }
  };
}
