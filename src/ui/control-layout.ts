/**
 * Control Layout System v3
 * 控制区域标准范式与组件库
 * 
 * 标准范式定义：
 * ====================
 * 
 * 一、页面结构（Shell Layout）
 * --------------------
 * +------------------+--------+----------------------+
 * | 控制区           | 分隔线 | 动画区               |
 * | +--------------+ |        | +------------------+ |
 * | | 控制列表     | |        | | 浮动控制按钮     | |
 * | +--------------+ |        | +------------------+ |
 * | +--------------+ |        | |                  | |
 * | | 预设场景     | |        | |    动画/图表     | |
 * | +--------------+ |        | |                  | |
 * | +--------------+ |        | +------------------+ |
 * | | 图表区       | |        |                      |
 * | +--------------+ |        |                      |
 * +------------------+--------+----------------------+
 * 
 * 左侧区域占比：35-40%（min: 380px, max: 520px）
 * 左侧结构：控制列表 + 预设场景 + 图表区（图表区占剩余空间）
 * 浮动控制：播放/暂停/重置/单步（位于动画区左上）
 * 
 * 二、控制区组件结构
 * --------------------
 * 控制区由两类卡片组成：
 * 
 * 1. 控制列表卡片（可动态管理）
 *    - 标题行：图标 + 标题 + [+添加按钮] + [折叠按钮]
 *    - 列表项：颜色标识 | 参数控件行 | 操作按钮
 *    - 每项一行，紧凑排列
 * 
 * 2. 预设场景卡片（固定按钮组）
 *    - 标题行：图标 + 标题 + [折叠按钮]
 *    - 按钮网格：2列紧凑按钮
 * 
 * 三、控制项行布局（单行紧凑模式）
 * --------------------
 * [色块] [参数1] [参数2] [参数3] [选项] [删除]
 * 
 * 色块：4px宽彩色条或10px圆点（纯颜色标识，无文字）
 * 参数：标签+滑块+数值，紧凑排列（标签9px，滑块高度4px）
 * 选项：下拉选择或切换按钮（60-70px宽）
 * 删除：20px图标按钮
 * 
 * 四、布局原则
 * --------------------
 * 1. 控制区高度自适应内容（flex: 0 0 auto），无底部空白
 * 2. 图表区占据剩余空间（flex: 1 1 auto）
 * 3. 左侧标题区隐藏（hideHeader: true），节省空间
 * 4. 参数控件1-3个时单行排列，超过时分组或换行
 * 5. 使用紧凑控件：小滑块（4px高）、小按钮、9px标签
 */

export type ColumnLayout = 1 | 2 | 3;
export type DensityMode = 'compact' | 'comfortable';

export interface ControlLayoutOptions {
  container: HTMLElement;
  minWidth1Col?: number;
  minWidth2Col?: number;
  minWidth3Col?: number;
  defaultDensity?: DensityMode;
  onLayoutChange?: (columns: ColumnLayout, density: DensityMode) => void;
}

export interface ControlLayoutManager {
  updateLayout: () => void;
  setColumns: (columns: ColumnLayout) => void;
  setDensity: (density: DensityMode) => void;
  getCurrentLayout: () => { columns: ColumnLayout; density: DensityMode; width: number };
  dispose: () => void;
}

/**
 * 创建控制区域布局管理器
 * 自动根据容器宽度计算最优列数
 */
