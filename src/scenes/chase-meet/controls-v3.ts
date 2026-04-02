/**
 * Chase Meet Controls - V3
 */

import {
  createCollapsibleCard,
  createButtonGrid
} from '../../ui/control-layout';
import type { ChaseMeetParams, ResolvedChaseMeetParams } from './scene.sim';

export interface ChaseMeetControlsOptions {
  mount: HTMLElement;
  initialParams: ResolvedChaseMeetParams;
  onApplyParams: (next: Partial<ChaseMeetParams>) => void;
  onStatus?: (text: string) => void;
}

export function createChaseMeetControlsV3(options: ChaseMeetControlsOptions) {
  const { mount, initialParams, onApplyParams, onStatus } = options;

  mount.innerHTML = '';

  const state: ChaseMeetParams = { ...initialParams };

  // 参数卡片
  const paramsCard = createCollapsibleCard('⚙️ 参数设置', { defaultCollapsed: false });
  paramsCard.body.innerHTML = `
    <div style="display: grid; gap: 10px;">
      <div class="ctrl-param">
        <label class="ctrl-param-label">总时间 T</label>
        <input type="number" class="ctrl-input" min="1" max="120" step="0.5" 
               value="${state.totalTime}" data-role="total-time">
        <span class="ctrl-input-suffix">s</span>
      </div>
      <div class="ctrl-param">
        <label class="ctrl-param-label">步长 Δt</label>
        <input type="number" class="ctrl-input" min="0.005" max="1" step="0.005" 
               value="${state.dt}" data-role="dt">
        <span class="ctrl-input-suffix">s</span>
      </div>
      <div class="ctrl-divider"></div>
      <div class="ctrl-param">
        <label class="ctrl-param-label">初始位置 A</label>
        <input type="number" class="ctrl-input" step="0.5" 
               value="${state.x0A}" data-role="x0a">
        <span class="ctrl-input-suffix">m</span>
      </div>
      <div class="ctrl-param">
        <label class="ctrl-param-label">初始位置 B</label>
        <input type="number" class="ctrl-input" step="0.5" 
               value="${state.x0B}" data-role="x0b">
        <span class="ctrl-input-suffix">m</span>
      </div>
      <div class="ctrl-divider"></div>
      <div style="display: grid; gap: 6px;">
        <label style="font-size: 11px; color: var(--text-secondary);">速度函数 vA(t)</label>
        <input type="text" class="ctrl-input" value="${state.vExprA}" data-role="vexpr-a" 
               style="text-align: left; font-family: monospace;">
      </div>
      <div style="display: grid; gap: 6px;">
        <label style="font-size: 11px; color: var(--text-secondary);">速度函数 vB(t)</label>
        <input type="text" class="ctrl-input" value="${state.vExprB}" data-role="vexpr-b" 
               style="text-align: left; font-family: monospace;">
      </div>
      <button type="button" class="ctrl-btn primary" data-role="apply" style="margin-top: 8px;">
        应用参数
      </button>
    </div>
  `;

  // 预设卡片
  const presetCard = createCollapsibleCard('📋 快速预设', { defaultCollapsed: true });
  const presets = createButtonGrid([
    { label: '匀速追赶', value: 'chase', onClick: () => {
      applyPreset({ vExprA: '2', vExprB: '1', x0A: '0', x0B: '10' });
    }},
    { label: '加速追赶', value: 'accel', onClick: () => {
      applyPreset({ vExprA: '0.5*t', vExprB: '2', x0A: '0', x0B: '15' });
    }},
    { label: '相向而行', value: 'meet', onClick: () => {
      applyPreset({ vExprA: '3', vExprB: '-2', x0A: '0', x0B: '20' });
    }}
  ], { columns: 1 });
  presetCard.body.appendChild(presets.element);

  mount.appendChild(paramsCard.element);
  mount.appendChild(presetCard.element);

  // 绑定事件
  function getInput(role: string): HTMLInputElement | null {
    return mount.querySelector(`[data-role="${role}"]`) as HTMLInputElement;
  }

  function applyPreset(preset: Record<string, string>) {
    Object.entries(preset).forEach(([key, value]) => {
      const input = getInput(key);
      if (input) input.value = value;
    });
    applySettings();
  }

  function applySettings() {
    const totalTime = parseFloat(getInput('total-time')?.value || '10');
    const dt = parseFloat(getInput('dt')?.value || '0.05');
    const x0A = parseFloat(getInput('x0a')?.value || '0');
    const x0B = parseFloat(getInput('x0b')?.value || '10');
    const vExprA = getInput('vexpr-a')?.value || '2';
    const vExprB = getInput('vexpr-b')?.value || '1';

    state.totalTime = Math.max(1, Math.min(120, totalTime));
    state.dt = Math.max(0.005, Math.min(1, dt));
    state.x0A = x0A;
    state.x0B = x0B;
    state.vExprA = vExprA;
    state.vExprB = vExprB;

    onApplyParams({ ...state });
    onStatus?.('参数已应用');
  }

  mount.querySelector('[data-role="apply"]')?.addEventListener('click', applySettings);

  return { dispose: () => { mount.innerHTML = ''; } };
}
