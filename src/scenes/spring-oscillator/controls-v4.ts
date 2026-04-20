/**
 * Spring Oscillator Controls - V4 (Tailwind 重构版)
 * 与 V3 像素级一致
 */

import { createControlCard } from '../../ui/components/ControlCard';
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

export function createSpringOscillatorControlsV4(
  options: SpringOscillatorControlsOptions
): SpringOscillatorControls {
  const { mount, scene, onStatus } = options;

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

  // ===== 渲染单个振子控制行（紧凑布局 + 点击切换方向）=====
  function renderOscillatorItem(
    osc: (typeof scene.sim.oscillators)[0],
    index: number
  ): HTMLElement {
    const item = document.createElement('div');
    // 紧凑的布局：色块 | k滑块 m滑块 x0滑块 | 方向 | 删除
    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: calc(5px * var(--ui-scale, 1));
      padding: calc(4px * var(--ui-scale, 1)) calc(8px * var(--ui-scale, 1));
      background: var(--bg-card);
      border-radius: 5px;
      border: 1px solid var(--border-color);
      min-height: calc(36px * var(--ui-scale, 1));
    `;
    item.style.borderLeft = `3px solid ${osc.color}`;

    // 色块标识 - 响应式大小
    const colorDot = document.createElement('div');
    colorDot.className = 'rounded-full shrink-0';
    colorDot.style.width = 'calc(8px * var(--ui-scale, 1))';
    colorDot.style.height = 'calc(8px * var(--ui-scale, 1))';
    colorDot.style.background = osc.color;

    // 参数控制区（三个滑块紧凑排列）
    const paramsContainer = document.createElement('div');
    paramsContainer.className = 'flex-1 flex items-center gap-[2px] min-w-0';

    // k 滑块
    const kControl = createMiniSlider(
      'k',
      osc.params.k,
      1,
      100,
      1,
      '',
      (val) => {
        scene.updateOscillator(osc.id, { k: val });
        scene.resetOscillator(osc.id);
        scene.render();
      }
    );

    // m 滑块
    const mControl = createMiniSlider(
      'm',
      osc.params.m,
      0.1,
      10,
      0.1,
      '',
      (val) => {
        scene.updateOscillator(osc.id, { m: val });
        scene.resetOscillator(osc.id);
        scene.render();
      }
    );

    // x0 滑块
    const x0Control = createMiniSlider(
      'x₀',
      osc.params.x0,
      -20,
      20,
      0.5,
      '',
      (val) => {
        scene.updateOscillator(osc.id, { x0: val });
        scene.resetOscillator(osc.id);
        scene.render();
      }
    );

    paramsContainer.append(kControl, mControl, x0Control);

    // 方向切换按钮（点击切换）
    const isHorizontal = osc.params.orientation === 'horizontal';
    const orientBtn = document.createElement('button');
    orientBtn.type = 'button';
    orientBtn.className =
      'font-bold rounded shrink-0 cursor-pointer transition-all';
    orientBtn.style.cssText = `
      width: calc(28px * var(--ui-scale, 1));
      height: calc(24px * var(--ui-scale, 1));
      font-size: calc(14px * var(--ui-scale, 1));
      border: 1px solid var(--border-color);
      background: var(--btn-bg);
      color: var(--text-primary);
    `;
    orientBtn.addEventListener('mouseenter', () => {
      orientBtn.style.background = 'var(--btn-hover-bg)';
    });
    orientBtn.addEventListener('mouseleave', () => {
      orientBtn.style.background = 'var(--btn-bg)';
    });
    orientBtn.textContent = isHorizontal ? '横' : '竖';
    orientBtn.title = '点击切换方向';

    orientBtn.addEventListener('click', () => {
      const newOrientation = isHorizontal ? 'vertical' : 'horizontal';
      scene.updateOscillator(osc.id, { orientation: newOrientation });
      scene.resetOscillator(osc.id);
      scene.render();
      renderOscillatorList();
      onStatus?.(
        `${index + 1}号${newOrientation === 'horizontal' ? '横向' : '竖向'}`
      );
    });

    // 删除按钮
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.style.cssText = `
      width: calc(22px * var(--ui-scale, 1));
      height: calc(22px * var(--ui-scale, 1));
      font-size: calc(14px * var(--ui-scale, 1));
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FF6B6B;
      background: transparent;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    `;
    delBtn.addEventListener('mouseenter', () => {
      delBtn.style.background = 'rgba(255,107,107,0.1)';
    });
    delBtn.addEventListener('mouseleave', () => {
      delBtn.style.background = 'transparent';
    });
    delBtn.textContent = '✕';
    delBtn.title = '删除';
    delBtn.addEventListener('click', () => {
      scene.removeOscillator(osc.id);
      renderOscillatorList();
      scene.render();
      onStatus?.(`删除振子 ${index + 1}`);
    });

    item.append(colorDot, paramsContainer, orientBtn, delBtn);

    return item;
  }

  // 创建迷你滑块控制 - 响应式字体，高分屏适配
  function createMiniSlider(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    unit: string,
    onChange: (val: number) => void
  ): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex items-center flex-1 min-w-0';
    container.style.gap = '1px';

    // 标签 - 响应式字体（k, m等增大20%）
    const labelSpan = document.createElement('span');
    labelSpan.className = 'font-black shrink-0';
    labelSpan.style.fontSize = 'calc(17px * var(--ui-scale, 1))';
    labelSpan.style.color = 'var(--text-secondary)';
    labelSpan.style.minWidth = 'calc(18px * var(--ui-scale, 1))';
    labelSpan.style.textAlign = 'center';
    labelSpan.style.lineHeight = '1.1';
    labelSpan.textContent = label;

    // 滑块 - 响应式高度
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.style.height = 'calc(5px * var(--ui-scale, 1))';
    slider.style.accentColor = 'var(--accent-primary)';
    slider.style.flex = '1 1 0';
    slider.style.minWidth = 'calc(20px * var(--ui-scale, 1))';

    // 数值 - 响应式字体
    const valueSpan = document.createElement('span');
    valueSpan.className = 'font-bold shrink-0';
    valueSpan.style.fontSize = 'calc(14px * var(--ui-scale, 1))';
    valueSpan.style.color = 'var(--text-primary)';
    valueSpan.style.minWidth = 'calc(32px * var(--ui-scale, 1))';
    valueSpan.style.maxWidth = 'calc(40px * var(--ui-scale, 1))';
    valueSpan.style.textAlign = 'left';
    valueSpan.style.paddingLeft = '2px';
    valueSpan.style.lineHeight = '1.1';
    valueSpan.textContent = String(value);

    slider.addEventListener('input', () => {
      valueSpan.textContent = slider.value;
    });

    slider.addEventListener('change', () => {
      onChange(parseFloat(slider.value));
    });

    container.append(labelSpan, slider, valueSpan);
    return container;
  }

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
