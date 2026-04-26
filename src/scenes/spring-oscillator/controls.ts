/**
 * Spring Oscillator Controls - V4 (Tailwind 重构版)
 * 与 V3 像素级一致
 */

import { createControlCard } from '../../ui/components/ControlCard';
import { renderOscillatorItem } from './oscillator-item';
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

export function createSpringOscillatorControls(
  options: SpringOscillatorControlsOptions
): SpringOscillatorControls {
  const { mount, scene, onStatus } = options;
  const cleanups: Array<() => void> = [];

  mount.innerHTML = '';

  // ===== 1. 控制列表卡片 =====
  const addBtn = document.createElement('button');
  addBtn.textContent = '+ 添加';
  // 响应式字体，高分屏适配
  addBtn.style.cssText = `
    padding: calc(6px * var(--ui-scale, 1)) calc(12px * var(--ui-scale, 1));
    font-size: calc(14px * var(--ui-scale, 1));
    font-weight: 600;
    background: var(--accent-primary);
    color: var(--text-inverse);
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    min-height: calc(32px * var(--ui-scale, 1));
  `;

  const listCard = createControlCard('振子列表', {
    defaultCollapsed: false,
    headerActions: [addBtn]
  });

  const listContainer = document.createElement('div');
  listContainer.className = 'flex flex-col gap-[2px]';
  listCard.body.appendChild(listContainer);

  // 添加按钮点击事件
  const onAddClick = (e: MouseEvent) => {
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
  };
  addBtn.addEventListener('click', onAddClick);
  cleanups.push(() => addBtn.removeEventListener('click', onAddClick));

  // ===== 2. 预设场景卡片 =====
  const presetCard = createControlCard('相位演示', { defaultCollapsed: false });

  // 精确复刻 V3 网格布局
  const presetContainer = document.createElement('div');
  presetContainer.className = 'grid grid-cols-2 gap-1';

  // 计算周期
  const period = 2 * Math.PI * Math.sqrt(1 / 10);

  const presetButtons = [
    {
      label: '同相 (0°)',
      desc: '同时启动',
      onClick: () => {
        while (scene.sim.oscillators.length > 0) {
          scene.removeOscillator(scene.sim.oscillators[0].id);
        }
        scene.addOscillator(
          { k: 10, m: 1, x0: 8, orientation: 'horizontal' },
          0
        );
        scene.addOscillator(
          { k: 10, m: 1, x0: 8, orientation: 'horizontal' },
          0
        );
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
        scene.addOscillator(
          { k: 10, m: 1, x0: 8, orientation: 'horizontal' },
          0
        );
        scene.addOscillator(
          { k: 10, m: 1, x0: 8, orientation: 'horizontal' },
          period / 2
        );
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
        scene.addOscillator(
          { k: 10, m: 1, x0: 8, orientation: 'horizontal' },
          0
        );
        scene.addOscillator(
          { k: 10, m: 1, x0: 8, orientation: 'horizontal' },
          period / 4
        );
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
        scene.addOscillator(
          { k: 10, m: 1, x0: 8, orientation: 'horizontal' },
          0
        );
        scene.addOscillator(
          { k: 10, m: 1, x0: 8, orientation: 'horizontal' },
          period / 8
        );
        renderOscillatorList();
        scene.reset();
        scene.render();
        onStatus?.('1/4相位演示：第2个振子延迟1/8周期启动');
      }
    }
  ];

  presetButtons.forEach((btn) => {
    const button = document.createElement('button');
    // 精确复刻 V3 按钮样式（使用相同的 CSS 变量）
    button.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: calc(4px * var(--ui-scale, 1)) calc(4px * var(--ui-scale, 1));
      background: var(--btn-bg);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
      gap: 1px;
      min-height: calc(36px * var(--ui-scale, 1));
      justify-content: center;
    `;
    button.innerHTML = `
      <span style="font-size: calc(15px * var(--ui-scale, 1)); font-weight: 700; color: var(--text-primary);">${btn.label}</span>
      <span style="font-size: calc(13px * var(--ui-scale, 1)); color: var(--text-secondary);">${btn.desc}</span>
    `;
    const onBtnEnter = () => {
      button.style.background = 'var(--btn-hover-bg)';
      button.style.borderColor = 'var(--accent-color)';
      button.style.transform = 'translateY(-1px)';
    };
    const onBtnLeave = () => {
      button.style.background = 'var(--btn-bg)';
      button.style.borderColor = 'var(--border-color)';
      button.style.transform = 'none';
    };
    button.addEventListener('click', btn.onClick);
    button.addEventListener('mouseenter', onBtnEnter);
    button.addEventListener('mouseleave', onBtnLeave);
    cleanups.push(() => {
      button.removeEventListener('click', btn.onClick);
      button.removeEventListener('mouseenter', onBtnEnter);
      button.removeEventListener('mouseleave', onBtnLeave);
    });
    presetContainer.appendChild(button);
  });

  presetCard.body.appendChild(presetContainer);

  // 组装控制面板
  mount.appendChild(listCard.element);
  mount.appendChild(presetCard.element);

  // ===== 渲染单个振子控制行（紧凑布局 + 点击切换方向）=====
  // 渲染振子列表
  function renderOscillatorList(): void {
    listContainer.innerHTML = '';

    if (scene.sim.oscillators.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.fontSize = 'calc(15px * var(--ui-scale, 1))';
      emptyDiv.style.textAlign = 'center';
      emptyDiv.style.padding = 'calc(8px * var(--ui-scale, 1)) 0';
      emptyDiv.style.color = 'var(--text-secondary)';
      emptyDiv.textContent = '暂无振子，点击上方"+ 添加"按钮';
      listContainer.appendChild(emptyDiv);
      return;
    }

    scene.sim.oscillators.forEach((osc, index) => {
      listContainer.appendChild(renderOscillatorItem(scene, osc, index, renderOscillatorList, onStatus));
    });
  }

  // 初始渲染
  setTimeout(() => {
    renderOscillatorList();
  }, 0);

  return {
    refresh: renderOscillatorList,
    dispose: () => {
      cleanups.forEach((c) => c());
      listCard.dispose();
      presetCard.dispose();
      mount.innerHTML = '';
    }
  };
}
