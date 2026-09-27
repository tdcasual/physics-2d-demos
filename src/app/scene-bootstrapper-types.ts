/**
 * 场景引导器类型定义
 *
 * SceneInstance 和 ScenePageOptions 的独立类型文件，
 * 避免循环导入并提高编译性能。
 */

import type {
  Theme,
  LayoutSlots,
  ReadoutItem,
  TransportState
} from './layouts/types';
import type { SceneMeta } from '../platform/scene-contract';
import type {
  DemoRenderHints,
  SceneDemoProfile
} from '../platform/demo-profile';

/** 场景实例接口（场景实现方提供） */
export type SceneInstance = {
  init(): void;
  resize(): void;
  render(): void;
  dispose(): void;
  setTheme(theme: Theme): void;
  setMode(mode: 'normal' | 'presentation'): void;
  step(dt: number): void;
  reset?(): void;
  startAll?(): void;
  pauseAll?(): void;
  setTimeScale?(scale: number): void;
  getTimeScale?(): number;
  getState?(): unknown;
  getSnapshot?(): unknown;
  getReadoutItems?(): ReadoutItem[];
  getDataWorkspace?():
    | import('../platform/data-workspace').DataWorkspaceHost
    | null;
  getTransportState?(): TransportState;
  subscribe?(listener: () => void): () => void;
  /**
   * 入口级 live 参数，供 remount / reset 控件投影读取。
   * 具体场景返回 typed params 对象；平台按 key/value bag 消费。
   */
  getParams?(): Record<string, unknown>;
  /** 布局切换时把渲染面绑到新槽，禁止 dispose+init。 */
  reattach?(opts: {
    container: HTMLElement;
    canvas?: HTMLCanvasElement;
    slots: LayoutSlots;
  }): void;
  attachStageSlot?(slot: HTMLElement): void;
  attachGraphSlot?(slot: HTMLElement): void;
  attachGraphCanvas?(canvas: HTMLCanvasElement): void;
  renderGraph?(container: HTMLElement): void;
};

/**
 * 场景创建标准参数契约
 *
 * 所有 createScene 回调都会收到这些参数。每个场景的 entry 工厂函数
 * 必须能接受此类型（或兼容的超集），否则在类型测试中会报错。
 */
export type SceneParamWriter = {
  readonly token: string;
  write(patch: Record<string, number | string | boolean | undefined>): void;
  flush(): void;
  close(): void;
};

export type StandardSceneCreateParams = {
  /** 动画区容器（渲染面）。非 canvas 渲染（SVG/DOM/WebGL 等）直接渲染到此容器。 */
  container: HTMLElement;
  /** 动画区内的 canvas（canvas 类场景使用）；非 canvas 渲染时为 undefined。 */
  canvas?: HTMLCanvasElement;
  slots: LayoutSlots;
  theme: Theme;
  mode: 'normal' | 'presentation';
  demoHints?: DemoRenderHints;
  /**
   * Optional scene-generation URL writer. Production SceneAdapter always
   * injects one before createScene; omitted only for hand-built tests.
   */
  sceneWriter?: SceneParamWriter;
};

