import { getTeachingStandards, type TeachingMode } from './teaching-standards';
import { getResponsiveViewport } from './responsive-stage';
import { applyTouchInteractionMode } from './touch-interaction';
import { createControlLayout, type ControlLayoutManager, type ColumnLayout, type DensityMode } from '../ui/control-layout';

export type ReadoutItem = {
  label: string;
  value: string;
  layout?: 'half' | 'full';
};

export type LayoutConfig = {
  /** 左侧默认宽度占比 (0.3 = 30%) */
  defaultLeftRatio?: number;
  /** 左侧最小宽度 (px) */
  leftMinWidth?: number;
  /** 左侧最大宽度 (px) */
  leftMaxWidth?: number;
  /** 是否显示图表区 */
  hasGraph?: boolean;
  /** 图表区默认高度 (px 或 0-1 的比例) */
  graphHeight?: number;
  /** 控制区列数 (auto=自适应) */
  controlColumns?: 'auto' | 1 | 2 | 3;
  /** 数据区默认折叠 */
  readoutCollapsed?: boolean;
};

export type TeachingDemoShell = {
  root: HTMLElement;
  controlSlot: HTMLElement;
  graphSlot: HTMLElement | null;
  readoutSlot: HTMLElement;
  stageSlot: HTMLElement;
  stageCanvas: HTMLCanvasElement;
  modeButton: HTMLButtonElement;
  themeButton: HTMLButtonElement;
  setStatus: (text: string, level?: StatusLevel) => void;
  setReadout: (items: ReadoutItem[]) => void;
  setMode: (mode: TeachingMode) => void;
  setTheme: (theme: TeachingTheme) => void;
  getMode: () => TeachingMode;
  getTheme: () => TeachingTheme;
  dispose: () => void;
  /** 设置左侧宽度比例 (0-1) */
  setLeftRatio: (ratio: number) => void;
  /** 获取当前左侧宽度比例 */
  getLeftRatio: () => number;
  /** 获取控制区布局管理器 */
  getControlLayout: () => ControlLayoutManager;
};

export type TeachingTheme = 'dark' | 'light';
export type StatusLevel = 'ready' | 'running' | 'paused' | 'success' | 'error' | 'info';

export type CreateTeachingDemoShellOptions = {
  mount: HTMLElement;
  title: string;
  subtitle: string;
  defaultMode?: TeachingMode;
  defaultTheme?: TeachingTheme;
  readoutLabel?: string;
  hideHeader?: boolean;
  /** 布局配置 */
  layout?: LayoutConfig;
  /** 左侧区域尺寸变化回调（拖拽分隔条时触发） */
  onResize?: () => void;
};

const COMPACT_BREAKPOINT_PX = 900;

// 根据视口宽度计算动态尺寸
function getDynamicLayoutSizes(): { minWidth: number; maxWidth: number; defaultRatio: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const minDim = Math.min(vw, vh);
  
  // 高分屏检测：DPR >= 2 或屏幕宽度 >= 2560
  const isHighRes = window.devicePixelRatio >= 2 || vw >= 2560;
  
  // 基础尺寸
  const baseMinWidth = isHighRes ? 320 : 280;
  const baseMaxWidth = Math.min(vw * 0.5, isHighRes ? 1200 : 960);
  const defaultRatio = vw < 1440 ? 0.38 : 0.35;
  
  // 根据视口大小调整
  if (minDim < 768) {
    // 小屏幕
    return { minWidth: 240, maxWidth: vw * 0.6, defaultRatio: 0.5 };
  } else if (minDim < 1080) {
    // 中等屏幕
    return { minWidth: 260, maxWidth: vw * 0.5, defaultRatio: 0.38 };
  } else {
    // 大屏幕/高分屏
    return { 
      minWidth: Math.min(baseMinWidth, vw * 0.2), 
      maxWidth: Math.max(baseMaxWidth, vw * 0.5),
      defaultRatio 
    };
  }
}