export function createControlLayout(options: ControlLayoutOptions): ControlLayoutManager {
  const {
    container,
    minWidth1Col = 0,
    minWidth2Col = 280,
    minWidth3Col = 380,
    defaultDensity = 'compact',
    onLayoutChange
  } = options;

  let currentColumns: ColumnLayout = 1;
  let currentDensity: DensityMode = defaultDensity;
  let resizeObserver: ResizeObserver | null = null;

  function calculateColumns(width: number): ColumnLayout {
    if (width >= minWidth3Col) return 3;
    if (width >= minWidth2Col) return 2;
    return 1;
  }

  function calculateDensity(width: number): DensityMode {
    return width < 300 ? 'compact' : defaultDensity;
  }

  function applyLayout(columns: ColumnLayout, density: DensityMode): void {
    container.setAttribute('data-columns', String(columns));
    container.setAttribute('data-density', density);
    
    const changed = currentColumns !== columns || currentDensity !== density;
    currentColumns = columns;
    currentDensity = density;
    
    if (changed && onLayoutChange) {
      onLayoutChange(columns, density);
    }
  }

  function updateLayout(): void {
    const width = container.clientWidth;
    const columns = calculateColumns(width);
    const density = calculateDensity(width);
    applyLayout(columns, density);
  }

  function setColumns(columns: ColumnLayout): void {
    applyLayout(columns, currentDensity);
  }

  function setDensity(density: DensityMode): void {
    applyLayout(currentColumns, density);
  }

  function getCurrentLayout() {
    return {
      columns: currentColumns,
      density: currentDensity,
      width: container.clientWidth
    };
  }

  // 使用 ResizeObserver 监听容器变化
  function initResizeObserver(): (() => void) {
    // 优先使用 ResizeObserver
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          const columns = calculateColumns(width);
          const density = calculateDensity(width);
          applyLayout(columns, density);
        }
      });
      ro.observe(container);
      return () => ro.disconnect();
    }
    
    // Fallback: 使用 window resize
    const onWindowResize = () => updateLayout();
    window.addEventListener('resize', onWindowResize);
    return () => window.removeEventListener('resize', onWindowResize);
  }

  const cleanupResizeObserver = initResizeObserver();
  updateLayout();

  function dispose(): void {
    cleanupResizeObserver();
  }

  return {
    updateLayout,
    setColumns,
    setDensity,
    getCurrentLayout,
    dispose
  };
}

// ==================== 布局原则 ====================
//
// 控制区布局基本原则：
// 1. 大卡片（参数设置、预设、显示选项）始终垂直排列
// 2. 卡片内部根据内容灵活布局：
//    - 参数较多时（4+）：双列网格
//    - 参数较少时（1-3）：单列
//    - 预设按钮：单行4列或双行2列
// 3. 无图表区时：参数卡片内部可以双列，节省垂直空间
// 4. 有图表区时：参数卡片单列，保证可读性
//
// ==================== 标准组件工厂 ====================

/**
 * 控制卡片选项
 */
export interface ControlCardOptions {
  icon?: string;
  defaultCollapsed?: boolean;
  className?: string;
  headerActions?: HTMLElement[];
}

/**
 * 创建可折叠卡片（标准控制区卡片）
 * 标题行包含：图标 + 标题 + [操作按钮] + [折叠按钮]
 * 
 * 别名：createCollapsibleCard（兼容旧代码）
 */
export function createControlCard(
  title: string,
  options?: ControlCardOptions
): { element: HTMLElement; body: HTMLElement; header: HTMLElement; setCollapsed: (collapsed: boolean) => void } {
  const card = document.createElement('div');
  card.className = `ctrl-card ${options?.className || ''}`;
  if (options?.defaultCollapsed) {
    card.classList.add('collapsed');
  }

  const header = document.createElement('div');
  header.className = 'ctrl-card-header';
  
  const titleEl = document.createElement('div');
  titleEl.className = 'ctrl-card-title';
  if (options?.icon) {
    titleEl.innerHTML = `<span class="ctrl-card-icon">${options.icon}</span>${title}`;
  } else {
    titleEl.textContent = title;
  }

  header.appendChild(titleEl);
  
  // 操作按钮容器（包含自定义操作按钮和折叠按钮）
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'ctrl-card-actions';
  actionsContainer.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-shrink: 0;';;
  
  // 插入自定义操作按钮
  if (options?.headerActions) {
    options.headerActions.forEach(btn => actionsContainer.appendChild(btn));
  }

  const toggle = document.createElement('button');
  toggle.className = 'ctrl-card-toggle';
  toggle.innerHTML = options?.defaultCollapsed ? '▶' : '▼';
  toggle.setAttribute('aria-label', options?.defaultCollapsed ? '展开' : '折叠');

  actionsContainer.appendChild(toggle);
  header.appendChild(actionsContainer);

  const body = document.createElement('div');
  body.className = 'ctrl-card-body';

  card.appendChild(header);
  card.appendChild(body);

  header.addEventListener('click', (e) => {
    // 如果点击的是操作按钮，不触发折叠
    if ((e.target as HTMLElement).closest('button') !== toggle) {
      return;
    }
    const isCollapsed = card.classList.toggle('collapsed');
    toggle.innerHTML = isCollapsed ? '▶' : '▼';
    toggle.setAttribute('aria-label', isCollapsed ? '展开' : '折叠');
  });

  function setCollapsed(collapsed: boolean): void {
    card.classList.toggle('collapsed', collapsed);
    toggle.innerHTML = collapsed ? '▶' : '▼';
    toggle.setAttribute('aria-label', collapsed ? '展开' : '折叠');
  }

  return { element: card, body, header, setCollapsed };
}

