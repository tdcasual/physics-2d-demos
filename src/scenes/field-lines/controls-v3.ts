/**
 * Field Lines Controls - V3
 */

import {
  createCollapsibleCard,
  createButtonGrid,
  createParamSlider
} from '../../ui/control-layout';

export interface FieldLinesControlsOptions {
  mount: HTMLElement;
  onSetScene?: (scene: string) => void;
  onSetDensity?: (density: number) => void;
  onSetCustomCharges?: (q1: number, q2: number) => void;
  onAddCharge?: (charge: number) => void;
  onRemoveCharge?: (index: number) => void;
  onPreset?: (preset: string) => void;
  onReset?: () => void;
  onStatus?: (text: string) => void;
}

export function createFieldLinesControlsV3(options: FieldLinesControlsOptions) {
  const { mount, onSetScene, onSetDensity, onSetCustomCharges, onAddCharge, onRemoveCharge, onPreset, onReset, onStatus } = options;

  mount.innerHTML = '';

  // 场景选择卡片
  const sceneCard = createCollapsibleCard('📋 场景选择', { defaultCollapsed: false });
  const sceneBtns = createButtonGrid([
    { label: '点电荷', value: 'point', onClick: () => { onSetScene?.('point'); onStatus?.('单点电荷电场'); } },
    { label: '双极子', value: 'dipole', onClick: () => { onSetScene?.('dipole'); onStatus?.('电偶极子电场'); } },
    { label: '四极子', value: 'quadrupole', onClick: () => { onSetScene?.('quadrupole'); onStatus?.('电四极子电场'); } },
    { label: '平行板', value: 'plates', onClick: () => { onSetScene?.('plates'); onStatus?.('平行板电场'); } }
  ], { columns: 2 });
  sceneCard.body.appendChild(sceneBtns.element);

  // 电荷控制卡片
  const chargeCard = createCollapsibleCard('⚡ 电荷控制', { defaultCollapsed: false });
  const chargeBtns = createButtonGrid([
    { label: '+ 正电荷', value: 'add-pos', variant: 'primary', onClick: () => {
      onAddCharge?.(1);
      onStatus?.('添加正电荷');
    }},
    { label: '- 负电荷', value: 'add-neg', variant: 'secondary', onClick: () => {
      onAddCharge?.(-1);
      onStatus?.('添加负电荷');
    }}
  ], { columns: 2 });
  chargeCard.body.appendChild(chargeBtns.element);

  // 密度控制卡片
  const densityCard = createCollapsibleCard('🔍 线密度', { defaultCollapsed: true });
  const densitySlider = createParamSlider('电场线密度', {
    min: 0.5,
    max: 2,
    step: 0.1,
    value: 1,
    onChange: (val) => onSetDensity?.(val)
  });
  densityCard.body.appendChild(densitySlider.element);

  // 自定义电荷卡片
  const customCard = createCollapsibleCard('⚙️ 自定义电荷', { defaultCollapsed: true });
  customCard.body.innerHTML = `
    <div style="display: grid; gap: 10px;">
      <div class="ctrl-param">
        <label class="ctrl-param-label">Q₁</label>
        <input type="number" class="ctrl-input" value="1" step="0.5" data-role="q1">
      </div>
      <div class="ctrl-param">
        <label class="ctrl-param-label">Q₂</label>
        <input type="number" class="ctrl-input" value="-1" step="0.5" data-role="q2">
      </div>
      <button type="button" class="ctrl-btn" data-role="apply-charges">应用电荷</button>
    </div>
  `;
  customCard.body.querySelector('[data-role="apply-charges"]')?.addEventListener('click', () => {
    const q1 = parseFloat((customCard.body.querySelector('[data-role="q1"]') as HTMLInputElement)?.value || '1');
    const q2 = parseFloat((customCard.body.querySelector('[data-role="q2"]') as HTMLInputElement)?.value || '-1');
    onSetCustomCharges?.(q1, q2);
    onStatus?.(`设置电荷 Q₁=${q1}, Q₂=${q2}`);
  });

  // 重置卡片
  const resetCard = createCollapsibleCard('🔄 重置', { defaultCollapsed: true });
  const resetBtn = document.createElement('button');
  resetBtn.className = 'ctrl-btn';
  resetBtn.textContent = '重置场景';
  resetBtn.addEventListener('click', () => {
    onReset?.();
    onStatus?.('场景已重置');
  });
  resetCard.body.appendChild(resetBtn);

  mount.appendChild(sceneCard.element);
  mount.appendChild(chargeCard.element);
  mount.appendChild(densityCard.element);
  mount.appendChild(customCard.element);
  mount.appendChild(resetCard.element);

  return { dispose: () => { mount.innerHTML = ''; } };
}
