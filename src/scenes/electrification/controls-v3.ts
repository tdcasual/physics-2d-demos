/**
 * Electrification Controls - V3
 */

import {
  createCollapsibleCard,
  createButtonGrid
} from '../../ui/control-layout';

export interface ElectrificationControlsOptions {
  mount: HTMLElement;
  onSetScene?: (scene: string) => void;
  onRunStep?: () => void;
  onReset?: () => void;
  onStart?: () => void;
  onStatus?: (text: string) => void;
}

export function createElectrificationControlsV3(options: ElectrificationControlsOptions) {
  const { mount, onSetScene, onRunStep, onReset, onStart, onStatus } = options;

  mount.innerHTML = '';

  // 场景选择卡片
  const sceneCard = createCollapsibleCard('📋 选择场景', { defaultCollapsed: false });
  const sceneBtns = createButtonGrid([
    { label: '摩擦起电', value: 'friction', variant: 'primary', onClick: () => {
      onSetScene?.('friction');
      onStatus?.('切换到摩擦起电场景');
    }},
    { label: '接触起电', value: 'contact', variant: 'secondary', onClick: () => {
      onSetScene?.('contact');
      onStatus?.('切换到接触起电场景');
    }},
    { label: '感应起电', value: 'induction', onClick: () => {
      onSetScene?.('induction');
      onStatus?.('切换到感应起电场景');
    }}
  ], { columns: 1 });
  sceneCard.body.appendChild(sceneBtns.element);

  // 操作卡片
  const actionCard = createCollapsibleCard('🔬 操作', { defaultCollapsed: false });
  const actionGrid = createButtonGrid([
    { label: '执行步骤', value: 'step', variant: 'primary', onClick: () => {
      onRunStep?.();
      onStatus?.('执行下一步');
    }},
    { label: '重置', value: 'reset', onClick: () => {
      onReset?.();
      onStatus?.('已重置');
    }}
  ], { columns: 2 });
  actionCard.body.appendChild(actionGrid.element);

  // 说明卡片
  const infoCard = createCollapsibleCard('📖 原理说明', { defaultCollapsed: true });
  infoCard.body.innerHTML = `
    <div style="font-size: 12px; line-height: 1.6; color: var(--text-secondary);">
      <p><strong>摩擦起电：</strong>两种不同的材料相互摩擦时，电子会从一种材料转移到另一种材料。</p>
      <p style="margin-top: 8px;"><strong>接触起电：</strong>带电体与不带电体接触时，电荷会发生转移。</p>
      <p style="margin-top: 8px;"><strong>感应起电：</strong>带电体靠近导体时，导体中的电荷会重新分布。</p>
    </div>
  `;

  mount.appendChild(sceneCard.element);
  mount.appendChild(actionCard.element);
  mount.appendChild(infoCard.element);

  return { dispose: () => { mount.innerHTML = ''; } };
}