// 兼容性别名
export { createControlCard as createCollapsibleCard };

/**
 * 创建紧凑控制行（单行多参数）
 * 布局：[色块] [参数...] [操作]
 */
export interface CompactControlRowOptions {
  color: string;
  params: Array<{
    key: string;
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
  }>;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'danger' | 'default';
  }>;
}

export function createCompactControlRow(options: CompactControlRowOptions): HTMLElement {
  const row = document.createElement('div');
  row.className = 'ctrl-row-compact';
  row.style.cssText = `
    display: grid;
    grid-template-columns: 14px ${options.params.map(() => '1fr').join(' ')} ${options.actions ? 'auto' : ''};
    gap: 8px;
    align-items: center;
    padding: 5px 8px;
    background: var(--card-bg, rgba(255,255,255,0.05));
    border-radius: 6px;
    border-left: 4px solid ${options.color};
  `;

  // 颜色标识
  const colorDot = document.createElement('div');
  colorDot.style.cssText = `width: 10px; height: 10px; border-radius: 50%; background: ${options.color};`;
  row.appendChild(colorDot);

  // 参数控件
  options.params.forEach(param => {
    const paramEl = document.createElement('div');
    paramEl.style.cssText = 'display: flex; align-items: center; gap: 4px;';
    paramEl.innerHTML = `
      <span style="font-size: 9px; color: var(--text-secondary); flex-shrink: 0;">${param.label}</span>
      <input type="range" min="${param.min}" max="${param.max}" step="${param.step}" value="${param.value}" 
             style="flex: 1; height: 4px; min-width: 30px;">
      <span style="font-size: 9px; min-width: 20px; text-align: right;">${param.value}</span>
    `;
    
    const slider = paramEl.querySelector('input')!;
    const valueSpan = paramEl.querySelector('span:last-child')!;
    
    slider.addEventListener('input', () => {
      valueSpan.textContent = slider.value;
    });
    
    slider.addEventListener('change', () => {
      param.onChange(parseFloat(slider.value));
    });
    
    row.appendChild(paramEl);
  });

  // 操作按钮
  if (options.actions) {
    const actionsEl = document.createElement('div');
    actionsEl.style.cssText = 'display: flex; gap: 4px;';
    options.actions.forEach(action => {
      const btn = document.createElement('button');
      btn.textContent = action.label;
      btn.className = action.variant === 'danger' ? 'ctrl-btn-icon danger' : 'ctrl-btn-icon';
      btn.addEventListener('click', action.onClick);
      actionsEl.appendChild(btn);
    });
    row.appendChild(actionsEl);
  }

  return row;
}

/**
 * 创建参数滑块（标准控件）
 * 
 * 布局模式：
 * - 单列模式（默认）：标签 | 滑块 | 数值（三列网格）
 * - 紧凑模式：标签+滑块+数值在同一行，适合双列布局
 */
