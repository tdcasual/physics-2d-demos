import type { LayoutMetrics } from './utils/performance-monitor';

export class DebugPanelManager {
  private panel: HTMLElement;

  constructor(parent: HTMLElement) {
    this.panel = document.createElement('div');
    this.panel.className = 'mobile-debug-panel';
    const debugHeader = document.createElement('div');
    debugHeader.className = 'debug-header';
    debugHeader.textContent = 'Debug';
    const debugContent = document.createElement('div');
    debugContent.className = 'debug-content';
    const fpsDiv = document.createElement('div');
    fpsDiv.append('FPS: ');
    const fpsSpan = document.createElement('span');
    fpsSpan.className = 'debug-fps';
    fpsSpan.textContent = '--';
    fpsDiv.appendChild(fpsSpan);
    const memDiv = document.createElement('div');
    memDiv.append('Memory: ');
    const memSpan = document.createElement('span');
    memSpan.className = 'debug-memory';
    memSpan.textContent = '--';
    memDiv.appendChild(memSpan);
    memDiv.append('MB');
    const themeDiv = document.createElement('div');
    themeDiv.append('Theme: ');
    const themeSpan = document.createElement('span');
    themeSpan.className = 'debug-theme';
    themeSpan.textContent = '--';
    themeDiv.appendChild(themeSpan);
    debugContent.append(fpsDiv, memDiv, themeDiv);
    this.panel.append(debugHeader, debugContent);
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
