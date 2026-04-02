/**
 * 场景生命周期管理工具
 * 提供统一的场景初始化、resize 处理和资源清理
 */

export interface SceneLifecycle {
  init(): void;
  reset(): void;
  step(dt: number): void;
  render(): void;
  resize(): void;
  dispose(): void;
}

export interface SceneWithMode extends SceneLifecycle {
  setMode(mode: 'normal' | 'presentation'): void;
  setTheme(theme: 'dark' | 'light'): void;
}

export interface SceneInitOptions {
  /** 场景实例 */
  scene: SceneLifecycle;
  /** 容器挂载点 */
  mount: HTMLElement;
  /** 是否需要立即播放 */
  autoPlay?: boolean;
  /** 初始化完成回调 */
  onReady?: () => void;
}

/**
 * 标准化场景初始化流程
 * 顺序: init -> resize -> render
 * 确保 canvas 尺寸正确后再渲染
 */
export function initializeScene(options: SceneInitOptions): () => void {
  const { scene, onReady } = options;
  
  // 标准初始化顺序
  scene.init();
  scene.resize();
  scene.render();
  
  onReady?.();
  
  // 返回清理函数
  return () => scene.dispose();
}

/**
 * 创建 ResizeObserver 监听容器变化
 * 自动调用 scene.resize() 和 scene.render()
 */
export function observeContainerResize(
  container: HTMLElement,
  scene: SceneLifecycle,
  options?: {
    /** 防抖延迟 (ms) */
    debounceMs?: number;
    /** 是否自动渲染 */
    autoRender?: boolean;
  }
): () => void {
  const { debounceMs = 100, autoRender = true } = options ?? {};
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  
  const handleResize = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      scene.resize();
      if (autoRender) {
        scene.render();
      }
    }, debounceMs);
  };
  
  // 优先使用 ResizeObserver
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => handleResize());
    ro.observe(container);
    return () => {
      ro.disconnect();
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }
  
  // Fallback: 使用 window resize
  window.addEventListener('resize', handleResize);
  return () => {
    window.removeEventListener('resize', handleResize);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  };
}

/**
 * 创建页面生命周期管理器
 * 统一处理事件监听和资源清理
 */
export function createPageLifecycleManager() {
  const disposers: Array<() => void> = [];
  
  return {
    /** 注册清理函数 */
    onDispose(fn: () => void): void {
      disposers.push(fn);
    },
    
    /** 注册 ResizeObserver */
    observeResize(
      container: HTMLElement,
      scene: SceneLifecycle,
      options?: { debounceMs?: number; autoRender?: boolean }
    ): void {
      const cleanup = observeContainerResize(container, scene, options);
      disposers.push(cleanup);
    },
    
    /** 注册 window 事件 */
    onWindowEvent<K extends keyof WindowEventMap>(
      type: K,
      listener: (ev: WindowEventMap[K]) => any,
      options?: boolean | AddEventListenerOptions
    ): void {
      window.addEventListener(type, listener, options);
      disposers.push(() => window.removeEventListener(type, listener, options));
    },
    
    /** 清理所有资源 */
    dispose(): void {
      disposers.forEach(fn => {
        try { fn(); } catch (e) { /* ignore */ }
      });
      disposers.length = 0;
    },
  };
}

/**
 * 验证场景实现是否符合生命周期契约
 */
export function validateSceneContract(scene: Partial<SceneLifecycle>): string[] {
  const errors: string[] = [];
  const requiredMethods: Array<keyof SceneLifecycle> = [
    'init', 'reset', 'step', 'render', 'resize', 'dispose'
  ];
  
  for (const method of requiredMethods) {
    if (typeof scene[method] !== 'function') {
      errors.push(`Missing required method: ${method}`);
    }
  }
  
  return errors;
}
