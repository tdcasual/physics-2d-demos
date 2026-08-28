/**
 * 场景引导器 - 统一封装 SceneContainer 的创建与配置
 *
 * 将场景 page.ts 从 ~200 行缩减到 ~30 行。
 */

import '../styles/index.css';

import { createSceneContainer } from './layouts/container';
import { registerAllLayouts } from './layouts/auto-register';
import { layoutRegistry } from './layouts/registry';
import { SceneAdapter } from './scene-adapter';
import { restoreSceneParams, persistSceneParams } from './url-sync';
import { createRenderScheduler } from './render-scheduler';
import type { RenderScheduler } from './render-scheduler';
import {
  getStoredTheme,
  resolveThemePreference,
  resolveSystemTheme,
  storeTheme
} from './theme-store';
import type {
  SceneInstance,
  ScenePageOptions
} from './scene-bootstrapper-types';

export type {
  SceneInstance,
  ScenePageOptions
} from './scene-bootstrapper-types';
export { SceneAdapter } from './scene-adapter';

/**
 * 将 scheduler 的 dispose 合并进控制面板返回值：
 * adapter 只对 createControls 的返回值调用 dispose()，
 * 包装后可同时收口 scheduler 挂起的 rAF。
 */
function attachSchedulerDispose(
  controls: unknown,
  scheduler: RenderScheduler
): unknown {
  if (
    controls !== null &&
    (typeof controls === 'object' || typeof controls === 'function')
  ) {
    const target = controls as { dispose?: () => void };
    const originalDispose = target.dispose;
    target.dispose = () => {
      scheduler.dispose();
      originalDispose?.call(controls);
    };
    return controls;
  }
  // 控制面板未返回句柄时仍要收口 scheduler
  return { dispose: () => scheduler.dispose() };
}

/**
 * 统一启动场景页面
 *
 * @param options - 场景配置
 * @param mountSelector - 挂载目标选择器，默认 '#app'
 */
export function bootScenePage<TScene extends SceneInstance>(
  options: ScenePageOptions<TScene>,
  mountSelector: string = '#app'
): void {
  // 主题解析优先级：?theme= 参数 > theme-store 存储（system 取系统偏好）> 系统偏好
  const requestedTheme = new URLSearchParams(window.location.search).get(
    'theme'
  );
  const storedTheme = getStoredTheme();
  const defaultTheme =
    requestedTheme === 'dark' || requestedTheme === 'light'
      ? requestedTheme
      : storedTheme
        ? resolveThemePreference(storedTheme)
        : resolveSystemTheme();
  document.documentElement.setAttribute('data-theme', defaultTheme);

  // 恢复之前保存的参数（URL 无参数时）
  restoreSceneParams(options.meta.id);

  const mount = document.querySelector(mountSelector) as HTMLElement | null;
  if (!mount) {
    throw new Error(`Missing mount container: ${mountSelector}`);
  }

  // 统一注册所有布局（幂等）
  registerAllLayouts();

  // Test and debugging entry point: only registered layouts are accepted.
  const requestedLayout = new URLSearchParams(window.location.search).get(
    'layout'
  );
  const preferredLayout =
    requestedLayout && layoutRegistry.has(requestedLayout)
      ? requestedLayout
      : options.preferredLayout;

  mount.dataset.sceneId = options.meta.id;
  mount.dataset.sceneHasGraph = String(
    options.meta.testProfile?.hasGraph ?? false
  );

  // 创建场景容器
  const container = createSceneContainer({
    mount,
    defaultLayout: preferredLayout ?? 'split-right',
    defaultTheme,
    layoutConfig: {
      ...options.layoutConfig,
      title: options.meta.title
    }
  });

  // 场景页主题切换统一持久化到 theme-store（全站单一事实源，
  // 首页 useTheme 与场景页防闪烁脚本读取同一个 key）
  container.on('theme:change', ({ to }) => storeTheme(to));

  // 创建场景适配器（注入主题切换回调，让 t 快捷键走 container 统一路径）
  // createControls 包装：为控制面板注入 rAF 合帧渲染（scheduleRender），
  // 滑块 input 高频触发时同帧只渲染一次；dispose 随控制面板返回值收口。
  const userCreateControls = options.createControls;
  const adapter = new SceneAdapter<TScene>(
    {
      ...options,
      preferredLayout,
      createControls: userCreateControls
        ? (controlOpts) => {
            const scheduler = createRenderScheduler(() => {
              controlOpts.scene.render();
            });
            const controls = userCreateControls({
              ...controlOpts,
              scheduleRender: scheduler.schedule
            });
            return attachSchedulerDispose(controls, scheduler);
          }
        : undefined,
      onToggleTheme: (next) => container.setTheme(next)
    },
    (text) => container.currentLayout?.updateStatus?.(text)
  );

  // 设置场景
  container.setScene(adapter).catch((err) => {
    console.error('[bootScenePage] setScene failed:', err);
  });

  // 页面离开前持久化参数
  window.addEventListener(
    'beforeunload',
    () => {
      persistSceneParams(options.meta.id);
    },
    { once: true }
  );
}
