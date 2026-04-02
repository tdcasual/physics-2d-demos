/**
 * 通用演示框架 (Demo Shell)
 * 
 * 提供统一的四区域布局：控制区、图表区(可选)、动画区、数据读数区
 * 支持拖拽分隔条调整宽度、主题切换、模式切换、浮动控制等
 */

import { createControlLayout, type ControlLayoutManager } from '../ui/control-layout';

export type DemoMode = 'normal' | 'presentation';
export type DemoTheme = 'dark' | 'light';
export type StatusLevel = 'ready' | 'running' | 'paused' | 'success' | 'error' | 'info';

export type ReadoutItem = {
  label: string;
  value: string;
  layout?: 'half' | 'full';
};

export interface DemoShellConfig {
  /** 页面标题 */
  title: string;
  /** 副标题 */
  subtitle?: string;
  
  /** 布局配置 */
  layout?: {
    /** 左侧默认宽度占比 (0.3 = 30%)，默认 0.38 */
    leftRatio?: number;
    /** 左侧最小宽度 (px)，默认 380 */
    leftMinWidth?: number;
    /** 左侧最大宽度 (px)，默认 960 */
    leftMaxWidth?: number;
    /** 是否显示图表区，默认 false */
    hasGraph?: boolean;
    /** 图表区高度占比 (0-1)，默认 0.4 */
    graphHeight?: number;
    /** 控制区列数，默认 'auto' */
    controlColumns?: 'auto' | 1 | 2 | 3;
    /** 数据区默认折叠，默认 true */
    readoutCollapsed?: boolean;
    /** 隐藏左侧标题区，默认 true */
    hideHeader?: boolean;
  };
  
  /** 初始模式 */
  defaultMode?: DemoMode;
  /** 初始主题 */
  defaultTheme?: DemoTheme;
  /** 数据区标签 */
  readoutLabel?: string;
  
  /** 左侧区域尺寸变化回调 */
  onResize?: () => void;
  /** 设备类型变化回调（mobile/tablet/desktop） */
  onDeviceTypeChange?: (deviceType: 'mobile' | 'tablet' | 'desktop') => void;
}

export interface DemoShell {
  /** 根元素 */
  root: HTMLElement;
  /** 控制区插槽 */
  controlSlot: HTMLElement;
  /** 图表区插槽（可能为 null） */
  graphSlot: HTMLElement | null;
  /** 数据读数区插槽 */
  readoutSlot: HTMLElement;
  /** 动画区插槽 */
  stageSlot: HTMLElement;
  /** 动画 Canvas */
  stageCanvas: HTMLCanvasElement;
  
  /** 模式切换按钮 */
  modeButton: HTMLButtonElement;
  /** 主题切换按钮 */
  themeButton: HTMLButtonElement;
  
  /** 设置状态信息 */
  setStatus: (text: string, level?: StatusLevel) => void;
  /** 设置数据读数 */
  setReadout: (items: ReadoutItem[]) => void;
  /** 设置模式 */
  setMode: (mode: DemoMode) => void;
  /** 设置主题 */
  setTheme: (theme: DemoTheme) => void;
  /** 获取当前模式 */
  getMode: () => DemoMode;
  /** 获取当前主题 */
  getTheme: () => DemoTheme;
  
  /** 设置左侧宽度比例 (0-1) */
  setLeftRatio: (ratio: number) => void;
  /** 获取当前左侧宽度比例 */
  getLeftRatio: () => number;
  /** 显示/隐藏左侧边栏 */
  toggleSidebar: () => boolean;
  /** 获取控制区布局管理器 */
  getControlLayout: () => ControlLayoutManager;
  
  /** 销毁实例 */
  dispose: () => void;
}

const COMPACT_BREAKPOINT_PX = 900;

/**
 * 创建通用演示框架
 */
