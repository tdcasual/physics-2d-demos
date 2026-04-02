/**
 * 弹簧振子场景 - 使用新的通用演示框架
 * 
 * 展示如何整合 DemoShell + FloatingControls + 自定义控制面板
 */

import '../../styles/demo-shell.css';
import '../../ui/teaching-demo-controls.css';
import { createDemoShell } from '../../app/demo-shell';
import { createFloatingControls } from '../../ui/floating-controls';
import { createControlCard } from '../../ui/control-layout';
import { createSpringOscillatorScene } from './scene.entry';
import type { OscillatorParams, Orientation } from './scene.sim';

function boot(): void {
  const mount = document.getElementById('app');
  if (!mount) throw new Error('Missing #app container');

  // 创建演示框架
  const shell = createDemoShell(mount, {
    title: '弹簧振子',
    subtitle: '简谐运动与相位关系演示',
    defaultMode: 'normal',
    defaultTheme: 'light',
    layout: {
      leftRatio: 0.38,
      leftMinWidth: 380,
      leftMaxWidth: 600,
      hasGraph: true,
      graphHeight: 0.4,
      controlColumns: 1,
      readoutCollapsed: true,
      hideHeader: true,
    },
    onResize: () => {
      scene.resize();
      scene.render();
    },
  });

  // 创建场景
  const scene = createSpringOscillatorScene({
    graphCanvas: shell.graphSlot?.querySelector('canvas') || undefined,
    stageCanvas: shell.stageCanvas,
    onReadout: (items) => {
      shell.setReadout(items.map(item => ({ label: item.label, value: item.value })));
    },
  });

  // 设置 graphSlot 的 canvas
  if (shell.graphSlot) {
    const graphCanvas = document.createElement('canvas');
    shell.graphSlot.appendChild(graphCanvas);
    // 需要更新场景的 graphCanvas 引用
    // 这里简化处理，实际应在 createSpringOscillatorScene 后动态设置
  }

  // 创建控制面板
  const controls = createSpringOscillatorControls({
    mount: shell.controlSlot,
    scene,
    onStatus: (text) => shell.setStatus(text),
  });

  // 创建浮动控制
  const floatingControls = createFloatingControls({
    isPlaying: () => scene.sim.oscillators.some(o => o.isPlaying),
    onTogglePlay: () => {
      const anyPlaying = scene.sim.oscillators.some(o => o.isPlaying);
      if (anyPlaying) {
        scene.pauseAll();
        shell.setStatus('全部暂停');
      } else {
        scene.startAll();
        shell.setStatus('全部播放');
      }
      controls.refresh();
    },
    onReset: () => {
      scene.reset();
      scene.render();
      controls.refresh();
      shell.setStatus('全部重置');
    },
    onSpeedChange: (speed) => {
      scene.setTimeScale(speed);
      shell.setReadout([{ label: '播放速度', value: `${speed.toFixed(2)}×` }]);
    },
    getSpeed: () => scene.getTimeScale(),
  });

  shell.stageSlot.appendChild(floatingControls.element);
  shell.stageSlot.style.position = 'relative';

  // 动画循环
  let lastTime = performance.now();
  let animationId: number;

  function animate(): void {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    if (scene.sim.oscillators.some(o => o.isPlaying)) {
      scene.step(dt);
    }
    scene.render();

    animationId = requestAnimationFrame(animate);
  }

  animationId = requestAnimationFrame(animate);

  // 初始化
  scene.init();
  scene.setTheme(shell.getTheme());
  scene.resize();
  scene.render();

  // 清理
  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(animationId);
    floatingControls.dispose();
    shell.dispose();
    scene.dispose();
  });
}

// 弹簧振子控制面板
interface ControlsOptions {
  mount: HTMLElement;
  scene: ReturnType<typeof createSpringOscillatorScene>;
  onStatus?: (text: string) => void;
}

