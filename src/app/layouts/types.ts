/**
 * 布局母版系统 — 唯一类型定义源
 *
 * 所有布局相关的类型都在此文件定义。布局内部模块与外部消费者
 * （scene-adapter、场景 page 等）统一从本文件导入，不再存在第二个
 * 类型入口。
 *
 * 架构：Capability-based —— 布局通过声明 `capabilities` 列表，由容器
 * 自动装配读数面板、运输控制、主题/模式切换等可插拔能力。
 */

// ============================================================================
// 基础类型
// ============================================================================

export type Theme = 'light' | 'dark';

export type SlotName = 'header' | 'control' | 'animation' | 'graph' | 'readout';

/** Layout interaction model used by generic and capability-specific tests. */
export type LayoutInteractionModel =
  | 'tabs'
  | 'split'
  | 'stack'
  | 'fullscreen'
  | 'custom';

export interface LayoutTestViewport {
  width: number;
  height: number;
}

/** Declarative test capabilities for a registered layout. */
export interface LayoutTestProfile {
  viewports: LayoutTestViewport[];
  interactionModel: LayoutInteractionModel;
  /** Adapter id used by custom interaction models. */
  adapter?: string;
  /** Whether graph content must be activated before it can be asserted. */
  requiresGraphActivation?: boolean;
  minStageWidth?: number;
  minStageHeight?: number;
  minGraphWidth?: number;
  minGraphHeight?: number;
}

export interface LayoutSlots {
  header?: HTMLElement;
  control: HTMLElement;
  animation: HTMLElement;
  graph?: HTMLElement;
  readout?: HTMLElement;
}

export interface SlotConfig {
  visible?: boolean;
  collapsed?: boolean;
  minSize?: number;
  maxSize?: number;
  defaultSize?: number;
}

export interface LayoutConfig {
  theme?: Theme;
  slots?: Partial<Record<SlotName, SlotConfig>>;
  mobileBreakpoint?: number;
  tabletBreakpoint?: number;
  /** 按布局 ID 覆盖共享配置，例如仅在 mobile-stack 中启用图表。 */
  layoutOverrides?: Record<string, Record<string, unknown>>;
  /** 由容器在布局切换时注入的上一布局的 canvas（避免 WebGL context 丢失） */
  preservedCanvas?: HTMLCanvasElement | null;
  /** 隐藏 transport 浮动控制条（适用于静态推导类场景） */
  hideTransport?: boolean;
  /** 场景标题（由 bootstrapper 注入），用于 canvas aria-label 等无障碍文本 */
  title?: string;
  __managedByContainer?: boolean;
}

export interface ReadoutItem {
  label: string;
  value: string | number;
  unit?: string;
  layout?: 'half' | 'full';
}

export interface TransportState {
  isPlaying: boolean;
  speed?: number;
  canReset?: boolean;
}

export type SceneStateListener = () => void;

// ============================================================================
// Capability 系统（新架构核心）
// ============================================================================

/** Capability 作用域 — container 作用域的能力在布局切换时保留，layout 作用域的会被销毁重建 */
export type CapabilityScope = 'container' | 'layout';

/** Capability 标识符列表 — 新增 Capability 只需添加到此数组，类型自动推导 */
export const CAPABILITY_IDS = [
  'transport-bar',
  'readout-panel',
  'demo-profile',
  'theme-toggle',
  'mode-toggle',
  'sidebar-toggle',
  'resizer',
  'debug-overlay',
  'layout-switch'
] as const;

/** Capability 标识符 — 从 CAPABILITY_IDS 自动推导 */
export type CapabilityId = (typeof CAPABILITY_IDS)[number];

/** Capability 上下文事件 */
export interface CapabilityEvents {
  modechange: {
    mode: 'normal' | 'presentation';
    profile?: import('../../platform/demo-profile').SceneDemoProfile | null;
  };
}

/** Capability 挂载上下文 — 提供能力运行所需的宿主信息 */
export interface CapabilityContext {
  /** 布局根容器元素 */
  container: HTMLElement;
  /** 当前主题 */
  getTheme(): Theme;
  /** 设置主题（触发 container + layout 同步） */
  setTheme(theme: Theme): void;
  /** 当前模式 */
  getMode(): 'normal' | 'presentation';
  /** 设置模式（触发 mode change 流程） */
  setMode(mode: 'normal' | 'presentation'): void;
  /** 切换到指定布局 */
  switchLayout(layoutId: string, savePreference?: boolean): void;
  /** 获取当前布局 ID */
  getCurrentLayoutId(): string;
  /** 获取所有可用布局 */
  getAvailableLayouts(): { id: string; name: string }[];
  /** 订阅宿主事件 */
  on<K extends keyof CapabilityEvents>(
    event: K,
    handler: (payload: CapabilityEvents[K]) => void
  ): () => void;
}

/** Capability 实例 — 挂载后返回 */
export interface CapabilityInstance<TData = unknown, TCallbacks = unknown> {
  /** 处理外部更新（readout 数据、transport 状态等） */
  update?(data: TData): void;
  /** 注入场景控制回调（transport-bar 等需要控制场景的能力使用） */
  setCallbacks?(callbacks: TCallbacks): void;
  /** 销毁清理 */
  dispose(): void;
}

