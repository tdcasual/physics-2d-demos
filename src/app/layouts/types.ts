/**
 * 布局母版系统 - 核心类型定义
 * 
 * @review-date 2026-04-02
 * @version 0.1.0
 */

// ============================================================================
// 基础类型
// ============================================================================

/** 主题类型 */
export type Theme = 'light' | 'dark';

/** 布局过渡动画配置 */
export interface LayoutTransition {
  /** 动画类型 */
  type: 'fade' | 'slide' | 'scale' | 'none';
  /** 持续时间(ms) */
  duration: number;
  /** 缓动函数 */
  easing: string;
}

/** 布局切换选项 */
export interface SwitchOptions {
  /** 切换原因 */
  reason?: string;
  /** 是否使用动画 */
  animate?: boolean;
  /** 动画配置 */
  transition?: LayoutTransition;
  /** 是否保存用户偏好 */
  savePreference?: boolean;
}

// ============================================================================
// 区域槽位类型
// ============================================================================

/** 区域名称 */
export type SlotName = 'header' | 'control' | 'animation' | 'graph' | 'readout';

/** 布局区域槽位
 * 
 * 每个槽位是一个 HTMLElement，场景将内容渲染到这些槽位中
 */
export interface LayoutSlots {
  /** 头部区域 (可选) */
  header?: HTMLElement;
  /** 控制区域 (必需) */
  control: HTMLElement;
  /** 动画区域 (必需) */
  animation: HTMLElement;
  /** 图表区域 (可选) */
  graph?: HTMLElement;
  /** 数据读数区域 (可选) */
  readout?: HTMLElement;
}

/** 区域配置 */
export interface SlotConfig {
  /** 是否显示 */
  visible?: boolean;
  /** 默认折叠状态 */
  collapsed?: boolean;
  /** 最小尺寸 */
  minSize?: number;
  /** 最大尺寸 */
  maxSize?: number;
  /** 默认尺寸 */
  defaultSize?: number;
}

// ============================================================================
// 布局母版接口
// ============================================================================

/** 布局母版接口
 * 
 * 所有布局母版必须实现此接口
 */
export interface LayoutMaster {
  /** 布局ID (唯一标识) */
  readonly id: string;
  
  /** 布局显示名称 */
  readonly name: string;
  
  /** 布局描述 */
  readonly description: string;
  
  /** 支持的区域 */
  readonly supportedSlots: SlotName[];
  
  /** 
   * 渲染布局
   * @param container - 容器元素
   * @returns 区域槽位映射
   */
  render(container: HTMLElement): LayoutSlots;
  
  /**
   * 挂载布局
   * 在渲染完成后调用，用于初始化
   */
  mount(): Promise<void>;
  
  /**
   * 卸载布局
   * 清理资源，移除事件监听
   */
  unmount(): Promise<void>;
  
  /**
   * 处理尺寸变化
   * @param width - 容器宽度
   * @param height - 容器高度
   */
  handleResize(width: number, height: number): void;
  
  /**
   * 设置主题
   * @param theme - 主题类型
   */
  setTheme(theme: Theme): void;
  
  /**
   * 进入布局动画
   * @param transition - 过渡配置
   */
  enter(transition?: LayoutTransition): Promise<void>;
  
  /**
   * 退出布局动画
   * @param transition - 过渡配置
   */
  exit(transition?: LayoutTransition): Promise<void>;
  
  /**
   * 获取区域配置
   * @param slot - 区域名称
   */
  getSlotConfig?(slot: SlotName): SlotConfig | undefined;
  
  /**
   * 设置区域折叠状态
   * @param slot - 区域名称
   * @param collapsed - 是否折叠
   */
  setSlotCollapsed?(slot: SlotName, collapsed: boolean): void;
}

/** 布局母版构造函数 */
export interface LayoutMasterConstructor {
  new (container: HTMLElement, config?: LayoutConfig): LayoutMaster;
}

// ============================================================================
// 场景接口
// ============================================================================

/** 场景接口
 * 
 * 每个物理演示场景实现此接口
 */
export interface Scene {
  /** 场景ID */
  readonly id: string;
  
  /** 首选布局ID */
  readonly preferredLayout: string;
  
  /**
   * 渲染控制区域
   * @param container - 控制区域容器
   */
  renderControl(container: HTMLElement): void;
  
  /**
   * 渲染动画区域
   * @param container - 动画区域容器
   */
  renderAnimation(container: HTMLElement): void;
  
  /**
   * 渲染图表区域 (可选)
   * @param container - 图表区域容器
   */
  renderGraph?(container: HTMLElement): void;
  
