import '../../ui/teaching-demo.css';
import '../../ui/teaching-demo-v2.css';
import { createPageLifecycle } from '../../app/page-lifecycle';
import { createTeachingDemoShell, type ReadoutItem } from '../../app/teaching-demo-shell';
import { createFloatingControls } from '../../ui/control-layout';
import { createSpringOscillatorControlsV3 } from './controls-v3';
import { createSpringOscillatorScene } from './scene.entry';

/**
 * 弹簧振子场景 - 控制区标准范式参考实现
 * 
 * 布局配置：
 * - 左侧：38%（380-520px），1:2 分割
 * - 左侧结构：控制列表 + 预设场景 + 图表区（图表自适应剩余空间）
 * - 控制区标题隐藏，节省空间
 */
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
    hideHeader: true,  // 标准范式：隐藏左侧标题区
    readoutLabel: '数据读数',
    // 标准布局配置
    layout: {
      defaultLeftRatio: 0.38,  // 左侧38%（约1:2.6比例）
      leftMinWidth: 380,       // 最小380px
      leftMaxWidth: 960,       // 最大960px，支持到50%宽度
      hasGraph: true,          // 有图表区
      graphHeight: 0.4,        // 图表占40%，控制区自适应
      controlColumns: 1,
      readoutCollapsed: true,
    },
    // 尺寸变化回调 - 拖动分隔条时触发
    onResize: () => {
      // 使用 setTimeout 确保 DOM 更新后再 resize canvas
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

  // 控制面板（标准范式）
  const controls = createSpringOscillatorControlsV3({
    mount: shell.controlSlot,
    scene,
    onStatus: (text) => {
      shell.setReadout([{ label: '状态', value: text }]);
    }
  });
  lifecycle.onDispose(() => controls.dispose());

  // 浮动控制按钮（标准范式：位于动画区左上方）
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
  
  // 设置 stageSlot 为相对定位，以便浮动控制按钮正确定位
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
    // 清理浮动控制按钮的事件监听器
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
