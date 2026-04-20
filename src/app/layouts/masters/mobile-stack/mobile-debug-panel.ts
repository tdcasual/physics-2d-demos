import type { LayoutMetrics } from './utils/performance-monitor';

export class DebugPanelManager {
  private panel: HTMLElement;

  constructor(parent: HTMLElement) {
    this.panel = document.createElement('div');
    this.panel.className = 'mobile-debug-panel';
    this.panel.innerHTML = `
      <div class="debug-header">Debug</div>
      <div class="debug-content">
        <div>FPS: <span class="debug-fps">--</span></div>
        <div>Memory: <span class="debug-memory">--</span>MB</div>
        <div>Theme: <span class="debug-theme">--</span></div>
      </div>
    `;
    parent.appendChild(this.panel);
  }

  update(metrics: LayoutMetrics, theme: string): void {
    const fpsEl = this.panel.querySelector('.debug-fps');
    const memEl = this.panel.querySelector('.debug-memory');
    const themeEl = this.panel.querySelector('.debug-theme');

    if (fpsEl) fpsEl.textContent = String(metrics.fps);
    if (memEl) memEl.textContent = (metrics.memory / 1024 / 1024).toFixed(1);
    if (themeEl) themeEl.textContent = theme;
  }

  destroy(): void {
    this.panel.remove();
  }
}
