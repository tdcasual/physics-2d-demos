/**
 * Electrification Controls - V4 (弹簧振子风格)
 */

import { createControlCard } from '../../ui/components/ControlCard';

export interface ElectrificationControlsOptions {
  mount: HTMLElement;
  initialScene?: string;
  onSetScene?: (scene: string) => void;
  onRunStep?: () => void;
  onReset?: () => void;
  onStart?: () => void;
  onStatus?: (text: string) => void;
}

export interface ElectrificationControls {
  setActiveScene: (scene: string) => void;
  dispose: () => void;
}

export function createElectrificationControlsV4(options: ElectrificationControlsOptions): ElectrificationControls {
  const { mount, initialScene = 'friction', onSetScene, onRunStep, onReset, onStatus } = options;

  mount.innerHTML = '';
  
  let activeScene = initialScene;
  const sceneButtons = new Map<string, HTMLButtonElement>();

  // 场景选择卡片
  const sceneCard = createControlCard('选择场景', { defaultCollapsed: false });
  const sceneBtns = document.createElement('div');
  sceneBtns.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
  
  const scenes = [
    { label: '摩擦起电', value: 'friction', desc: '两种不同材料摩擦时电子转移' },
    { label: '接触起电', value: 'contact', desc: '带电体与不带电体接触时电荷转移' },
    { label: '感应起电', value: 'induction', desc: '带电体靠近导体时电荷重新分布' }
  ];
  
  function updateSceneButtons() {
    scenes.forEach(s => {
      const btn = sceneButtons.get(s.value);
      if (!btn) return;
      const isActive = activeScene === s.value;
      
      // 弹簧振子风格：白色背景，选中时珊瑚红边框+文字
      btn.style.cssText = `
        width: 100%;
        padding: 12px 14px;
        background: ${isActive ? '#fff0f0' : '#ffffff'};
        border: 1px solid ${isActive ? '#FF6B6B' : '#e5e7eb'};
        border-radius: 8px;
        color: ${isActive ? '#FF6B6B' : '#374151'};
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        box-shadow: ${isActive ? '0 1px 3px rgba(255,107,107,0.2)' : '0 1px 2px rgba(0,0,0,0.05)'};
      `;
      
      btn.innerHTML = `
        <span style="font-weight: 600; font-size: 14px;">${s.label}</span>
        <span style="display: block; font-size: 11px; margin-top: 3px; color: ${isActive ? '#FF6B6B' : '#9ca3af'};">${s.desc}</span>
      `;
    });
  }
  
  scenes.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.addEventListener('click', () => {
      if (activeScene === s.value) return;
      activeScene = s.value;
      updateSceneButtons();
      onSetScene?.(s.value);
      onStatus?.(`切换到${s.label}场景`);
    });
    sceneButtons.set(s.value, btn);
    sceneBtns.appendChild(btn);
  });
  
  updateSceneButtons();
  sceneCard.body.appendChild(sceneBtns);

  // 操作卡片
  const actionCard = createControlCard('操作', { defaultCollapsed: false });
  const actionGrid = document.createElement('div');
  actionGrid.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;';
  
  const stepBtn = document.createElement('button');
  stepBtn.type = 'button';
  stepBtn.textContent = '执行步骤';
  stepBtn.style.cssText = `
    padding: 10px 16px;
    background: #FF6B6B;
    border: none;
    border-radius: 6px;
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 1px 3px rgba(255,107,107,0.3);
  `;
  stepBtn.addEventListener('mouseenter', () => {
    stepBtn.style.filter = 'brightness(1.1)';
  });
  stepBtn.addEventListener('mouseleave', () => {
    stepBtn.style.filter = 'none';
  });
  stepBtn.addEventListener('click', () => {
    onRunStep?.();
    onStatus?.('执行下一步');
  });
  
  const resetBtnEl = document.createElement('button');
  resetBtnEl.type = 'button';
  resetBtnEl.textContent = '重置';
  resetBtnEl.style.cssText = `
    padding: 10px 16px;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    color: #374151;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  `;
  resetBtnEl.addEventListener('mouseenter', () => {
    resetBtnEl.style.background = '#e5e7eb';
  });
  resetBtnEl.addEventListener('mouseleave', () => {
    resetBtnEl.style.background = '#f3f4f6';
  });
  resetBtnEl.addEventListener('click', () => {
    activeScene = 'friction';
    updateSceneButtons();
    onReset?.();
    onStatus?.('已重置');
  });
  
  actionGrid.append(stepBtn, resetBtnEl);
  actionCard.body.appendChild(actionGrid);

  // 说明卡片
  const infoCard = createControlCard('原理说明', { defaultCollapsed: true });
  const infoContent = document.createElement('div');
  infoContent.style.cssText = 'font-size: 12px; line-height: 1.7; color: #6b7280;';
  infoContent.innerHTML = `
    <p style="margin-bottom: 10px;"><strong style="color: #374151;">摩擦起电：</strong>两种不同的材料相互摩擦时，电子会从一种材料转移到另一种材料。</p>
    <p style="margin-bottom: 10px;"><strong style="color: #374151;">接触起电：</strong>带电体与不带电体接触时，电荷会发生转移。</p>
    <p><strong style="color: #374151;">感应起电：</strong>带电体靠近导体时，导体中的电荷会重新分布。</p>
  `;
  infoCard.body.appendChild(infoContent);

  mount.appendChild(sceneCard.element);
  mount.appendChild(actionCard.element);
  mount.appendChild(infoCard.element);

  return { 
    setActiveScene: (scene: string) => {
      if (scenes.some(s => s.value === scene)) {
        activeScene = scene;
        updateSceneButtons();
      }
    },
    dispose: () => { mount.innerHTML = ''; } 
  };
}