function createSpringOscillatorControls(options: ControlsOptions) {
  const { mount, scene, onStatus } = options;
  mount.innerHTML = '';

  // 振子列表卡片
  const addBtn = document.createElement('button');
  addBtn.className = 'ctrl-btn primary';
  addBtn.textContent = '+ 添加';
  addBtn.style.cssText = 'padding: 4px 12px; font-size: 12px; border-radius: 12px; font-weight: 500;';

  const listCard = createControlCard('振子列表', {
    defaultCollapsed: false,
    headerActions: [addBtn],
  });

  const listContainer = document.createElement('div');
  listContainer.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
  listCard.body.appendChild(listContainer);

  // 添加按钮
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const newOsc = scene.addOscillator({
      k: 10 + Math.floor(Math.random() * 20),
      m: 1,
      x0: 8,
      orientation: 'horizontal',
    });
    renderList();
    scene.render();
    onStatus?.(`添加振子 #${newOsc.id.slice(-4)}`);
  });

  // 相位演示卡片
  const presetCard = createControlCard('相位演示', { defaultCollapsed: false });
  const presetContainer = document.createElement('div');
  presetContainer.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;';

  const period = 2 * Math.PI * Math.sqrt(1 / 10);
  const presets = [
    { label: '同相 (0°)', desc: '同时启动', delay2: 0 },
    { label: '反相 (180°)', desc: '延迟 T/2', delay2: period / 2 },
    { label: '1/2 相位 (90°)', desc: '延迟 T/4', delay2: period / 4 },
    { label: '1/4 相位 (45°)', desc: '延迟 T/8', delay2: period / 8 },
  ];

  presets.forEach(preset => {
    const btn = document.createElement('button');
    btn.style.cssText = `
      display: flex; flex-direction: column; align-items: center;
      padding: 10px 8px; background: var(--btn-bg);
      border: 1px solid var(--border-color); border-radius: 8px;
      cursor: pointer; transition: all 0.2s;
    `;
    btn.innerHTML = `
      <span style="font-size: 12px; font-weight: 600; color: var(--text-primary);">${preset.label}</span>
      <span style="font-size: 10px; color: var(--text-secondary);">${preset.desc}</span>
    `;
    btn.addEventListener('click', () => {
      while (scene.sim.oscillators.length > 0) {
        scene.removeOscillator(scene.sim.oscillators[0].id);
      }
      scene.addOscillator({ k: 10, m: 1, x0: 8, orientation: 'horizontal' }, 0);
      scene.addOscillator({ k: 10, m: 1, x0: 8, orientation: 'horizontal' }, preset.delay2);
      renderList();
      scene.reset();
      scene.render();
      onStatus?.(preset.label);
    });
    presetContainer.appendChild(btn);
  });

  presetCard.body.appendChild(presetContainer);
  mount.append(listCard.element, presetCard.element);

  // 渲染振子列表
  function renderList(): void {
    listContainer.innerHTML = '';

    if (scene.sim.oscillators.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 12px; color: var(--text-secondary); font-size: 11px;">
          暂无振子，点击"+ 添加"按钮
        </div>
      `;
      return;
    }

    scene.sim.oscillators.forEach((osc, index) => {
      const item = renderOscillatorItem(osc, index);
      listContainer.appendChild(item);
    });
  }

  function renderOscillatorItem(osc: typeof scene.sim.oscillators[0], index: number): HTMLElement {
    const item = document.createElement('div');
    item.style.cssText = `
      display: grid; grid-template-columns: 14px 1fr 1fr 1fr 50px 20px;
      gap: 8px; align-items: center; padding: 5px 8px;
      background: var(--card-bg, rgba(255,255,255,0.05));
      border-radius: 6px; border-left: 4px solid ${osc.color};
    `;

    const isHorizontal = osc.params.orientation === 'horizontal';

    item.innerHTML = `
      <div style="width: 10px; height: 10px; border-radius: 50%; background: ${osc.color};"></div>
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">k</span>
        <input type="range" min="1" max="100" step="1" value="${osc.params.k}" 
               data-param="k" data-id="${osc.id}" style="flex: 1; height: 4px;">
        <span style="font-size: 12px; min-width: 20px; text-align: right; font-weight: 600;">${osc.params.k}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">m</span>
        <input type="range" min="0.1" max="10" step="0.1" value="${osc.params.m}" 
               data-param="m" data-id="${osc.id}" style="flex: 1; height: 4px;">
        <span style="font-size: 12px; min-width: 24px; text-align: right; font-weight: 600;">${osc.params.m}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">x₀</span>
        <input type="range" min="-20" max="20" step="0.5" value="${osc.params.x0}" 
               data-param="x0" data-id="${osc.id}" style="flex: 1; height: 4px;">
        <span style="font-size: 12px; min-width: 26px; text-align: right; font-weight: 600;">${osc.params.x0}</span>
      </div>
      <select data-orientation="${osc.id}" style="font-size: 12px; padding: 3px 4px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--input-bg); color: var(--text-primary);">
        <option value="horizontal" ${isHorizontal ? 'selected' : ''}>横</option>
        <option value="vertical" ${!isHorizontal ? 'selected' : ''}>竖</option>
      </select>
      <button type="button" data-action="remove" title="删除" 
              style="width: 20px; height: 20px; font-size: 12px; border: none; background: transparent; color: #ff6b6b; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center;">✕</button>
    `;

    // 删除按钮
    item.querySelector('[data-action="remove"]')?.addEventListener('click', () => {
      scene.removeOscillator(osc.id);
      renderList();
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
        scene.updateOscillator(osc.id, { [param]: value });
        scene.resetOscillator(osc.id);
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

  // 初始渲染
  setTimeout(renderList, 0);

  return {
    refresh: renderList,
    dispose: () => {
      mount.innerHTML = '';
    },
  };
}

boot();