/** Capability 定义 — 自包含的功能模块构造函数 */
export interface CapabilityDefinition<
  TConfig = unknown,
  TData = unknown,
  TCallbacks = unknown
> {
  readonly id: CapabilityId;

  /**
   * 挂载能力到布局
   * @param slots — 布局提供的 slot 映射
   * @param config — 能力配置
   * @param ctx — 宿主上下文
   */
  mount(
    slots: LayoutSlots,
    config: TConfig,
    ctx: CapabilityContext
  ): CapabilityInstance<TData, TCallbacks>;
}

// ============================================================================
// ILayout — 最小化核心布局接口
// ============================================================================

export interface ILayout {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly supportedSlots: SlotName[];

  /** 声明式能力列表 — 容器据此自动装配读数面板、运输控制等可插拔能力。 */
  readonly capabilities: CapabilityDeclaration[];

  mount(): Promise<LayoutSlots>;
  unmount(): Promise<void>;
  setTheme(theme: Theme): void;
  handleResize(width: number, height: number): void;
  /**
   * 布局切换进入动画。由容器在 switchLayout 装配新布局后调用。
   * 未实现则视为无动画（no-op）。
   */
  enter?(transition: LayoutTransition): Promise<void>;
  /**
   * 布局切换退出动画。由容器在 switchLayout 拆卸旧布局前调用。
   * 未实现则视为无动画（no-op）。
   */
  exit?(transition: LayoutTransition): Promise<void>;
  getSlots?(): Partial<LayoutSlots>;
  getLayoutState?(): Record<string, unknown>;
  restoreLayoutState?(state: Record<string, unknown>): void;
  updateStatus?(text: string, level?: string): void;
  /** 更新内部配置（实例池复用时调用） */
  _updateConfig?(config?: LayoutConfig): void;
}

// ============================================================================
// Scene 接口（保持现有设计，已有 role-based 分离的良好基础）
// ============================================================================

export interface Scene {
  readonly id: string;
  readonly preferredLayout: string;

  renderControl(container: HTMLElement): void;
  renderAnimation(container: HTMLElement, slots?: LayoutSlots): void;
  renderGraph?(container: HTMLElement): void;
  renderReadout?(container: HTMLElement): void;
  renderHeader?(container: HTMLElement): void;

  onLayoutWillChange?(from: string, to: string): Promise<void>;
  onLayoutDidChange?(to: string): void;

  saveState?(): object;
  restoreState?(state: object): void;
  mount?(): void;
  unmount?(): void;
  setTheme?(theme: Theme): void;
  setMode?(mode: 'normal' | 'presentation'): void;

  startAll?(): void;
  pauseAll?(): void;
  reset?(): void;
  setTimeScale?(scale: number): void;

  getTransportState?(): TransportState;
  getReadoutItems?(): ReadoutItem[];
  subscribe?(listener: SceneStateListener): () => void;
  getDemoProfile?():
    | import('../../platform/demo-profile').SceneDemoProfile
    | null;
}

// ============================================================================
// SceneContainer 接口
// ============================================================================

export interface SceneContainer {
  readonly currentLayout: ILayout | null;
  readonly currentScene: Scene | null;
  readonly container: HTMLElement;

  setScene(scene: Scene): Promise<void>;
  switchLayout(layoutId: string, options?: SwitchOptions): Promise<void>;
  setUserPreferredLayout(layoutId: string): void;
  getUserPreferredLayout(): string | null;
  setTheme(theme: Theme): void;
  getTheme(): Theme;

  on<K extends keyof SceneContainerEvents>(
    event: K,
    listener: (payload: SceneContainerEvents[K]) => void
  ): () => void;

  persistState(): void;
  restorePersistedState(): void;
  dispose(): void;
}

// ============================================================================
// 辅助类型
// ============================================================================

export interface LayoutTransition {
  type: 'fade' | 'slide' | 'scale' | 'none';
  duration: number;
  easing: string;
}

export interface SwitchOptions {
  reason?: string;
  animate?: boolean;
  transition?: LayoutTransition;
  savePreference?: boolean;
}

export interface CreateContainerOptions {
  mount: HTMLElement;
  defaultLayout?: string;
  defaultTheme?: Theme;
  storageKey?: string;
  onResize?: (width: number, height: number) => void;
  layoutConfig?: Record<string, unknown>;
}

export interface LayoutChangeEvent {
  from: string | null;
  to: string;
  reason?: string;
}

export interface ThemeChangeEvent {
  from: Theme;
  to: Theme;
}

export type SceneContainerEvents = {
  'layout:change': LayoutChangeEvent;
  'theme:change': ThemeChangeEvent;
  'scene:mount': { sceneId: string };
  'scene:unmount': { sceneId: string };
  'scene:state': { scene: string; state: unknown };
  'layout:mode': {
    mode: string;
    profile?: import('../../platform/demo-profile').SceneDemoProfile | null;
  };
  'slot:toggle': { slot: SlotName; collapsed: boolean };
};

// ============================================================================
// ILayout 构造器类型
// ============================================================================

export interface ILayoutConstructor {
  new (container: HTMLElement, config?: LayoutConfig): ILayout;
}

// ============================================================================
// CapabilityDeclaration（实际声明结构）
// ============================================================================

export interface CapabilityDeclaration {
  id: CapabilityId;
  config?: unknown;
}
