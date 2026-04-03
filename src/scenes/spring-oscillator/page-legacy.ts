/**
 * 弹簧振子场景 - Tailwind 重构版 (V2)
 * 与原版 page.ts 像素级一致
 */

// 教学演示壳层样式 (包含四区域布局)
import '../../styles/teaching-shell.css';

import { createPageLifecycle } from '../../app/page-lifecycle';
import { createTeachingDemoShell, type ReadoutItem } from '../../app/teaching-demo-shell';
import { createFloatingControls } from '../../ui/control-layout';
import { createSpringOscillatorControlsV4 } from './controls-v4';
import { createSpringOscillatorScene } from './scene.entry';

function boot(): void {
  const mount = document.getElementById('app');
  if (!(mount instanceof HTMLElement)) {
    throw new Error('Missing #app container');
  }

  const shell = createTeachingDemoShell({
    mount,
    title: '弹簧振子',
    subtitle: '简谐运动与相位关系演示',
    defaultMode: 'normal',
    hideHeader: true,
    readoutLabel: '数据读数',
    layout: {
      defaultLeftRatio: 0.38,
      leftMinWidth: 380,
      leftMaxWidth: 960,
      hasGraph: true,
      graphHeight: 0.4,
      controlColumns: 1,
      readoutCollapsed: true,
    },
    onResize: () => {
      requestAnimationFrame(() => {
        scene.resize();
        scene.render();
      });
    }
  });

  const lifecycle = createPageLifecycle();
  lifecycle.onDispose(() => shell.dispose());

  // 图表区 Canvas
  const graphCanvas = document.createElement('canvas');
  if (shell.graphSlot) {
    shell.graphSlot.appendChild(graphCanvas);
  }

  // 创建场景
  const scene = createSpringOscillatorScene({
    graphCanvas,
    stageCanvas: shell.stageCanvas,
    onReadout: (items) => {
      shell.setReadout(items as ReadoutItem[]);
    }
  });
  lifecycle.onDispose(() => scene.dispose());

  // 控制面板 - 使用 V4 (Tailwind 版本)
  const controls = createSpringOscillatorControlsV4({
    mount: shell.controlSlot,
    scene,
    onStatus: (text) => {
      shell.setReadout([{ label: '状态', value: text }]);
    }
  });
  lifecycle.onDispose(() => controls.dispose());

  // 浮动控制按钮
  const floatingControls = createFloatingControls({
    isPlaying: () => scene.sim.oscillators.some(o => o.isPlaying),
    onTogglePlay: () => {
      const anyPlaying = scene.sim.oscillators.some(o => o.isPlaying);
      if (anyPlaying) {
        scene.pauseAll();
        shell.setReadout([{ label: '状态', value: '全部暂停' }]);
      } else {
        scene.startAll();
        shell.setReadout([{ label: '状态', value: '全部播放' }]);
      }
      controls.refresh();
    },
    onReset: () => {
      scene.reset();
      scene.render();
      controls.refresh();
      shell.setReadout([{ label: '状态', value: '全部重置' }]);
    },
    onSpeedChange: (speed) => {
      scene.setTimeScale(speed);
      shell.setReadout([{ label: '播放速度', value: `${speed.toFixed(2)}×` }]);
    },
    getSpeed: () => scene.getTimeScale()
  });
  shell.stageSlot.appendChild(floatingControls);
  
  shell.stageSlot.style.position = 'relative';

  // 动画循环
  let lastTime = performance.now();
  let animationId: number | null = null;

  function animate(): void {
    const now = performance.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    if (scene.sim.oscillators.some(o => o.isPlaying)) {
      scene.step(deltaTime);
    }
    scene.render();

    animationId = requestAnimationFrame(animate);
  }

  animationId = requestAnimationFrame(animate);
  lifecycle.onDispose(() => {
    if (animationId) cancelAnimationFrame(animationId);
    (floatingControls as any).dispose?.();
  });

  // 主题切换
  const onThemeToggle = () => {
    const nextTheme = shell.getTheme() === 'dark' ? 'light' : 'dark';
    shell.setTheme(nextTheme);
    scene.setTheme(nextTheme);
    shell.setReadout([{ label: '主题', value: nextTheme === 'dark' ? '夜间模式' : '白天模式' }]);
  };
  shell.themeButton.addEventListener('click', onThemeToggle);
  lifecycle.onDispose(() => shell.themeButton.removeEventListener('click', onThemeToggle));

  // 模式切换
  const onModeToggle = () => {
    const nextMode = shell.getMode() === 'normal' ? 'presentation' : 'normal';
    shell.setMode(nextMode);
    shell.setReadout([{ label: '模式', value: nextMode === 'presentation' ? '演示模式' : '标准模式' }]);
  };
  shell.modeButton.addEventListener('click', onModeToggle);
  lifecycle.onDispose(() => shell.modeButton.removeEventListener('click', onModeToggle));

  // 窗口调整
  const handleResize = (): void => {
    scene.resize();
    scene.render();
  };
  window.addEventListener('resize', handleResize);
  lifecycle.onDispose(() => window.removeEventListener('resize', handleResize));

  // 初始化
  scene.init();
  scene.setTheme(shell.getTheme());
  setTimeout(() => {
    handleResize();
    scene.render();
  }, 100);
}

boot();
