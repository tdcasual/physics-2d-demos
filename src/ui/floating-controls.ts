/**
 * 浮动控制组件
 * 
 * 位于动画区左上方的控制条，包含：
 * - 播放/暂停按钮（合并）
 * - 重置按钮
 * - 速度控制滑块
 * 
 * 支持拖拽移动位置，自动响应设备类型变化
 */

export interface FloatingControlsOptions {
  /** 获取当前是否播放中 */
  isPlaying: () => boolean;
  /** 播放/暂停切换回调 */
  onTogglePlay: () => void;
  /** 重置回调 */
  onReset: () => void;
  /** 速度变化回调 */
  onSpeedChange: (speed: number) => void;
  /** 获取当前速度 */
  getSpeed: () => number;
}

export interface FloatingControls {
  element: HTMLElement;
  /** 更新播放按钮状态 */
  updatePlayState: () => void;
  /** 手动刷新布局（响应窗口大小变化） */
  refreshLayout: () => void;
  /** 销毁组件 */
  dispose: () => void;
}

// 检测移动设备
function isMobileDevice(): boolean {
  return window.innerWidth < 768;
}

// 获取设备类型
function getDeviceType(): 'mobile' | 'desktop' {
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}

/**
 * 创建浮动控制组件
 */
export function createFloatingControls(options: FloatingControlsOptions): FloatingControls {
  // 追踪当前设备类型
  let currentDeviceType = getDeviceType();
  
  // 创建容器
  const container = document.createElement('div');
  container.className = 'floating-controls';
  
  // UI 元素引用
  let playPauseBtn: HTMLButtonElement;
  let resetBtn: HTMLButtonElement;
  let divider: HTMLDivElement;
  let speedLabel: HTMLSpanElement;
  let speedSlider: HTMLInputElement;
  let speedValue: HTMLSpanElement;
  
  // 拖拽清理函数
  let cleanupDrag: (() => void) | null = null;
  
  // 定时器
  let intervalId: number | null = null;
  
  // 构建 UI
  function buildUI(): void {
    // 清空容器
    container.innerHTML = '';
    
    // 清理旧的拖拽监听
    if (cleanupDrag) {
      cleanupDrag();
      cleanupDrag = null;
    }
    
    const isMobile = currentDeviceType === 'mobile';
    
    // 设置容器样式
    if (isMobile) {
      container.style.cssText = `
        position: absolute;
        bottom: 12px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        align-items: center;
        z-index: 10;
        padding: 10px 14px;
        background: var(--card-bg, rgba(0, 0, 0, 0.5));
        border-radius: 12px;
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
        backdrop-filter: blur(12px);
        user-select: none;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
      `;
    } else {
      container.style.cssText = `
        position: absolute;
        top: 12px;
        left: 12px;
        display: flex;
        gap: 12px;
        align-items: center;
        z-index: 10;
        padding: 12px 16px;
        background: var(--card-bg, rgba(0, 0, 0, 0.3));
        border-radius: 10px;
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
        backdrop-filter: blur(8px);
        user-select: none;
        transition: all 0.3s ease;
      `;
    }

    // 播放/暂停按钮
    playPauseBtn = createButton({
      title: '播放/暂停',
      width: isMobile ? '40px' : '44px',
      height: isMobile ? '40px' : '44px',
      fontSize: isMobile ? '18px' : '20px',
      onClick: () => {
        options.onTogglePlay();
        updatePlayState();
      },
    });

    // 重置按钮
    resetBtn = createButton({
      title: '重置',
      content: '↺',
      width: isMobile ? '40px' : '44px',
      height: isMobile ? '40px' : '44px',
      fontSize: isMobile ? '18px' : '20px',
      color: 'var(--text-secondary, #aaa)',
      onClick: () => {
        options.onReset();
        updatePlayState();
      },
    });

    // 分隔线
    divider = document.createElement('div');
    divider.style.cssText = `
      width: 1px;
      height: ${isMobile ? '28px' : '32px'};
      background: var(--border-color, rgba(255, 255, 255, 0.15));
      margin: 0 4px;
    `;

    // 速度标签
    speedLabel = document.createElement('span');
    speedLabel.textContent = isMobile ? '⚡' : '速度';
    speedLabel.style.cssText = `
      font-size: ${isMobile ? '14px' : '16px'};
      color: var(--text-secondary, #aaa);
      font-weight: 500;
      white-space: nowrap;
    `;

    // 速度滑块
    speedSlider = document.createElement('input');
    speedSlider.type = 'range';
    speedSlider.min = '0.05';
    speedSlider.max = '3';
    speedSlider.step = '0.05';
    speedSlider.value = String(options.getSpeed());
    speedSlider.style.cssText = `
      width: ${isMobile ? '70px' : '100px'};
      height: 6px;
      cursor: pointer;
    `;

    // 速度值显示
    speedValue = document.createElement('span');
    speedValue.textContent = `${options.getSpeed().toFixed(isMobile ? 1 : 2)}×`;
    speedValue.style.cssText = `
      font-size: ${isMobile ? '12px' : '16px'};
      color: var(--text-primary, #fff);
      font-weight: 600;
      min-width: ${isMobile ? '36px' : '50px'};
      text-align: right;
    `;

    // 速度变化事件
    speedSlider.addEventListener('input', () => {
      const speed = parseFloat(speedSlider.value);
      speedValue.textContent = `${speed.toFixed(isMobile ? 1 : 2)}×`;
      options.onSpeedChange(speed);
    });

    // 阻止滑块上的 mousedown 冒泡（避免触发拖拽）
    [speedSlider, speedLabel, speedValue, playPauseBtn, resetBtn].forEach(el => {
      el.addEventListener('mousedown', (e) => e.stopPropagation());
    });

    // 组装
    container.append(playPauseBtn, resetBtn, divider, speedLabel, speedSlider, speedValue);

    // 拖拽功能（仅在桌面端启用）
    if (!isMobile) {
      cleanupDrag = initDrag(container);
    }
    
    // 更新播放状态
    updatePlayState();
  }
  
  // 初始构建
  buildUI();

  // 定时更新播放状态
  intervalId = window.setInterval(updatePlayState, 200);

  function updatePlayState() {
    if (!playPauseBtn) return;
    const isPlaying = options.isPlaying();
    playPauseBtn.textContent = isPlaying ? '⏸' : '▶';
    playPauseBtn.style.borderColor = isPlaying 
      ? 'var(--accent-color, #4db0ff)' 
      : 'var(--border-color, rgba(255, 255, 255, 0.15))';
  }
  
  // 刷新布局（响应窗口大小变化）
  function refreshLayout(): void {
    const newDeviceType = getDeviceType();
    if (newDeviceType !== currentDeviceType) {
      currentDeviceType = newDeviceType;
      buildUI();
    }
  }
  
  // 监听窗口大小变化
  function onWindowResize(): void {
    refreshLayout();
  }
  
  window.addEventListener('resize', onWindowResize);

  return {
    element: container,
    updatePlayState,
    refreshLayout,
    dispose: () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
      window.removeEventListener('resize', onWindowResize);
      if (cleanupDrag) {
        cleanupDrag();
      }
      container.remove();
    },
  };
}