  /**
   * 渲染数据读数区域 (可选)
   * @param container - 读数区域容器
   */
  renderReadout?(container: HTMLElement): void;
  
  /**
   * 渲染头部区域 (可选)
   * @param container - 头部区域容器
   */
  renderHeader?(container: HTMLElement): void;
  
  /**
   * 布局即将切换回调
   * @param from - 源布局ID
   * @param to - 目标布局ID
   * @returns Promise，等待完成后再切换
   */
  onLayoutWillChange?(from: string, to: string): Promise<void>;
  
  /**
   * 布局切换完成回调
   * @param to - 当前布局ID
   */
  onLayoutDidChange?(to: string): void;
  
  /**
   * 保存场景状态
   * @returns 状态对象
   */
  saveState?(): object;
  
  /**
   * 恢复场景状态
   * @param state - 状态对象
   */
  restoreState?(state: object): void;
  
  /**
   * 场景挂载
   * 在场景首次显示时调用
   */
  mount?(): void;
  
  /**
   * 场景卸载
   * 清理资源
   */
  unmount?(): void;
}

// ============================================================================
// 场景容器接口
// ============================================================================

/** 场景容器接口
 * 
 * 管理场景和布局的协调
 */
export interface SceneContainer {
  /** 当前布局 */
  readonly currentLayout: LayoutMaster | null;
  
  /** 当前场景 */
  readonly currentScene: Scene | null;
  
  /** 容器元素 */
  readonly container: HTMLElement;
  
  /**
   * 设置场景
   * @param scene - 场景实例
   */
  setScene(scene: Scene): void;
  
  /**
   * 切换布局
   * @param layoutId - 布局ID
   * @param options - 切换选项
   */
  switchLayout(layoutId: string, options?: SwitchOptions): Promise<void>;
  
  /**
   * 设置用户偏好的布局
   * @param layoutId - 布局ID
   */
  setUserPreferredLayout(layoutId: string): void;
  
  /**
   * 获取用户偏好的布局
   */
  getUserPreferredLayout(): string | null;
  
  /**
   * 设置主题
   * @param theme - 主题
   */
  setTheme(theme: Theme): void;
  
  /**
   * 获取当前主题
   */
  getTheme(): Theme;
  
  /**
   * 保存状态到 localStorage
   */
  persistState(): void;
  
  /**
   * 从 localStorage 恢复状态
   */
  restorePersistedState(): void;
  
  /**
   * 销毁容器
   */
  dispose(): void;
}

// ============================================================================
// 布局配置类型
// ============================================================================

/** 布局配置 */
export interface LayoutConfig {
  /** 主题 */
  theme?: Theme;
  /** 区域配置 */
  slots?: Partial<Record<SlotName, SlotConfig>>;
  /** 移动端断点 */
  mobileBreakpoint?: number;
  /** 平板断点 */
  tabletBreakpoint?: number;
}

/** 创建容器选项 */
export interface CreateContainerOptions {
  /** 挂载元素 */
  mount: HTMLElement;
  /** 默认布局ID */
  defaultLayout?: string;
  /** 默认主题 */
  defaultTheme?: Theme;
  /** 持久化键名 */
  storageKey?: string;
  /** 尺寸变化回调 */
  onResize?: (width: number, height: number) => void;
  /** 布局配置 */
  layoutConfig?: Record<string, unknown>;
}

// ============================================================================
// 数据类型
// ============================================================================

/** 读数项 */
export interface ReadoutItem {
  label: string;
  value: string | number;
  unit?: string;
  /** 布局: half=半宽, full=全宽 */
  layout?: 'half' | 'full';
}

/** 头部配置 */
export interface HeaderConfig {
  title: string;
  subtitle?: string;
  /** 操作按钮 */
  actions?: ('theme' | 'mode' | 'fullscreen')[];
}

/** Canvas 配置 */
export interface CanvasConfig {
  width?: number;
  height?: number;
  /** 是否自适应容器 */
  autoResize?: boolean;
}

// ============================================================================
// 事件类型
// ============================================================================

/** 布局变更事件 */
export interface LayoutChangeEvent {
  from: string | null;
  to: string;
  reason?: string;
}

/** 主题变更事件 */
export interface ThemeChangeEvent {
  from: Theme;
  to: Theme;
}

/** 场景容器事件映射 */
export interface SceneContainerEvents {
  'layout:change': LayoutChangeEvent;
  'theme:change': ThemeChangeEvent;
  'scene:mount': { sceneId: string };
  'scene:unmount': { sceneId: string };
  'slot:toggle': { slot: SlotName; collapsed: boolean };
}