/** 场景页面配置选项 */
export type ScenePageOptions<TScene extends SceneInstance = SceneInstance> = {
  /** 场景元数据 */
  meta: SceneMeta;
  /** 首选布局 ID */
  preferredLayout?: string;
  /** 布局配置 */
  layoutConfig?: Record<string, unknown>;
  /** 演示配置（默认从 meta.demoProfile 读取） */
  demoProfile?: SceneDemoProfile;
  /** Esc 等走容器 setMode，避免 Adapter 再派一次无 profile 的事件 */
  onSetMode?: (mode: 'normal' | 'presentation') => void;
  /** Keyboard `l` walks the container switch, not a DOM button click. */
  onSwitchLayout?: () => void;
  /** Production adapter injects the generation-scoped URL writer. */
  sceneWriter?: SceneParamWriter;
  /** 创建场景实例 */
  createScene: (opts: StandardSceneCreateParams) => TScene;
  /** 创建控制面板（可选） */
  createControls?: (opts: {
    mount: HTMLElement;
    scene: TScene;
    onStatus?: (text: string) => void;
    /**
     * rAF 合帧渲染请求（由 bootstrapper 注入）：同帧内多次调用合并为一次
     * scene.render()。控制面板内的参数变更（滑块 input、预设/场景切换）
     * 应优先用它替代直接 scene.render()；需要立即出帧的场景
     * （URL 参数应用后的首绘、transport 单步）仍保留同步 render。
     * 可选：未注入时（如单测直接调用）页面应回退为同步 render。
     */
    scheduleRender?: () => void;
    /**
     * 当前 URL 中的合法场景参数（readSceneParams 结果，bootstrapper 注入）。
     * 一般参数应用由 bootstrapper 的 URL 参数管线自动完成，页面无需消费；
     * 仅供创建面板前必须知悉参数的场景使用（如 double-slit 按 step 选 schema）。
     */
    urlParams?: Record<string, number | string>;
    /**
     * 参数变更写回 URL（debounced，bootstrapper 注入），等价旧样板的
     * writeSceneParams({ [key]: value })，但仅当 key 属于
     * defaultParams ∪ urlSyncKeys ∪ {preset} 时真正写入，其余静默忽略
     * （不可读的 key 写了也无法恢复）。
     */
    writeParam?: (key: string, value: number | string | boolean) => void;
    /**
     * Scene-generation URL writer. Same instance as createScene's
     * `sceneWriter`; layout remount reuses it.
     */
    sceneWriter?: SceneParamWriter;
  }) => unknown;
  /**
   * 声明式 URL 参数同步（可选逃生口）。缺省时 bootstrapper 按
   * defaultParams ∪ urlSyncKeys 自动应用 URL 参数并回写控制面板。
   */
  paramSync?: SceneParamSync<TScene>;
  /** 格式化读数数据（可选，若场景提供 getReadoutItems 则不需要） */
  formatReadout?: (state: unknown) => ReadoutItem[];
  /** 步进间隔（秒），默认 1/60 */
  stepSeconds?: number;
  /** 最大子步数，默认 5 */
  maxSubSteps?: number;
  /** 场景挂载后自动播放动画，默认 false */
  autoPlay?: boolean;
  /**
   * 主题切换回调（可选）。由 bootstrapper 注入 container.setTheme，
   * 让 `t` 快捷键走 container 统一路径（状态同步 + 持久化）；
   * 未提供时 `t` 快捷键退回直接改 DOM 的旧行为。
   */
  onToggleTheme?: (next: Theme) => void;
};

/**
 * URL 参数应用上下文（paramSync 钩子用）
 *
 * 由 bootstrapper 在 createControls 返回后构造，供场景专用钩子
 * 操作场景实例与控制面板句柄。
 */
export type ParamSyncContext<TScene extends SceneInstance = SceneInstance> = {
  /** 场景实例 */
  scene: TScene;
  /** 控制面板挂载点（DOM 联动用） */
  mount: HTMLElement;
  /** createControls 返回的控制面板句柄（场景自定义方法可自行断言类型） */
  controls: unknown;
  /** 回写控制面板数值（句柄 setValue 代理；句柄未实现则静默跳过） */
  setControlValue: (key: string, value: number | string | boolean) => void;
  /** 回写控制面板激活态（句柄 setActive 代理；句柄未实现则静默跳过） */
  setControlActive: (key: string, value: string) => void;
  /** rAF 合帧渲染请求 */
  scheduleRender: () => void;
};

/**
 * 声明式 URL 参数同步配置（可选逃生口）
 *
 * 默认管线：readSceneParams → scene.setParams（无 setParams 时退回
 * setParam 单键 API）→ 控制面板句柄回写（数值 setValue / 字符串或
 * activeKeys 用 setActive）→ URL 非空时同步首绘。
 */
export type SceneParamSync<TScene extends SceneInstance = SceneInstance> = {
  /** meta 参数 key → 场景 setParams 参数 key 映射（如 projectile 的 v0→speed） */
  paramMap?: Record<string, string>;
  /** 这些 key 回写控制面板时用 setActive（预设组/选择器），而非 setValue */
  activeKeys?: string[];
  /**
   * 单参数自定义应用：返回 true 表示该 key 已完全处理
   * （含场景设置与控制面板回写），跳过默认管线对该 key 的处理。
   * 接收的 value 已按 readSceneParams 规则解析（数值/字符串）。
   */
  applyParam?: (
    key: string,
    value: number | string,
    ctx: ParamSyncContext<TScene>
  ) => boolean;
  /**
   * 整体接管 URL 参数应用：返回 true 表示已全部处理（含首绘时机），
   * 跳过默认管线与首绘。用于需要批量 setParams（约束/联动）或
   * 依赖控制面板闭包做全量同步的场景。
   */
  applyAll?: (
    urlParams: Record<string, number | string>,
    ctx: ParamSyncContext<TScene>
  ) => boolean;
  /** 默认管线应用完所有参数后、首绘前调用（如回读约束系统调整后的实际值） */
  afterApply?: (ctx: ParamSyncContext<TScene>) => void;
  /**
   * 控件投影逃生口（scene → 面板）。paramMap 非单射或字段类型分派无法编码时使用。
   *
   * 语义（强制）：对 sim **只读**、**同步**、**不得**经 rAF / `scheduleRender` 延迟。
   * 通用投影器永不调用 applyAll / applyParam / afterApply，也不调用任何
   * scene setter 或 `scene.render()`。
   */
  projectControls?: (
    params: Record<string, unknown>,
    ctx: { handle: unknown }
  ) => void;
};