// 默认布局配置
const DEFAULT_LAYOUT: Required<LayoutConfig> = {
  defaultLeftRatio: 0.35,
  leftMinWidth: 280,
  leftMaxWidth: 960,  // 支持到 50% 宽度（假设 1920px 屏幕）
  hasGraph: false,
  graphHeight: 240,
  controlColumns: 'auto',
  readoutCollapsed: true,
};

function modeToggleLabel(mode: TeachingMode): string {
  return mode === 'presentation' ? '切换到标准模式' : '切换到演示模式';
}

function themeToggleLabel(theme: TeachingTheme): string {
  return theme === 'dark' ? '切换到春日主题' : '切换到月夜主题';
}

function modeToggleText(mode: TeachingMode): string {
  return mode === 'presentation' ? '标准' : '演示';
}

function themeToggleText(theme: TeachingTheme): string {
  return theme === 'dark' ? '春日' : '月夜';
}

function applyModeTokens(root: HTMLElement, mode: TeachingMode): void {
  const standards = getTeachingStandards(mode);
  root.dataset.mode = mode;
  root.style.setProperty('--body-font-px', `${standards.bodyFontPx}px`);
  root.style.setProperty('--control-font-px', `${standards.controlFontPx}px`);
  root.style.setProperty('--heading-font-px', `${standards.headingFontPx}px`);
  root.style.setProperty('--stroke-px', `${standards.strokePx}px`);
  root.style.setProperty('--point-radius-px', `${standards.pointRadiusPx}px`);
}

function applyThemeTokens(root: HTMLElement, theme: TeachingTheme): void {
  root.dataset.theme = theme;
}

function isCompactViewport(): boolean {
  return getResponsiveViewport(COMPACT_BREAKPOINT_PX).isNarrow;
}

function inferStatusLevel(text: string): StatusLevel {
  if (/错误|失败|异常|无效|非法/.test(text)) return 'error';
  if (/播放|运行|开始/.test(text)) return 'running';
  if (/暂停/.test(text)) return 'paused';
  if (/就绪/.test(text)) return 'ready';
  if (/单步|推进/.test(text)) return 'success';
  if (/已|完成|更新|重置|应用|开启|切换/.test(text)) return 'success';
  return 'info';
}

function statusLevelLabel(level: StatusLevel): string {
  if (level === 'ready') return '就绪';
  if (level === 'running') return '运行中';
  if (level === 'paused') return '已暂停';
  if (level === 'success') return '已完成';
  if (level === 'error') return '异常';
  return '提示';
}