// 创建按钮辅助函数
interface ButtonOptions {
  title: string;
  content?: string;
  width?: string;
  height?: string;
  fontSize?: string;
  color?: string;
  onClick: () => void;
}

function createButton(options: ButtonOptions): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.title = options.title;
  if (options.content) btn.textContent = options.content;
  btn.style.cssText = `
    width: ${options.width || 'auto'};
    height: ${options.height || 'auto'};
    border-radius: 8px;
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
    background: var(--btn-bg, rgba(255, 255, 255, 0.1));
    color: ${options.color || 'var(--text-primary, #fff)'};
    font-size: ${options.fontSize || '14px'};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;
  `;

  btn.addEventListener('click', options.onClick);
  btn.addEventListener('mouseenter', () => {
    btn.style.background = 'var(--btn-hover-bg, rgba(255, 255, 255, 0.2))';
    btn.style.transform = 'translateY(-1px)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = 'var(--btn-bg, rgba(255, 255, 255, 0.1))';
    btn.style.transform = 'none';
  });

  return btn;
}

// 初始化拖拽
function initDrag(element: HTMLElement): () => void {
  let isDragging = false;
  let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

  function onMouseDown(e: MouseEvent) {
    // 只有直接点击容器时才拖拽
    if (e.target !== element) return;
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = element.offsetLeft;
    initialTop = element.offsetTop;
    element.style.transition = 'none';
    element.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    element.style.left = `${initialLeft + e.clientX - startX}px`;
    element.style.top = `${initialTop + e.clientY - startY}px`;
  }

  function onMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    element.style.transition = '';
    element.style.cursor = '';
    document.body.style.userSelect = '';
  }

  element.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  return () => {
    element.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
}
