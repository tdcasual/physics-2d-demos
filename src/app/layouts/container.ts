/**
 * 场景容器实现
 * 
 * 管理场景和布局的协调，处理布局切换、主题切换、状态持久化
 * 
 * @review-date 2026-04-02
 * @version 0.1.0
 */

import { layoutRegistry, saveLayoutPreference } from './registry';
import type {
  SceneContainer,
  Scene,
  LayoutMaster,
  Theme,
  SwitchOptions,
  LayoutTransition,
  LayoutChangeEvent,
  CreateContainerOptions,
  SceneContainerEvents
} from './types';

/** 事件监听器类型 */
type EventListener<T> = (payload: T) => void;

/** 场景容器实现类 */
export class SceneContainerImpl implements SceneContainer {
  readonly container: HTMLElement;
  
  private _currentLayout: LayoutMaster | null = null;
  private _currentScene: Scene | null = null;
  private _currentTheme: Theme = 'light';
  private _userPreferredLayout: string | null = null;
  private _storageKey: string;
  private _resizeObserver: ResizeObserver | null = null;
  private _onResize?: (width: number, height: number) => void;
  private _layoutConfig?: unknown;
  private _sceneUnsubscribers: (() => void)[] = [];
  private _layoutThemeHandler?: (e: Event) => void;
  private _layoutModeHandler?: (e: Event) => void;
  
  // 事件监听器映射
  private listeners: {
    [K in keyof SceneContainerEvents]?: EventListener<SceneContainerEvents[K]>[];
  } = {};
  
