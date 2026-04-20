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
  getCurrentLayout: () => {
    columns: ColumnLayout;
    density: DensityMode;
    width: number;
  };
  dispose: () => void;
}

/**
 * 创建控制区域布局管理器
 * 自动根据容器宽度计算最优列数
 */
export function createControlLayout(
  options: ControlLayoutOptions
): ControlLayoutManager {
  const {
    container,
    minWidth2Col = 280,
    minWidth3Col = 380,
    defaultDensity = 'compact',
    onLayoutChange
  } = options;

  let currentColumns: ColumnLayout = 1;
  let currentDensity: DensityMode = defaultDensity;

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

  function initResizeObserver(): () => void {
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

export interface ControlCardOptions {
  icon?: string;
  defaultCollapsed?: boolean;
  className?: string;
  headerActions?: HTMLElement[];
}

export function createControlCard(
  title: string,
  options?: ControlCardOptions
): {
  element: HTMLElement;
  body: HTMLElement;
  header: HTMLElement;
  setCollapsed: (collapsed: boolean) => void;
} {
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

  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'ctrl-card-actions';
  actionsContainer.style.cssText =
    'display: flex; align-items: center; gap: 8px; flex-shrink: 0;';

  if (options?.headerActions) {
    options.headerActions.forEach((btn) => actionsContainer.appendChild(btn));
  }

  const toggle = document.createElement('button');
  toggle.className = 'ctrl-card-toggle';
  toggle.innerHTML = options?.defaultCollapsed ? '▶' : '▼';
  toggle.setAttribute(
    'aria-label',
    options?.defaultCollapsed ? '展开' : '折叠'
  );

  actionsContainer.appendChild(toggle);
  header.appendChild(actionsContainer);

  const body = document.createElement('div');
  body.className = 'ctrl-card-body';

  card.appendChild(header);
  card.appendChild(body);

  header.addEventListener('click', (e) => {
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

export { createControlCard as createCollapsibleCard };

// Re-export extracted component factories
export {
  createCompactControlRow,
  type CompactControlRowOptions
} from './components/compact-control-row';
export { createParamSlider } from './components/param-slider';
export { createButtonGrid } from './components/button-grid';
export { createTransportControls } from './components/transport-controls';