export function createParamSlider(
  label: string,
  options: {
    min: number;
    max: number;
    step?: number;
    value?: number;
    unit?: string;
    onChange?: (value: number) => void;
    compact?: boolean; // 紧凑模式，适合双列
  }
): { element: HTMLElement; setValue: (value: number) => void; getValue: () => number } {
  const container = document.createElement('div');
  container.className = 'ctrl-param';
  
  if (options.compact) {
    // 紧凑模式：适合双列网格
    container.style.cssText = 'display: grid; grid-template-columns: auto 1fr auto; gap: 4px; align-items: center;';
  } else {
    // 标准模式
    container.style.cssText = 'display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center;';
  }

  const labelEl = document.createElement('label');
  labelEl.className = 'ctrl-param-label';
  labelEl.textContent = label;
  labelEl.style.cssText = options.compact 
    ? 'font-size: 10px; color: var(--text-secondary); white-space: nowrap;' 
    : 'font-size: 11px;';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'ctrl-slider';
  slider.min = String(options.min);
  slider.max = String(options.max);
  slider.step = String(options.step ?? (options.max - options.min) / 100);
  slider.value = String(options.value ?? options.min);
  slider.style.cssText = 'width: 100%; height: 4px;';

  const valueEl = document.createElement('span');
  valueEl.className = 'ctrl-param-value';
  valueEl.style.cssText = options.compact
    ? 'font-size: 10px; min-width: 30px; text-align: right; font-family: monospace;'
    : 'font-size: 11px; font-family: monospace;';
  
  function formatValue(val: number): string {
    const str = Number(val).toFixed(
      options.step ? Math.ceil(-Math.log10(options.step)) : 2
    );
    return options.unit ? `${str}${options.unit}` : str;
  }

  function updateDisplay(): void {
    valueEl.textContent = formatValue(Number(slider.value));
  }

  slider.addEventListener('input', () => {
    updateDisplay();
    options.onChange?.(Number(slider.value));
  });

  container.appendChild(labelEl);
  container.appendChild(slider);
  container.appendChild(valueEl);

  updateDisplay();

  return {
    element: container,
    setValue: (value: number) => {
      slider.value = String(value);
      updateDisplay();
    },
    getValue: () => Number(slider.value)
  };
}

/**
 * 创建按钮网格（预设场景按钮）
 */
export function createButtonGrid(
  buttons: Array<{
    label: string;
    value: string;
    variant?: 'default' | 'primary' | 'secondary';
    onClick?: () => void;
  }>,
  options?: {
    columns?: number;
    onSelect?: (value: string) => void;
  }
): { element: HTMLElement; setActive: (value: string) => void } {
  const grid = document.createElement('div');
  grid.className = 'ctrl-btn-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = `repeat(${options?.columns ?? 2}, 1fr)`;
  grid.style.gap = '6px';

  const buttonElements = new Map<string, HTMLButtonElement>();

  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `ctrl-btn ${btn.variant || 'default'}`;
    button.textContent = btn.label;
    button.dataset.value = btn.value;
    button.style.cssText = 'padding: 6px; font-size: 11px; border-radius: 6px; cursor: pointer;';

    button.addEventListener('click', () => {
      setActive(btn.value);
      btn.onClick?.();
      options?.onSelect?.(btn.value);
    });

    buttonElements.set(btn.value, button);
    grid.appendChild(button);
  });

  function setActive(value: string): void {
    buttonElements.forEach((btn, key) => {
      btn.classList.toggle('active', key === value);
    });
  }

  return { element: grid, setActive };
}

/**
 * 创建运输控制按钮组（浮动控制）
 */
