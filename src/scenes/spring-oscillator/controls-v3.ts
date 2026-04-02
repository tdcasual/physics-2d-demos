/**
 * Spring Oscillator Controls - V3 (标准范式实现)
 * 
 * 标准控制区结构：
 * 1. 控制列表卡片（可动态管理）
 *    - 标题行：🔘 振子列表 [+ 添加] [▼]
 *    - 列表项：色块 | k滑块 | m滑块 | x₀滑块 | 方向选择 | 删除
 * 
 * 2. 预设场景卡片（固定按钮组）
 *    - 标题行：📊 相位演示 [▼]
 *    - 按钮：同相演示 | 反相演示
 */

import {
  createControlCard
} from '../../ui/control-layout';
import type { OscillatorParams, Orientation } from './scene.sim';
import type { SpringOscillatorScene } from './scene.entry';

export interface SpringOscillatorControlsOptions {
  mount: HTMLElement;
  scene: SpringOscillatorScene;
  onStatus?: (text: string) => void;
}

export interface SpringOscillatorControls {
  refresh: () => void;
  dispose: () => void;
}

export function createSpringOscillatorControlsV3(options: SpringOscillatorControlsOptions): SpringOscillatorControls {
  const { mount, scene, onStatus } = options;

  mount.innerHTML = '';

  // ===== 1. 控制列表卡片 =====
  // 添加按钮（放在标题栏）
  const addBtn = document.createElement('button');
  addBtn.className = 'ctrl-btn primary';
  addBtn.textContent = '+ 添加';
  addBtn.style.cssText = 'padding: 2px 8px; font-size: 11px; margin-left: auto; margin-right: 8px;';
  
  const listCard = createControlCard('🔘 振子列表', {
    defaultCollapsed: false,
    headerActions: [addBtn]
  });
  
  const listContainer = document.createElement('div');
  listContainer.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
  listCard.body.appendChild(listContainer);

  // 添加按钮点击事件
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const newOsc = scene.addOscillator({
      k: 10 + Math.floor(Math.random() * 20),
      m: 1,
      x0: 5 + Math.floor(Math.random() * 5),
      orientation: 'horizontal'
    });
    renderOscillatorList();
    scene.render();
    onStatus?.(`添加振子 #${newOsc.id.slice(-4)}`);
  });

  // ===== 2. 预设场景卡片 =====
  const presetCard = createControlCard('📊 相位演示', { defaultCollapsed: false });
  
  // 创建按钮容器，使用更美观的布局
  const presetContainer = document.createElement('div');
  presetContainer.style.cssText = `
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  `;
  
  // 计算周期：T = 2π√(m/k)，对于 k=10, m=1，T ≈ 1.987 秒
  const period = 2 * Math.PI * Math.sqrt(1 / 10);
  
  const presetButtons = [
    { 
      label: '同相 (0°)', 
      desc: '同时启动',
      onClick: () => {
        while (scene.sim.oscillators.length > 0) {
          scene.removeOscillator(scene.sim.oscillators[0].id);
        }
        // 两个振子同时启动（延迟都是0）
        scene.addOscillator({ k: 10, m: 1, x0: 8, orientation: 'horizontal' }, 0);
        scene.addOscillator({ k: 10, m: 1, x0: 8, orientation: 'horizontal' }, 0);
        renderOscillatorList();
        scene.reset();
        scene.render();
        onStatus?.('同相演示：两振子同时启动');
      }
    },
    { 
      label: '反相 (180°)', 
      desc: '延迟 T/2',
      onClick: () => {
        while (scene.sim.oscillators.length > 0) {
          scene.removeOscillator(scene.sim.oscillators[0].id);
        }
        // 振子1先启动，振子2延迟半个周期（T/2）后启动
        scene.addOscillator({ k: 10, m: 1, x0: 8, orientation: 'horizontal' }, 0);
        scene.addOscillator({ k: 10, m: 1, x0: 8, orientation: 'horizontal' }, period / 2);
        renderOscillatorList();
        scene.reset();
        scene.render();
        onStatus?.('反相演示：第2个振子延迟半个周期启动');
      }
    },
    { 
      label: '1/2 相位 (90°)', 
      desc: '延迟 T/4',
      onClick: () => {
        while (scene.sim.oscillators.length > 0) {
          scene.removeOscillator(scene.sim.oscillators[0].id);
        }
        // 振子1先启动，振子2延迟1/4周期（T/4）后启动
        scene.addOscillator({ k: 10, m: 1, x0: 8, orientation: 'horizontal' }, 0);
        scene.addOscillator({ k: 10, m: 1, x0: 8, orientation: 'horizontal' }, period / 4);
        renderOscillatorList();
        scene.reset();
        scene.render();
        onStatus?.('1/2相位演示：第2个振子延迟1/4周期启动');
      }
    },
    { 
      label: '1/4 相位 (45°)', 
      desc: '延迟 T/8',
      onClick: () => {
        while (scene.sim.oscillators.length > 0) {
          scene.removeOscillator(scene.sim.oscillators[0].id);
        }
        // 振子1先启动，振子2延迟1/8周期（T/8）后启动
        scene.addOscillator({ k: 10, m: 1, x0: 8, orientation: 'horizontal' }, 0);
        scene.addOscillator({ k: 10, m: 1, x0: 8, orientation: 'horizontal' }, period / 8);
        renderOscillatorList();
        scene.reset();
        scene.render();
        onStatus?.('1/4相位演示：第2个振子延迟1/8周期启动');
      }
    }
  ];
  
  presetButtons.forEach(btn => {
    const button = document.createElement('button');
    button.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px 8px;
      background: var(--btn-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
      gap: 4px;
    `;
    button.innerHTML = `
      <span style="font-size: 12px; font-weight: 600; color: var(--text-primary);">${btn.label}</span>
      <span style="font-size: 10px; color: var(--text-secondary);">${btn.desc}</span>
    `;
    button.addEventListener('click', btn.onClick);
    button.addEventListener('mouseenter', () => {
      button.style.background = 'var(--btn-hover-bg)';
      button.style.borderColor = 'var(--accent-color)';
      button.style.transform = 'translateY(-1px)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = 'var(--btn-bg)';
      button.style.borderColor = 'var(--border-color)';
      button.style.transform = 'none';
    });
    presetContainer.appendChild(button);
  });
  
  presetCard.body.appendChild(presetContainer);

  // 组装控制面板
  mount.appendChild(listCard.element);
  mount.appendChild(presetCard.element);

  // ===== 渲染单个振子控制行（单行紧凑布局）=====
  function renderOscillatorItem(osc: typeof scene.sim.oscillators[0], index: number): HTMLElement {
    const item = document.createElement('div');
    item.style.cssText = `
      display: grid;
      grid-template-columns: 14px 1fr 1fr 1fr 50px 20px;
      gap: 8px;
      align-items: center;
      padding: 5px 8px;
      background: var(--card-bg, rgba(255,255,255,0.05));
      border-radius: 6px;
      border-left: 4px solid ${osc.color};
    `;

    const isHorizontal = osc.params.orientation === 'horizontal';

    item.innerHTML = `
      <!-- 纯颜色标识 -->
      <div style="width: 10px; height: 10px; border-radius: 50%; background: ${osc.color};"></div>
      <!-- k 控制 -->
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">k</span>
        <input type="range" min="1" max="100" step="1" value="${osc.params.k}" 
               data-param="k" data-id="${osc.id}" style="flex: 1; height: 4px; min-width: 40px;">
        <span style="font-size: 12px; min-width: 20px; text-align: right; font-weight: 600;">${osc.params.k}</span>
      </div>
      <!-- m 控制 -->
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">m</span>
        <input type="range" min="0.1" max="10" step="0.1" value="${osc.params.m}" 
               data-param="m" data-id="${osc.id}" style="flex: 1; height: 4px; min-width: 40px;">
        <span style="font-size: 12px; min-width: 24px; text-align: right; font-weight: 600;">${osc.params.m}</span>
      </div>
      <!-- x0 控制 -->
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">x₀</span>
        <input type="range" min="-20" max="20" step="0.5" value="${osc.params.x0}" 
               data-param="x0" data-id="${osc.id}" style="flex: 1; height: 4px; min-width: 40px;">
        <span style="font-size: 12px; min-width: 26px; text-align: right; font-weight: 600;">${osc.params.x0}</span>
      </div>
      <!-- 方向选择 -->
      <select data-orientation="${osc.id}" style="font-size: 12px; padding: 3px 4px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--input-bg); color: var(--text-primary);">
        <option value="horizontal" ${isHorizontal ? 'selected' : ''}>横</option>
        <option value="vertical" ${!isHorizontal ? 'selected' : ''}>竖</option>
      </select>
      <!-- 删除 -->
      <button type="button" data-action="remove" title="删除" 
              style="width: 20px; height: 20px; font-size: 12px; border: none; background: transparent; color: #ff6b6b; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center;">✕</button>
    `;

    // 删除按钮
    item.querySelector('[data-action="remove"]')?.addEventListener('click', () => {
      scene.removeOscillator(osc.id);
      renderOscillatorList();
      scene.render();
      onStatus?.(`删除振子 ${index + 1}`);
    });

    // 参数滑块
    item.querySelectorAll('input[type="range"]').forEach(input => {
      const slider = input as HTMLInputElement;
      const valueSpan = slider.nextElementSibling as HTMLElement;
      const param = slider.dataset.param as keyof OscillatorParams;
      
      slider.addEventListener('input', () => {
        valueSpan.textContent = slider.value;
      });
      
      slider.addEventListener('change', () => {
        const value = parseFloat(slider.value);
        const id = slider.dataset.id!;
        scene.updateOscillator(id, { [param]: value });
        scene.resetOscillator(id);
        scene.render();
        onStatus?.(`${param}=${value}`);
      });
    });

    // 方向选择
    item.querySelector('select')?.addEventListener('change', (e) => {
      const orientation = (e.target as HTMLSelectElement).value as Orientation;
      scene.updateOscillator(osc.id, { orientation });
      scene.resetOscillator(osc.id);
      scene.render();
      onStatus?.(`${index + 1}号${orientation === 'horizontal' ? '横向' : '竖向'}`);
    });

    return item;
  }

  // 渲染振子列表
  function renderOscillatorList(): void {
    listContainer.innerHTML = '';
    
    if (scene.sim.oscillators.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 12px; color: var(--text-secondary); font-size: 11px;">
          暂无振子，点击上方"+ 添加"按钮
        </div>
      `;
      return;
    }
    
    scene.sim.oscillators.forEach((osc, index) => {
      listContainer.appendChild(renderOscillatorItem(osc, index));
    });
  }

  // 初始渲染
  setTimeout(() => {
    renderOscillatorList();
  }, 0);

  return {
    refresh: renderOscillatorList,
    dispose: () => {
      mount.innerHTML = '';
    }
  };
}