  constructor(options: CreateContainerOptions) {
    this.container = options.mount;
    this._storageKey = options.storageKey || 'physics-demos-container-state';
    this._onResize = options.onResize;
    this._currentTheme = options.defaultTheme || 'light';
    this._layoutConfig = (options as any).layoutConfig;
    
    // 设置容器样式
    this.container.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: relative;
    `;
    
    // 初始化 ResizeObserver
    this.initResizeObserver();
    
    // 尝试恢复持久化状态
    this.restorePersistedState();
  }
  
  // Getters
  get currentLayout(): LayoutMaster | null {
    return this._currentLayout;
  }
  
  get currentScene(): Scene | null {
    return this._currentScene;
  }
  
  /**
   * 设置场景
   * @param scene - 场景实例
   */
  async setScene(scene: Scene): Promise<void> {
    // 如果有旧场景，先卸载
    if (this._currentScene) {
      this.unmountCurrentScene();
    }
    
    this._currentScene = scene;
    
    // 确定使用哪个布局
    const layoutId = this._userPreferredLayout || scene.preferredLayout;
    
    // 如果当前布局与需要的布局不同，切换布局
    if (!this._currentLayout || this._currentLayout.id !== layoutId) {
      await this.switchLayout(layoutId, { animate: false });
    } else {
      this.mountScene(scene);
    }
  }
  
  /**
   * 挂载场景到当前布局
   */
  private mountScene(scene: Scene, layout?: LayoutMaster): void {
    const targetLayout = layout || this._currentLayout;
    if (!targetLayout) return;
    
    // 从布局实例获取已渲染的 slots（避免硬编码类名耦合）
    const slots = (targetLayout as { slots?: Record<string, HTMLElement | undefined> }).slots || {};
    
    // 渲染各区域
    if (slots.header && scene.renderHeader) {
      scene.renderHeader(slots.header);
    }
    
    if (slots.control && scene.renderControl) {
      scene.renderControl(slots.control);
    }
    
    if (slots.animation && scene.renderAnimation) {
      scene.renderAnimation(slots.animation);
    }
    
    if (slots.graph && scene.renderGraph) {
      scene.renderGraph(slots.graph);
    }
    
    if (slots.readout && scene.renderReadout) {
      scene.renderReadout(slots.readout);
    }
    
    // 恢复场景持久化状态
    const savedState = this.restoreSceneState(scene.id);
    if (savedState && scene.restoreState) {
      try {
        scene.restoreState(savedState);
      } catch (err) {
        console.error(`[SceneContainer] Failed to restore state for scene ${scene.id}:`, err);
      }
    }
    
    // 初始同步场景状态到布局
    this.syncSceneStateToLayout(scene, targetLayout);
    
    // 订阅场景状态变化，自动刷新布局
    if (scene.subscribe) {
      const unsubscribe = scene.subscribe(() => {
        this.syncSceneStateToLayout(scene);
      });
      this._sceneUnsubscribers.push(unsubscribe);
    }
    
    // 监听布局内部触发的主题/模式变化并转发给场景
    this._layoutThemeHandler = (e: Event) => {
      const custom = e as CustomEvent<{ theme: Theme }>;
      if (custom.detail?.theme && scene.setTheme) {
        scene.setTheme(custom.detail.theme);
      }
    };
    this._layoutModeHandler = (e: Event) => {
      const custom = e as CustomEvent<{ mode: 'normal' | 'presentation' }>;
      if (custom.detail?.mode && scene.setMode) {
        scene.setMode(custom.detail.mode);
      }
    };
    this.container.addEventListener('layout:themechange', this._layoutThemeHandler);
    this.container.addEventListener('layout:modechange', this._layoutModeHandler);
    
    // 如果布局支持浮动控制条，自动绑定场景运输控制
    interface LayoutWithFloatingControls extends LayoutMaster {
      setFloatingControls(options: {
        isPlaying?: () => boolean;
        onTogglePlay?: () => void;
        onReset?: () => void;
        onSpeedChange?: (speed: number) => void;
        getSpeed?: () => number;
      }): void;
    }
    const layoutWithControls = targetLayout as LayoutWithFloatingControls | null;
    if (layoutWithControls?.setFloatingControls && scene.getTransportState) {
      layoutWithControls.setFloatingControls({
        isPlaying: () => scene.getTransportState!().isPlaying,
        onTogglePlay: () => {
          const isPlaying = scene.getTransportState!().isPlaying;
          if (isPlaying) {
            scene.pauseAll?.();
          } else {
            scene.startAll?.();
          }
        },
        onReset: () => scene.reset?.(),
        onSpeedChange: (speed: number) => scene.setTimeScale?.(speed),
        getSpeed: () => scene.getTransportState!().speed ?? 1
      });
    }
    
    // 调用场景挂载生命周期
    scene.mount?.();
    
    // 触发事件
    this.emit('scene:mount', { sceneId: scene.id });
    

  }
  
  /**
   * 卸载当前场景
   */
  private unmountCurrentScene(): void {
    if (!this._currentScene) return;
    
    // 取消场景状态订阅
    this._sceneUnsubscribers.forEach(fn => fn());
    this._sceneUnsubscribers = [];
    
    // 移除布局事件监听
    if (this._layoutThemeHandler) {
      this.container.removeEventListener('layout:themechange', this._layoutThemeHandler);
      this._layoutThemeHandler = undefined;
    }
    if (this._layoutModeHandler) {
      this.container.removeEventListener('layout:modechange', this._layoutModeHandler);
      this._layoutModeHandler = undefined;
    }
    
    // 保存场景状态
    const state = this._currentScene.saveState?.();
    if (state) {
      this.saveSceneState(this._currentScene.id, state);
    }
    
    // 调用场景卸载生命周期
    this._currentScene.unmount?.();
    
    // 触发事件
    this.emit('scene:unmount', { sceneId: this._currentScene.id });
    
    this._currentScene = null;
  }
  
  /**
   * 切换布局
   */
  async switchLayout(layoutId: string, options: SwitchOptions = {}): Promise<void> {
    const {
      reason = 'manual',
      animate = true,
      transition = { type: 'fade', duration: 250, easing: 'ease-in-out' },
      savePreference = false
    } = options;
    
    // 检查是否已经是当前布局
    if (this._currentLayout?.id === layoutId) {
      console.log(`[SceneContainer] Already using layout: ${layoutId}`);
      return;
    }
    
    // 检查布局是否存在
    if (!layoutRegistry.has(layoutId)) {
      throw new Error(`Layout "${layoutId}" not found`);
    }
    
    const fromLayout = this._currentLayout;
    const fromId = fromLayout?.id || null;
    
    console.log(`[SceneContainer] Switching layout: ${fromId} -> ${layoutId}`);
    
    // 通知场景布局即将变化
    if (this._currentScene?.onLayoutWillChange) {
      await this._currentScene.onLayoutWillChange(fromId || '', layoutId);
    }
    
    // 退出当前布局动画
    if (fromLayout && animate) {
      await fromLayout.exit(transition);
    }
    
    // 卸载当前布局
    if (fromLayout) {
      await fromLayout.unmount();
    }
    
    // 清空容器
    this.container.innerHTML = '';
    
    let newLayout: LayoutMaster;
    try {
      // 创建并挂载新布局（事务准备阶段）
      newLayout = layoutRegistry.create(layoutId, this.container, {
        theme: this._currentTheme,
        ...(this._layoutConfig as Record<string, unknown> || {})
      });
      
      await newLayout.mount();
      newLayout.setTheme(this._currentTheme);
      
      // 如果有场景，重新渲染到新的布局
      if (this._currentScene) {
        this.mountScene(this._currentScene, newLayout);
      }
      
      // 进入动画
      if (animate) {
        const enterTransition: LayoutTransition = {
          ...transition,
          easing: 'ease-out'
        };
        await newLayout.enter(enterTransition);
      }
    } catch (err) {
      console.error(`[SceneContainer] Failed to switch to layout ${layoutId}:`, err);
      throw err;
    }
    
    // 事务提交：只有全部成功后，才更新当前布局引用
    this._currentLayout = newLayout;
    
    // 通知场景布局已变化
    this._currentScene?.onLayoutDidChange?.(layoutId);
    
    // 触发事件
    const event: LayoutChangeEvent = { from: fromId, to: layoutId, reason };
    this.emit('layout:change', event);
    
    // 保存用户偏好
    if (savePreference) {
      this.setUserPreferredLayout(layoutId);
    }
    
    console.log(`[SceneContainer] Switched to layout: ${layoutId}`);
  }
  
  /**
   * 设置用户偏好的布局
   */
  setUserPreferredLayout(layoutId: string): void {
    this._userPreferredLayout = layoutId;
    saveLayoutPreference(layoutId);
    this.persistState();
  }
  
  /**
   * 获取用户偏好的布局
   */
  getUserPreferredLayout(): string | null {
    return this._userPreferredLayout;
  }
  
  /**
   * 设置主题
   */
  setTheme(theme: Theme): void {
    if (this._currentTheme === theme) return;
    
    const fromTheme = this._currentTheme;
    this._currentTheme = theme;
    
    // 应用到当前布局
    this._currentLayout?.setTheme(theme);
    
    // 触发事件
    this.emit('theme:change', { from: fromTheme, to: theme });
    
    // 持久化状态
    this.persistState();
    
    console.log(`[SceneContainer] Theme changed: ${fromTheme} -> ${theme}`);
  }
  
  /**
   * 获取当前主题
   */
  getTheme(): Theme {
    return this._currentTheme;
  }
  
  /**
   * 保存状态到 localStorage
   */
  persistState(): void {
    try {
      const state = {
        theme: this._currentTheme,
        preferredLayout: this._userPreferredLayout,
        timestamp: Date.now()
      };
      localStorage.setItem(this._storageKey, JSON.stringify(state));
    } catch {
      // localStorage 不可用，忽略
    }
  }
  
  /**
   * 从 localStorage 恢复状态
   */
  restorePersistedState(): void {
    try {
      const saved = localStorage.getItem(this._storageKey);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.theme === 'light' || state.theme === 'dark') {
          this._currentTheme = state.theme;
        }
        if (state.preferredLayout && layoutRegistry.has(state.preferredLayout)) {
          this._userPreferredLayout = state.preferredLayout;
        }
      }
    } catch {
      // localStorage 不可用或数据损坏，忽略
    }
  }
  
  /**
   * 保存场景状态
   */
  private saveSceneState(sceneId: string, state: object): void {
    try {
      const key = `${this._storageKey}-scene-${sceneId}`;
      localStorage.setItem(key, JSON.stringify({
        state,
        timestamp: Date.now()
      }));
    } catch {
      // 忽略
    }
  }
  
  /**
   * 恢复场景状态
   */
  restoreSceneState(sceneId: string): object | null {
    try {
      const key = `${this._storageKey}-scene-${sceneId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const data = JSON.parse(saved);
        return data.state;
      }
    } catch {
      // 忽略
    }
    return null;
  }
  
  /**
   * 同步场景状态到当前布局
   */
  private syncSceneStateToLayout(scene: Scene, layout?: LayoutMaster): void {
    const targetLayout = layout || this._currentLayout;
    if (!targetLayout) return;
    
    if (targetLayout.updateReadout && scene.getReadoutItems) {
      targetLayout.updateReadout(scene.getReadoutItems());
    }
    
    if (targetLayout.updateTransportState && scene.getTransportState) {
      targetLayout.updateTransportState(scene.getTransportState());
    }
  }
  
  /**
   * 初始化 ResizeObserver
   */
  private initResizeObserver(): void {
    if (!window.ResizeObserver) return;
    
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        // 通知布局
        this._currentLayout?.handleResize(width, height);
        
        // 回调
        this._onResize?.(width, height);
      }
    });
    
    this._resizeObserver.observe(this.container);
  }
  
  /**
   * 添加事件监听
   */
  on<K extends keyof SceneContainerEvents>(
    event: K,
    listener: EventListener<SceneContainerEvents[K]>
  ): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
    
    // 返回取消订阅函数
    return () => {
      const list = this.listeners[event];
      if (list) {
        const index = list.indexOf(listener);
        if (index > -1) {
          list.splice(index, 1);
        }
      }
    };
  }
  
  /**
   * 触发事件
   */
  private emit<K extends keyof SceneContainerEvents>(
    event: K,
    payload: SceneContainerEvents[K]
  ): void {
    const list = this.listeners[event];
    if (list) {
      list.forEach(listener => {
        try {
          listener(payload);
        } catch (err) {
          console.error(`[SceneContainer] Event handler error for ${event}:`, err);
        }
      });
    }
  }
  
  /**
   * 获取当前布局的 slots
   * 通过查询 DOM 获取已渲染的槽位
   */
  // 已废弃：通过 layout.slots 直接获取槽位，避免硬编码类名耦合
  // private getLayoutSlots() { ... }
  
  /**
   * 销毁容器
   */
  dispose(): void {
    // 卸载场景
    this.unmountCurrentScene();
    
    // 卸载布局
    this._currentLayout?.unmount();
    this._currentLayout = null;
    
    // 断开 ResizeObserver
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    
    // 清空容器
    this.container.innerHTML = '';
    
    // 清空监听器
    this.listeners = {};
    
    console.log('[SceneContainer] Disposed');
  }
}

/**
 * 创建场景容器的便捷函数
 */
export function createSceneContainer(options: CreateContainerOptions): SceneContainer {
  return new SceneContainerImpl(options);
}