export function createTransportControls(
  options: {
    onPlay?: () => void;
    onPause?: () => void;
    onReset?: () => void;
    onStep?: () => void;
  }
): { element: HTMLElement; setPlaying: (playing: boolean) => void } {
  const container = document.createElement('div');
  container.className = 'ctrl-transport';
  container.style.cssText = `
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 4px;
  `;

  const buttons = [
    { icon: '▶', label: '播放', action: options.onPlay },
    { icon: '⏸', label: '暂停', action: options.onPause },
    { icon: '⏹', label: '重置', action: options.onReset },
    { icon: '⏵', label: '单步', action: options.onStep }
  ];

  const buttonElements: HTMLButtonElement[] = [];

  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ctrl-transport-btn';
    button.innerHTML = `<span style="font-size: 14px;">${btn.icon}</span>`;
    button.title = btn.label;
    button.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 8px 4px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: var(--text-secondary);
      font-size: 10px;
      cursor: pointer;
    `;

    if (btn.action) {
      button.addEventListener('click', btn.action);
    }

    buttonElements.push(button);
    container.appendChild(button);
  });

  function setPlaying(playing: boolean): void {
    buttonElements[0].classList.toggle('active', playing);
    buttonElements[1].classList.toggle('active', !playing);
  }

  return { element: container, setPlaying };
}

/**
 * 创建浮动控制按钮（添加到动画区）
 */
function makeDraggable(element: HTMLElement, handle?: HTMLElement): () => void {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  
  const dragHandle = handle || element;
  dragHandle.style.cursor = 'move';
  
  function onMouseDown(e: MouseEvent) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    initialLeft = element.offsetLeft;
    initialTop = element.offsetTop;
    
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
    element.style.right = 'auto';
  }
  
  function onMouseUp() {
    if (isDragging) {
      isDragging = false;
      element.style.transition = '';
      document.body.style.userSelect = '';
    }
  }
  
  dragHandle.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  
  // 返回清理函数
  return () => {
    dragHandle.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
}

export function createFloatingControls(
  options: {
    isPlaying?: () => boolean;
    onTogglePlay?: () => void;
    onReset?: () => void;
    onSpeedChange?: (speed: number) => void;
    getSpeed?: () => number;
  }
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'stage-floating-controls';
  container.style.cssText = `
    position: absolute;
    top: 12px;
    left: 12px;
    display: inline-flex;
    gap: 12px;
    align-items: center;
    z-index: 10;
    padding: 12px 16px;
    background: var(--card-bg, rgba(0,0,0,0.3));
    border-radius: 10px;
    border: 1px solid var(--border-color, rgba(255,255,255,0.1));
    backdrop-filter: blur(8px);
  `;
  
  // 播放/暂停合并按钮
  const playPauseBtn = document.createElement('button');
  playPauseBtn.type = 'button';
  playPauseBtn.title = '播放/暂停';
  playPauseBtn.style.cssText = `
    width: 44px;
    height: 44px;
    border-radius: 8px;
    border: 1px solid var(--border-color, rgba(255,255,255,0.15));
    background: var(--btn-bg, rgba(255,255,255,0.1));
    color: var(--text-primary, #fff);
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  `;
  
  function updatePlayPauseBtn() {
    const isPlaying = options.isPlaying?.() ?? false;
    playPauseBtn.textContent = isPlaying ? '⏸' : '▶';
    playPauseBtn.style.borderColor = isPlaying ? 'var(--accent-color, #4db0ff)' : 'var(--border-color, rgba(255,255,255,0.15))';
  }
  
  playPauseBtn.addEventListener('click', () => {
    options.onTogglePlay?.();
    updatePlayPauseBtn();
  });
  
  // 阻止按钮上的 mousedown 事件冒泡，避免触发控制条拖拽
  playPauseBtn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  
  playPauseBtn.addEventListener('mouseenter', () => {
    playPauseBtn.style.background = 'var(--btn-hover-bg, rgba(255,255,255,0.2))';
    playPauseBtn.style.transform = 'translateY(-1px)';
  });
  playPauseBtn.addEventListener('mouseleave', () => {
    playPauseBtn.style.background = 'var(--btn-bg, rgba(255,255,255,0.1))';
    playPauseBtn.style.transform = 'none';
  });
  
  // 重置按钮
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.title = '重置';
  resetBtn.textContent = '↺';
  resetBtn.style.cssText = `
    width: 44px;
    height: 44px;
    border-radius: 8px;
    border: 1px solid var(--border-color, rgba(255,255,255,0.15));
    background: var(--btn-bg, rgba(255,255,255,0.1));
    color: var(--text-secondary, #aaa);
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  `;
  resetBtn.addEventListener('click', () => {
    options.onReset?.();
    updatePlayPauseBtn();
  });
  
  // 阻止按钮上的 mousedown 事件冒泡
  resetBtn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  
  resetBtn.addEventListener('mouseenter', () => {
    resetBtn.style.background = 'var(--btn-hover-bg, rgba(255,255,255,0.2))';
    resetBtn.style.color = 'var(--text-primary, #fff)';
    resetBtn.style.transform = 'translateY(-1px)';
  });
  resetBtn.addEventListener('mouseleave', () => {
    resetBtn.style.background = 'var(--btn-bg, rgba(255,255,255,0.1))';
    resetBtn.style.color = 'var(--text-secondary, #aaa)';
    resetBtn.style.transform = 'none';
  });
  
  // 分隔线
  const divider = document.createElement('div');
  divider.style.cssText = `
    width: 1px;
    height: 32px;
    background: var(--border-color, rgba(255,255,255,0.15));
    margin: 0 4px;
  `;
  
  // 速度控制
  const speedLabel = document.createElement('span');
  speedLabel.textContent = '速度';
  speedLabel.style.cssText = `
    font-size: 16px;
    color: var(--text-secondary, #aaa);
    font-weight: 500;
    white-space: nowrap;
  `;
  
  const speedSlider = document.createElement('input');
  speedSlider.type = 'range';
  speedSlider.min = '0.05';
  speedSlider.max = '3';
  speedSlider.step = '0.05';
  speedSlider.value = String(options.getSpeed?.() ?? 1);
  speedSlider.style.cssText = `
    width: 100px;
    height: 6px;
    cursor: pointer;
  `;
  
  const speedValue = document.createElement('span');
  speedValue.textContent = `${parseFloat(speedSlider.value).toFixed(2)}×`;
  speedValue.style.cssText = `
    font-size: 16px;
    color: var(--text-primary, #fff);
    font-weight: 600;
    min-width: 50px;
    text-align: right;
  `;
  
  speedSlider.addEventListener('input', () => {
    const speed = parseFloat(speedSlider.value);
    speedValue.textContent = `${speed.toFixed(2)}×`;
    options.onSpeedChange?.(speed);
  });
  
  // 阻止滑块和速度值上的 mousedown 事件冒泡，避免触发控制条拖拽
  speedSlider.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  speedValue.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  speedLabel.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  
  // 组装控件
  container.appendChild(playPauseBtn);
  container.appendChild(resetBtn);
  container.appendChild(divider);
  container.appendChild(speedLabel);
  container.appendChild(speedSlider);
  container.appendChild(speedValue);
  
  // 添加拖拽功能
  const cleanupDrag = makeDraggable(container);
  
  // 初始状态
  updatePlayPauseBtn();
  
  // 定时更新播放按钮状态
  const intervalId = setInterval(updatePlayPauseBtn, 200);
  
  // 保存清理方法
  (container as any).dispose = () => {
    clearInterval(intervalId);
    cleanupDrag();
  };
  
  // 事件驱动状态更新（供布局母版调用）
  (container as any).setState = (state: { isPlaying?: boolean; speed?: number }) => {
    if (typeof state.isPlaying === 'boolean') {
      playPauseBtn.textContent = state.isPlaying ? '⏸' : '▶';
      playPauseBtn.style.borderColor = state.isPlaying 
        ? 'var(--accent-color, #4db0ff)' 
        : 'var(--border-color, rgba(255,255,255,0.15))';
    }
    if (typeof state.speed === 'number') {
      speedSlider.value = String(state.speed);
      speedValue.textContent = `${state.speed.toFixed(2)}×`;
    }
  };
  
  return container;
}
