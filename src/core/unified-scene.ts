/**
 * 统一场景框架
 * 所有物理演示场景的标准接口和基础实现
 */

import { CanvasContext, createCanvasContext } from './unified-canvas';
import { createUnifiedControls, ControlActions, ParamConfig } from './unified-controls';
import { getThemeColors } from './colors';

export interface SceneState {
  t: number;
  running: boolean;
  paused: boolean;
  completed: boolean;
  data: Record<string, unknown>;
}

export type StateListener = (state: SceneState) => void;

export interface SceneMountOptions {
  mount: HTMLElement;
  title: string;
  subtitle: string;
  params: ParamConfig[];
  initialData?: Record<string, unknown>;
}

export interface UnifiedScene {
  mount(options: SceneMountOptions): void;
  unmount(): void;
  play(): void;
  pause(): void;
  reset(): void;
  step(): void;
  getState(): SceneState;
  setTheme(theme: 'light' | 'dark'): void;
}

export interface SceneHooks {
  onInit?: () => void;
  onUpdate?: (dt: number, state: SceneState) => void;
  onRender?: (ctx: CanvasRenderingContext2D, width: number, height: number, state: SceneState) => void;
  onReset?: () => void;
  onParamChange?: (key: string, value: unknown) => void;
  onDispose?: () => void;
}

export interface SceneOptions {
  title: string;
  subtitle: string;
  params: ParamConfig[];
  hooks: SceneHooks;
}

/**
 * 创建标准化物理场景
 * 
 * 使用示例:
 * ```typescript
 * const scene = createUnifiedScene({
 *   title: '抛体运动',
 *   subtitle: 'Projectile Motion',
 *   params: [
 *     { key: 'v0', label: '初速度', type: 'slider', value: 50, min: 10, max: 100, unit: 'm/s' },
 *     { key: 'angle', label: '抛射角', type: 'slider', value: 45, min: 0, max: 90, unit: '°' }
 *   ],
 *   hooks: {
 *     onRender: (ctx, w, h, state) => {
 *       // 自定义渲染
 *     }
 *   }
 * });
 * 
 * scene.mount({ mount: container });
 * ```
 */
export function createUnifiedScene(options: SceneOptions): UnifiedScene {
  const { title, subtitle, params, hooks } = options;
  
  // 内部状态
  let container: HTMLElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let canvasCtx: CanvasContext | null = null;
  let controls: ReturnType<typeof createUnifiedControls> | null = null;
  let animationId: number | null = null;
  let lastTime = 0;
  let theme: 'light' | 'dark' = 'light';
  
  const state: SceneState = {
    t: 0,
    running: false,
    paused: false,
    completed: false,
    data: {}
  };
  
  const listeners = new Set<StateListener>();
  
  function notifyStateChange() {
    listeners.forEach(cb => cb(state));
  }
  
  function update(dt: number) {
    if (!state.running || state.paused) return;
    
    state.t += dt;
    hooks.onUpdate?.(dt, { ...state });
    notifyStateChange();
  }
  
  function render() {
    if (!canvasCtx) return;
    
    const { ctx, width, height } = canvasCtx;
    const colors = getThemeColors(theme);
    
    // 清空画布
    ctx.fillStyle = colors.canvasBg;
    ctx.fillRect(0, 0, width, height);
    
    // 调用自定义渲染
    hooks.onRender?.(ctx, width, height, { ...state });
  }
  
  function loop(timestamp: number) {
    const dt = lastTime ? (timestamp - lastTime) / 1000 : 0;
    lastTime = timestamp;
    
    update(dt);
    render();
    
    animationId = requestAnimationFrame(loop);
  }
  
  return {
    mount(options: SceneMountOptions) {
      const { mount } = options;
      container = mount;
      
      // 创建布局容器
      const wrapper = document.createElement('div');
      wrapper.className = 'unified-scene';
      wrapper.style.cssText = `
        display: grid;
        /* 侧边栏:舞台 ≈ 22%:78%，8px分隔 */
        grid-template-columns: minmax(240px, 300px) 8px 1fr;
        height: 100%;
        min-height: 600px;
        background: ${getThemeColors(theme).background};
      `;
      
      // 左侧控制面板 - 优化内边距
      const sidebar = document.createElement('div');
      sidebar.style.cssText = `
        grid-column: 1;
        padding: 16px;
        border-right: 1px solid ${getThemeColors(theme).border};
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
      `;
      
      // 分隔条
      const resizer = document.createElement('div');
      resizer.style.cssText = `
        grid-column: 2;
        width: 8px;
        cursor: col-resize;
        background: transparent;
        transition: background 0.2s;
      `;
      
      // 右侧Canvas区域
      const stage = document.createElement('div');
      stage.style.cssText = `
        grid-column: 3;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      `;
      
      // 创建Canvas
      canvas = document.createElement('canvas');
      canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      `;
      stage.appendChild(canvas);
      
      wrapper.appendChild(sidebar);
      wrapper.appendChild(resizer);
      wrapper.appendChild(stage);
      container.appendChild(wrapper);
      
      // 初始化Canvas上下文
      canvasCtx = createCanvasContext(canvas);
      
      // 创建控制面板
      const actions: ControlActions = {
        onPlay: () => this.play(),
        onPause: () => this.pause(),
        onReset: () => this.reset(),
        onParamChange: (key, value) => {
          hooks.onParamChange?.(key, value);
        }
      };
      
      controls = createUnifiedControls({
        container: sidebar,
        title,
        subtitle,
        params,
        actions,
        showPlaybackControls: true
      });
      
      // 初始化
      hooks.onInit?.();
      
      // 开始动画循环
      animationId = requestAnimationFrame(loop);
      
      // 响应式调整
      const resizeObserver = new ResizeObserver(() => {
        if (canvas) {
          canvasCtx = createCanvasContext(canvas);
        }
      });
      resizeObserver.observe(stage);
      
      // 保存清理函数
      (this as unknown as { _cleanup: () => void })._cleanup = () => {
        resizeObserver.disconnect();
      };
    },
    
    unmount() {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      
      controls?.dispose();
      controls = null;
      
      hooks.onDispose?.();
      
      const cleanup = (this as unknown as { _cleanup?: () => void })._cleanup;
      cleanup?.();
      
      if (container) {
        container.innerHTML = '';
        container = null;
      }
      
      canvas = null;
      canvasCtx = null;
    },
    
    play() {
      state.running = true;
      state.paused = false;
      notifyStateChange();
    },
    
    pause() {
      state.paused = true;
      notifyStateChange();
    },
    
    reset() {
      state.t = 0;
      state.running = false;
      state.paused = false;
      state.completed = false;
      lastTime = 0;
      hooks.onReset?.();
      notifyStateChange();
      render();
    },
    
    step() {
      update(0.016); // 假设 60fps
      render();
    },
    
    getState() {
      return { ...state };
    },
    
    setTheme(newTheme: 'light' | 'dark') {
      theme = newTheme;
      render();
    }
  };
}