function nowTimeLabel(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function resolveReadoutLayout(item: ReadoutItem): 'half' | 'full' {
  if (item.layout) return item.layout;
  const labelLength = item.label.trim().length;
  const valueLength = item.value.trim().length;
  if (/[\n\r]/.test(item.value)) return 'full';
  if (valueLength > 14) return 'full';
  return labelLength + valueLength <= 18 ? 'half' : 'full';
}

export function createTeachingDemoShell(options: CreateTeachingDemoShellOptions): TeachingDemoShell {
  const modeState: { value: TeachingMode } = {
    value: options.defaultMode ?? 'normal'
  };
  const themeState: { value: TeachingTheme } = {
    value: options.defaultTheme ?? 'light'  // 默认为春日模式（浅色）
  };
  const readoutLabel = options.readoutLabel ?? '数据区';
  const hideHeader = options.hideHeader ?? false;
  
  // 获取动态尺寸（根据视口和高分屏）
  const dynamicSizes = typeof window !== 'undefined' ? getDynamicLayoutSizes() : {
    minWidth: 280,
    maxWidth: 960,
    defaultRatio: 0.35
  };
  
  // 合并布局配置（用户配置优先于动态计算）
  const layout: Required<LayoutConfig> = {
    ...DEFAULT_LAYOUT,
    defaultLeftRatio: options.layout?.defaultLeftRatio ?? dynamicSizes.defaultRatio,
    leftMinWidth: options.layout?.leftMinWidth ?? dynamicSizes.minWidth,
    leftMaxWidth: options.layout?.leftMaxWidth ?? dynamicSizes.maxWidth,
    ...options.layout,
  };

  // 生成HTML结构
  const hasGraph = layout.hasGraph;
  
  options.mount.innerHTML = `
    <section class="teaching-demo v2-layout ${hideHeader ? 'is-compact-sidebar' : ''}" 
             data-mode="${modeState.value}" 
             data-theme="${themeState.value}"
             data-has-graph="${hasGraph}"
             data-control-columns="${layout.controlColumns}">
      
      <!-- 左侧面板：控制区 + 图表区 -->
      <aside class="teaching-left-panel">
        ${hideHeader ? '' : `
        <header class="teaching-header">
          <h1 class="teaching-title">${options.title}</h1>
          <p class="teaching-subtitle">${options.subtitle}</p>
        </header>
        `}
        
        <!-- 控制区 -->
        <section class="control-section" data-collapsed="false">
          <div class="section-header">
            <h2 class="section-title">控制区</h2>
            <button type="button" class="section-toggle" data-target="control" aria-label="折叠控制区">−</button>
          </div>
          <div class="control-slot"></div>
        </section>
        
        ${hasGraph ? `
        <!-- 图表区（可选） - 占据所有剩余空间 -->
        <section class="graph-section" data-collapsed="false">
          <div class="section-header">
            <h2 class="section-title">图表</h2>
            <button type="button" class="section-toggle" data-target="graph" aria-label="折叠图表区">−</button>
          </div>
          <div class="graph-slot"></div>
        </section>
        ` : ''}
      </aside>
      
      <!-- 可拖拽分隔线 -->
      <div class="panel-resizer" role="separator" aria-orientation="vertical" aria-label="调整面板宽度" tabindex="0"></div>
      
      <!-- 右侧：动画区 -->
      <section class="teaching-right-panel">
        <div class="stage-toolbar">
          <button type="button" class="sidebar-toggle">隐藏控制面板</button>
          <div class="toolbar-actions">
            <button type="button" class="mode-toggle" aria-label="${modeToggleLabel(modeState.value)}">${modeToggleText(modeState.value)}</button>
            <button type="button" class="shell-theme-toggle" aria-label="${themeToggleLabel(themeState.value)}">${themeToggleText(themeState.value)}</button>
          </div>
        </div>
        
        <div class="stage-frame">
          <div class="stage-slot">
            <canvas class="stage-canvas" aria-label="动画演示区域"></canvas>
          </div>
        </div>
        
        <!-- 数据区（默认折叠） -->
        <div class="readout-panel ${layout.readoutCollapsed ? 'is-collapsed' : ''}" role="region" aria-label="${readoutLabel}">
          <div class="readout-header">
            <span class="readout-title">${readoutLabel}</span>
            <button type="button" class="readout-toggle" aria-label="${layout.readoutCollapsed ? '展开' : '折叠'}">${layout.readoutCollapsed ? '展开' : '折叠'}</button>
          </div>
          <ul class="readout-slot"></ul>
        </div>
      </section>
    </section>
  `;

  // 获取DOM引用
  const root = options.mount.querySelector('.teaching-demo') as HTMLElement;
  const leftPanel = options.mount.querySelector('.teaching-left-panel') as HTMLElement;
  const rightPanel = options.mount.querySelector('.teaching-right-panel') as HTMLElement;
  const resizer = options.mount.querySelector('.panel-resizer') as HTMLElement;
  const controlSlot = options.mount.querySelector('.control-slot') as HTMLElement;
  const graphSlot = options.mount.querySelector('.graph-slot') as HTMLElement | null;
  const stageSlot = options.mount.querySelector('.stage-slot') as HTMLElement;
  const stageCanvas = options.mount.querySelector('.stage-canvas') as HTMLCanvasElement;
  const modeButton = options.mount.querySelector('.mode-toggle') as HTMLButtonElement;
  const themeButton = options.mount.querySelector('.shell-theme-toggle') as HTMLButtonElement;
  const sidebarToggle = options.mount.querySelector('.sidebar-toggle') as HTMLButtonElement;
  const readoutPanel = options.mount.querySelector('.readout-panel') as HTMLElement;
  const readoutSlot = options.mount.querySelector('.readout-slot') as HTMLElement;
  const readoutToggle = options.mount.querySelector('.readout-toggle') as HTMLButtonElement;

  if (!root || !leftPanel || !rightPanel || !resizer || !controlSlot || !stageSlot || 
      !stageCanvas || !modeButton || !themeButton || !sidebarToggle || 
      !readoutPanel || !readoutSlot || !readoutToggle) {
    throw new Error('Failed to mount teaching demo shell: missing required elements');
  }

  // 当前左侧宽度比例
  let leftRatio = layout.defaultLeftRatio;
  let isDragging = false;
  let compactViewport = isCompactViewport();
  let readoutCollapsed = layout.readoutCollapsed;
  let sidebarHidden = false;  // 控制区隐藏状态
  
  // 设备类型追踪
  function getCurrentDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }
  let currentDeviceType = getCurrentDeviceType();

  // 初始化控制区布局管理器
  const controlLayout = createControlLayout({
    container: controlSlot,
    minWidth1Col: 0,
    minWidth2Col: 260,
    minWidth3Col: 360,
    defaultDensity: 'compact',
    onLayoutChange: (columns, density) => {
      // 布局变化时的回调
      console.log('[Control Layout] Columns:', columns, 'Density:', density);
    }
  });

  // 设置左侧宽度
  function setLeftRatio(ratio: number): void {
    const minRatio = layout.leftMinWidth / window.innerWidth;
    const maxRatio = Math.min(layout.leftMaxWidth / window.innerWidth, 0.5);
    leftRatio = Math.max(minRatio, Math.min(maxRatio, ratio));
    applyLayout();
  }

  function getLeftRatio(): number {
    return leftRatio;
  }

  // 应用布局
  function applyLayout(): void {
    // 设置侧边栏隐藏状态属性
    root.dataset.sidebarHidden = String(sidebarHidden);
    
    if (compactViewport) {
      // 移动端：堆叠布局
      root.style.gridTemplateColumns = '1fr';
      leftPanel.style.display = readoutCollapsed ? 'none' : 'flex';
      leftPanel.style.width = 'auto';
      rightPanel.style.display = 'flex';
      resizer.style.display = 'none';
    } else {
      // 桌面端：左右布局
      if (sidebarHidden) {
        // 左侧边栏折叠 - 只保留分隔条用于恢复
        root.style.gridTemplateColumns = '0px 8px 1fr';
        leftPanel.style.display = 'none';
        leftPanel.style.width = '0px';
        rightPanel.style.display = 'flex';
        rightPanel.style.width = 'auto';
        resizer.style.display = 'block';
      } else {
        const totalWidth = root.clientWidth;
        // 计算左侧宽度：按比例，但受 min/max 限制
        let leftWidth = totalWidth * leftRatio;
        leftWidth = Math.max(layout.leftMinWidth, Math.min(layout.leftMaxWidth, leftWidth));
        // 确保不超过屏幕 50%
        leftWidth = Math.min(leftWidth, totalWidth * 0.5);
        root.style.gridTemplateColumns = `${leftWidth}px 8px 1fr`;
        leftPanel.style.display = 'flex';
        leftPanel.style.width = 'auto';
        rightPanel.style.display = 'flex';
        rightPanel.style.width = 'auto';
        resizer.style.display = 'block';
      }
    }
    
    // 更新控制区列数
    updateControlColumns();
    
    // 触发resize通知
    notifyResize();
    
    // 更新按钮文本
    sidebarToggle.textContent = sidebarHidden ? '显示左侧区域' : '隐藏左侧区域';
  }

  // 更新控制区列数（自适应）
  function updateControlColumns(): void {
    if (layout.controlColumns === 'auto') {
      const leftWidth = leftPanel.clientWidth;
      let columns = 1;
      if (leftWidth > 380) columns = 3;
      else if (leftWidth > 300) columns = 2;
      controlSlot.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    } else {
      controlSlot.style.gridTemplateColumns = `repeat(${layout.controlColumns}, 1fr)`;
    }
  }

  // 触发尺寸变化回调
  function notifyResize(): void {
    if (!options.onResize) return;
    // 触发回调，让场景自行处理 resize
    options.onResize();
  }

  // 拖拽分隔线
  function startDrag(e: MouseEvent | TouchEvent): void {
    if (compactViewport) return;
    isDragging = true;
    e.preventDefault();
    
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startLeftWidth = leftPanel.clientWidth;
    
    // 使用 requestAnimationFrame 节流 resize 通知
    let rafId: number | null = null;
    let pendingResize = false;
    
    function scheduleResize(): void {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (pendingResize) {
          notifyResize();
          pendingResize = false;
        }
      });
    }
    
    function onMove(e: MouseEvent | TouchEvent): void {
      if (!isDragging) return;
      const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = currentX - startX;
      const newLeftWidth = startLeftWidth + deltaX;
      const totalWidth = root.clientWidth;
      const newRatio = newLeftWidth / totalWidth;
      setLeftRatio(newRatio);
      
      // 使用 requestAnimationFrame 确保 DOM 更新后再通知
      // 这保证场景获取到的是最新的尺寸
      requestAnimationFrame(() => {
        notifyResize();
      });
    }
    
    function onEnd(): void {
      isDragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      if (rafId) cancelAnimationFrame(rafId);
      notifyResize(); // 确保最终状态通知
    }
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd);
  }

  resizer.addEventListener('mousedown', startDrag);
  resizer.addEventListener('touchstart', startDrag, { passive: false });

  // 侧边栏折叠/显示切换（折叠整个左侧区域）
  function toggleSidebar(): void {
    if (compactViewport) {
      // 移动端：切换数据区折叠状态
      readoutCollapsed = !readoutCollapsed;
      applyLayout();
    } else {
      // 桌面端：折叠/展开整个左侧边栏
      sidebarHidden = !sidebarHidden;
      applyLayout();
    }
  }

  sidebarToggle.addEventListener('click', toggleSidebar);
  
  // 区域折叠切换（控制区/图表区独立折叠）
  const controlSection = leftPanel.querySelector('.control-section') as HTMLElement;
  const graphSection = leftPanel.querySelector('.graph-section') as HTMLElement;
  
  function toggleSection(target: 'control' | 'graph'): void {
    const section = target === 'control' ? controlSection : graphSection;
    if (!section) return;
    
    const isCollapsed = section.dataset.collapsed === 'true';
    section.dataset.collapsed = String(!isCollapsed);
    
    const toggleBtn = section.querySelector('.section-toggle') as HTMLButtonElement;
    if (toggleBtn) {
      toggleBtn.textContent = !isCollapsed ? '+' : '−';
      toggleBtn.setAttribute('aria-label', !isCollapsed ? `展开${target === 'control' ? '控制区' : '图表区'}` : `折叠${target === 'control' ? '控制区' : '图表区'}`);
    }
    
    // 触发 resize 通知，让 Canvas 重新调整尺寸
    requestAnimationFrame(() => {
      notifyResize();
    });
  }
  
  // 绑定区域折叠按钮
  leftPanel.querySelectorAll('.section-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = (e.currentTarget as HTMLElement).dataset.target as 'control' | 'graph';
      toggleSection(target);
    });
  });

  // 数据区折叠
  function toggleReadout(): void {
    readoutCollapsed = !readoutCollapsed;
    readoutPanel.classList.toggle('is-collapsed', readoutCollapsed);
    readoutToggle.textContent = readoutCollapsed ? '展开' : '折叠';
    readoutToggle.setAttribute('aria-label', readoutCollapsed ? '展开' : '折叠');
  }

  readoutToggle.addEventListener('click', toggleReadout);

  // Resize 节流处理
  let resizeRafId: number | null = null;
  let pendingResize = false;
  
  function processResize(): void {
    resizeRafId = null;
    if (!pendingResize) return;
    pendingResize = false;
    
    const newCompact = isCompactViewport();
    const newDeviceType = getCurrentDeviceType();
    
    // 设备类型变化时触发回调
    if (newDeviceType !== currentDeviceType) {
      currentDeviceType = newDeviceType;
      // 通过 onResize 通知外部
      options.onResize?.();
    }
    
    if (newCompact !== compactViewport) {
      compactViewport = newCompact;
      applyLayout();
    } else {
      updateControlColumns();
    }
  }
  
  function handleResize(): void {
    pendingResize = true;
    if (resizeRafId === null) {
      resizeRafId = requestAnimationFrame(processResize);
    }
  }

  window.addEventListener('resize', handleResize);
  
  // 方向变化处理（移动端旋转屏幕）
  function onOrientationChange(): void {
    setTimeout(() => {
      pendingResize = true;
      processResize();
    }, 300);
  }
  window.addEventListener('orientationchange', onOrientationChange);

  // 初始化
  applyModeTokens(root, modeState.value);
  applyThemeTokens(root, themeState.value);
  applyTouchInteractionMode(stageCanvas, 'default');
  applyLayout();

  // 使数据读数面板可拖拽
  const cleanupReadoutDrag = makeElementDraggable(readoutPanel, readoutPanel.querySelector('.readout-header') as HTMLElement);

  // 拖拽功能辅助函数
  function makeElementDraggable(element: HTMLElement, handle: HTMLElement | null): (() => void) | void {
    if (!handle) return;
    
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    
    handle.style.cursor = 'move';
    
    function onMouseDown(e: MouseEvent) {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      // 获取当前计算后的 left/top 值
      const rect = element.getBoundingClientRect();
      initialLeft = rect.left + window.scrollX;
      initialTop = rect.top + window.scrollY;
      
      // 切换为 left/top 定位，保持当前位置不变
      element.style.left = `${initialLeft}px`;
      element.style.top = `${initialTop}px`;
      element.style.right = 'auto';
      element.style.bottom = 'auto';
      element.style.transition = 'none';
      document.body.style.userSelect = 'none';
      
      e.preventDefault();
    }
    
    function onMouseMove(e: MouseEvent) {
      if (!isDragging) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      element.style.left = `${initialLeft + dx}px`;
      element.style.top = `${initialTop + dy}px`;
    }
    
    function onMouseUp() {
      if (isDragging) {
        isDragging = false;
        element.style.transition = '';
        document.body.style.userSelect = '';
      }
    }
    
    handle.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // 返回清理函数
    return () => {
      handle.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
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
    
    setStatus(text: string, level?: StatusLevel): void {
      // 状态信息可以通过 setReadout 显示
      this.setReadout([{ label: '状态', value: text }]);
    },
    
    setReadout(items: ReadoutItem[]): void {
      readoutSlot.innerHTML = '';
      for (const item of items) {
        const layout = resolveReadoutLayout(item);
        const line = document.createElement('li');
        line.className = `readout-item readout-item--${layout}`;
        line.innerHTML = `<span class="readout-label">${item.label}</span><strong class="readout-value">${item.value}</strong>`;
        line.title = `${item.label}：${item.value}`;
        readoutSlot.appendChild(line);
      }
    },
    
    setMode(mode: TeachingMode): void {
      modeState.value = mode;
      applyModeTokens(root, mode);
      modeButton.textContent = modeToggleText(mode);
      modeButton.setAttribute('aria-label', modeToggleLabel(mode));
      modeButton.setAttribute('aria-pressed', String(mode === 'presentation'));
    },
    
    setTheme(theme: TeachingTheme): void {
      themeState.value = theme;
      applyThemeTokens(root, theme);
      themeButton.textContent = themeToggleText(theme);
      themeButton.setAttribute('aria-label', themeToggleLabel(theme));
      themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
    },
    
    getMode() {
      return modeState.value;
    },
    
    getTheme() {
      return themeState.value;
    },
    
    setLeftRatio,
    getLeftRatio,
    
    getControlLayout: () => controlLayout,
    
    dispose() {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', onOrientationChange);
      if (resizeRafId !== null) {
        cancelAnimationFrame(resizeRafId);
      }
      controlLayout.dispose();
      cleanupReadoutDrag?.();
    }
  };
}