export function createDemoShell(mount: HTMLElement, config: DemoShellConfig): DemoShell {
  // 合并默认配置
  const cfg: Required<DemoShellConfig> = {
    title: config.title,
    subtitle: config.subtitle ?? '',
    defaultMode: config.defaultMode ?? 'normal',
    defaultTheme: config.defaultTheme ?? 'light',
    readoutLabel: config.readoutLabel ?? '数据读数',
    onResize: config.onResize ?? (() => {}),
    onDeviceTypeChange: config.onDeviceTypeChange ?? (() => {}),
    layout: {
      leftRatio: 0.38,
      leftMinWidth: 380,
      leftMaxWidth: 960,
      hasGraph: false,
      graphHeight: 0.4,
      controlColumns: 'auto',
      readoutCollapsed: true,
      hideHeader: true,
      ...config.layout,
    },
  };

  const layout = cfg.layout;
  
  // 生成 HTML 结构
  mount.innerHTML = `
    <section class="demo-shell ${layout.hideHeader ? 'is-compact' : ''}" 
             data-mode="${cfg.defaultMode}" 
             data-theme="${cfg.defaultTheme}"
             data-has-graph="${layout.hasGraph}">
      
      <!-- 左侧面板 -->
      <aside class="shell-left-panel">
        ${!layout.hideHeader ? `
        <header class="shell-header">
          <h1 class="shell-title">${cfg.title}</h1>
          <p class="shell-subtitle">${cfg.subtitle}</p>
        </header>
        ` : ''}
        
        <!-- 控制区 -->
        <section class="shell-control-section" data-collapsed="false">
          <div class="section-header">
            <span class="section-title">控制区</span>
            <button type="button" class="section-toggle" data-target="control">−</button>
          </div>
          <div class="control-slot"></div>
        </section>
        
        ${layout.hasGraph ? `
        <!-- 图表区（可选） -->
        <section class="shell-graph-section" data-collapsed="false">
          <div class="section-header">
            <span class="section-title">图表</span>
            <button type="button" class="section-toggle" data-target="graph">−</button>
          </div>
          <div class="graph-slot"></div>
        </section>
        ` : ''}
      </aside>
      
      <!-- 分隔条 -->
      <div class="shell-resizer" role="separator" tabindex="0"></div>
      
      <!-- 右侧面板 -->
      <section class="shell-right-panel">
        <div class="shell-toolbar">
          <button type="button" class="sidebar-toggle">隐藏控制面板</button>
          <div class="toolbar-actions">
            <button type="button" class="mode-toggle">标准模式</button>
            <button type="button" class="theme-toggle">春日</button>
          </div>
        </div>
        
        <div class="shell-stage">
          <canvas class="stage-canvas"></canvas>
        </div>
        
        <!-- 数据读数区 -->
        <div class="readout-panel ${layout.readoutCollapsed ? 'is-collapsed' : ''}">
          <div class="readout-header">
            <span class="readout-title">${cfg.readoutLabel}</span>
            <button type="button" class="readout-toggle">${layout.readoutCollapsed ? '展开' : '折叠'}</button>
          </div>
          <ul class="readout-slot"></ul>
        </div>
      </section>
    </section>
  `;

  // 获取 DOM 引用
  const root = mount.querySelector('.demo-shell') as HTMLElement;
  const leftPanel = mount.querySelector('.shell-left-panel') as HTMLElement;
  const rightPanel = mount.querySelector('.shell-right-panel') as HTMLElement;
  const resizer = mount.querySelector('.shell-resizer') as HTMLElement;
  const controlSlot = mount.querySelector('.control-slot') as HTMLElement;
  const graphSlot = mount.querySelector('.graph-slot') as HTMLElement | null;
  const stageSlot = mount.querySelector('.shell-stage') as HTMLElement;
  const stageCanvas = mount.querySelector('.stage-canvas') as HTMLCanvasElement;
  const modeButton = mount.querySelector('.mode-toggle') as HTMLButtonElement;
  const themeButton = mount.querySelector('.theme-toggle') as HTMLButtonElement;
  const sidebarToggle = mount.querySelector('.sidebar-toggle') as HTMLButtonElement;
  const readoutPanel = mount.querySelector('.readout-panel') as HTMLElement;
  const readoutSlot = mount.querySelector('.readout-slot') as HTMLElement;
  const readoutToggle = mount.querySelector('.readout-toggle') as HTMLButtonElement;

  if (!root || !leftPanel || !rightPanel || !resizer || !controlSlot || !stageSlot || 
      !stageCanvas || !modeButton || !themeButton || !sidebarToggle || 
      !readoutPanel || !readoutSlot || !readoutToggle) {
    throw new Error('Failed to mount demo shell: missing required elements');
  }

  // 状态
  let leftRatio = layout.leftRatio ?? 0.38;
  let isResizing = false;
  let isCompact = window.innerWidth < COMPACT_BREAKPOINT_PX;
  // 移动端默认隐藏侧边栏
  let sidebarHidden = isCompact;
  let readoutCollapsed = layout.readoutCollapsed;
  let mode: DemoMode = cfg.defaultMode;
  let theme: DemoTheme = cfg.defaultTheme;
  
  // 设备类型追踪
  function getCurrentDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }
  let currentDeviceType = getCurrentDeviceType();

  // 初始化控制区布局
  const controlLayout = createControlLayout({
    container: controlSlot,
    minWidth1Col: 0,
    minWidth2Col: 260,
    minWidth3Col: 360,
    defaultDensity: 'compact',
  });

  // 应用布局
  function applyLayout(): void {
    root.dataset.sidebarHidden = String(sidebarHidden);
    
    if (isCompact) {
      root.style.gridTemplateColumns = '1fr';
      leftPanel.style.display = sidebarHidden ? 'none' : 'flex';
      resizer.style.display = 'none';
    } else {
      if (sidebarHidden) {
        root.style.gridTemplateColumns = '0px 8px 1fr';
      } else {
        const leftPercent = Math.round(leftRatio * 100);
        root.style.gridTemplateColumns = `${leftPercent}% 8px 1fr`;
      }
      leftPanel.style.display = 'flex';
      resizer.style.display = 'flex';
    }
    
    // 同步更新按钮文本
    sidebarToggle.textContent = sidebarHidden ? '显示控制面板' : '隐藏控制面板';
    
    cfg.onResize();
  }

  // 设置左侧宽度比例
  function setLeftRatio(ratio: number): void {
    const minRatio = (layout.leftMinWidth ?? 380) / window.innerWidth;
    leftRatio = Math.max(minRatio, Math.min(0.5, ratio));
    applyLayout();
  }

  // 分隔条拖拽
  function initResizer(): void {
    function onMove(e: MouseEvent | TouchEvent) {
      if (!isResizing) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const rootRect = root.getBoundingClientRect();
      const newRatio = (clientX - rootRect.left) / rootRect.width;
      setLeftRatio(Math.max(0.2, Math.min(0.5, newRatio)));
    }

    function onEnd() {
      isResizing = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    }

    function onStart(e: MouseEvent | TouchEvent) {
      isResizing = true;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchmove', onMove, { passive: true });
      document.addEventListener('touchend', onEnd);
      e.preventDefault();
    }

    resizer.addEventListener('mousedown', onStart);
    resizer.addEventListener('touchstart', onStart, { passive: false });
  }

  // 侧边栏折叠
  function toggleSidebar(): boolean {
    sidebarHidden = !sidebarHidden;
    applyLayout();
    return sidebarHidden;
  }

  // 区域折叠
  function toggleSection(target: 'control' | 'graph') {
    const section = root.querySelector(`.shell-${target}-section`) as HTMLElement;
    if (!section) return;
    const isCollapsed = section.dataset.collapsed === 'true';
    section.dataset.collapsed = String(!isCollapsed);
    const btn = section.querySelector('.section-toggle');
    if (btn) btn.textContent = isCollapsed ? '−' : '+';
  }

  // 数据区折叠
  function toggleReadout(): void {
    readoutCollapsed = !readoutCollapsed;
    readoutPanel.classList.toggle('is-collapsed', readoutCollapsed);
    readoutToggle.textContent = readoutCollapsed ? '展开' : '折叠';
  }

  // 拖拽数据读数面板
  function initDraggable(): () => void {
    const header = readoutPanel.querySelector('.readout-header') as HTMLElement;
    if (!header) return () => {};
    
    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    function onMouseDown(e: MouseEvent) {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = readoutPanel.offsetLeft;
      initialTop = readoutPanel.offsetTop;
      readoutPanel.style.transition = 'none';
      readoutPanel.style.right = 'auto';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    }

    function onMouseMove(e: MouseEvent) {
      if (!isDragging) return;
      readoutPanel.style.left = `${initialLeft + e.clientX - startX}px`;
      readoutPanel.style.top = `${initialTop + e.clientY - startY}px`;
    }

    function onMouseUp() {
      isDragging = false;
      readoutPanel.style.transition = '';
      document.body.style.userSelect = '';
    }

    header.style.cursor = 'move';
    header.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      header.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  // 绑定事件
  sidebarToggle.addEventListener('click', () => {
    toggleSidebar();
  });

  root.querySelectorAll('.section-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = (e.currentTarget as HTMLElement).dataset.target as 'control' | 'graph';
      toggleSection(target);
    });
  });

  readoutToggle.addEventListener('click', toggleReadout);

  modeButton.addEventListener('click', () => {
    setMode(mode === 'normal' ? 'presentation' : 'normal');
  });

  themeButton.addEventListener('click', () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  });

  // 移动端手势支持
  function initGestures(): () => void {
    if (!isCompact) return () => {};
    
    let touchStartX = 0;
    let touchStartY = 0;
    const SWIPE_THRESHOLD = 50;
    
    function onTouchStart(e: TouchEvent) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
    
    function onTouchEnd(e: TouchEvent) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      // 水平滑动距离大于垂直滑动，且超过阈值
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
        // 从左侧边缘右滑展开侧边栏
        if (deltaX > 0 && touchStartX < 30 && sidebarHidden) {
          toggleSidebar();
        }
        // 左滑收起侧边栏
        else if (deltaX < 0 && !sidebarHidden && touchStartX < leftPanel.offsetWidth) {
          toggleSidebar();
        }
      }
    }
    
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }
  
  const cleanupGestures = initGestures();

  // Resize 节流处理
  let resizeRafId: number | null = null;
  let pendingResize = false;
  
  function processResize(): void {
    resizeRafId = null;
    if (!pendingResize) return;
    pendingResize = false;
    
    const newCompact = window.innerWidth < COMPACT_BREAKPOINT_PX;
    const newDeviceType = getCurrentDeviceType();
    
    // 设备类型变化时通知回调
    if (newDeviceType !== currentDeviceType) {
      currentDeviceType = newDeviceType;
      cfg.onDeviceTypeChange(newDeviceType);
    }
    
    if (newCompact !== isCompact) {
      isCompact = newCompact;
      applyLayout();
    }
    controlLayout.updateLayout();
    cfg.onResize();
  }
  
  function onWindowResize(): void {
    pendingResize = true;
    if (resizeRafId === null) {
      resizeRafId = requestAnimationFrame(processResize);
    }
  }
  
  // 方向变化处理（移动端旋转屏幕）
  function onOrientationChange(): void {
    // 延迟执行，等待旋转动画完成
    setTimeout(() => {
      pendingResize = true;
      processResize();
    }, 300);
  }

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('orientationchange', onOrientationChange);

  // 初始化
  initResizer();
  const cleanupDraggable = initDraggable();
  // 设置初始按钮文本
  sidebarToggle.textContent = sidebarHidden ? '显示控制面板' : '隐藏控制面板';
  applyLayout();

  // API
  function setMode(newMode: DemoMode): void {
    mode = newMode;
    root.dataset.mode = mode;
    modeButton.textContent = mode === 'presentation' ? '演示模式' : '标准模式';
  }

  function setModeTheme(newTheme: DemoTheme): void {
    theme = newTheme;
    root.dataset.theme = theme;
    themeButton.textContent = theme === 'dark' ? '月夜' : '春日';
  }
  
  // 别名，用于 API 兼容性
  const setTheme = setModeTheme;

  function setReadout(items: ReadoutItem[]): void {
    readoutSlot.innerHTML = '';
    for (const item of items) {
      const li = document.createElement('li');
      const layout = item.layout ?? (item.label.length + item.value.length <= 18 ? 'half' : 'full');
      li.className = `readout-item readout-item--${layout}`;
      li.innerHTML = `
        <span class="readout-label">${item.label}</span>
        <span class="readout-value">${item.value}</span>
      `;
      readoutSlot.appendChild(li);
    }
  }

  return {
    root,
    controlSlot,
    graphSlot,
    readoutSlot,
    stageSlot,
    stageCanvas,
    modeButton,
    themeButton,
    setStatus: (text: string, level?: StatusLevel) => {
      setReadout([{ label: '状态', value: text }]);
    },
    setReadout,
    setMode,
    setTheme: setModeTheme,
    getMode: () => mode,
    getTheme: () => theme,
    setLeftRatio,
    getLeftRatio: () => leftRatio,
    toggleSidebar,
    getControlLayout: () => controlLayout,
    dispose: () => {
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('orientationchange', onOrientationChange);
      if (resizeRafId !== null) {
        cancelAnimationFrame(resizeRafId);
      }
      cleanupDraggable();
      cleanupGestures();
      controlLayout.dispose();
      mount.innerHTML = '';
    },
  };
}
