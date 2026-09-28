/**
 * 场景引导器 - 统一封装 SceneContainer 的创建与配置
 *
 * 将场景 page.ts 从 ~200 行缩减到 ~30 行。
 */

import '../styles/index.css';

import { createSceneContainer } from './layouts/container';
import { registerAllLayouts } from './layouts/auto-register';
import { layoutRegistry } from './layouts/registry';
import { satisfiesConstraints } from './layouts/layout-constraints';
import { SceneAdapter } from './scene-adapter';
import {
  restoreSceneParams,
  persistSceneParams,
  resolveUrlSyncKeys,
  applySceneUrlParams
} from './url-sync';
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
import {
  paramsFromScene,
  syncControlsFromLiveParams
} from './control-projection';

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
  restoreSceneParams(options.meta);

  const mount = document.querySelector(mountSelector) as HTMLElement | null;
  if (!mount) {
    throw new Error(`Missing mount container: ${mountSelector}`);
  }

  // 统一注册所有布局（幂等）
  registerAllLayouts();

  // Test and debugging entry point: only registered layouts are accepted.
  // ?layout= 是强制档（选择策略 0，高于用户偏好），经容器 forceLayout 贯通；
  // 同时保留 scenePreference 注入作为旧消费方兼容。
  const requestedLayout = new URLSearchParams(window.location.search).get(
    'layout'
  );
  const forceLayout =
    requestedLayout && layoutRegistry.has(requestedLayout)
      ? requestedLayout
      : null;
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
    defaultTheme,
    forceLayout: forceLayout ?? undefined,
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
  // 同时注入 URL 参数管线：urlParams（只读快照）与 writeParam（合法键
  // 过滤后的写回），并在 createControls 返回后统一执行
  // readSceneParams → setParams → 句柄回写 → 首绘（applySceneUrlParams）。
  const userCreateControls = options.createControls;
  const writableKeys = resolveUrlSyncKeys(options.meta);
  const adapter = new SceneAdapter<TScene>(
    {
      ...options,
      preferredLayout,
      createControls: userCreateControls
        ? (controlOpts) => {
            const scheduler = createRenderScheduler(() => {
              controlOpts.scene.render();
            });
            const permit = adapter.takeUrlRestorePermit();
            let attached = false;
            try {
              const urlParams = permit.first ? { ...permit.snapshot } : {};
              const writer = adapter.getSceneWriter();
              const controls = userCreateControls({
                ...controlOpts,
                scheduleRender: scheduler.schedule,
                urlParams,
                writeParam: (key, value) => {
                  if (writableKeys.has(key)) {
                    writer?.write({ [key]: value });
                  }
                },
                sceneWriter: writer ?? undefined
              });
              if (permit.first) {
                try {
                  applySceneUrlParams(
                    options.meta,
                    {
                      scene: controlOpts.scene,
                      controls,
                      mount: controlOpts.mount,
                      scheduleRender: scheduler.schedule
                    },
                    options.paramSync,
                    urlParams
                  );
                  adapter.completeUrlRestore(true);
                } catch (err) {
                  adapter.completeUrlRestore(false);
                  throw err;
                }
              } else {
                syncControlsFromLiveParams({
                  params: paramsFromScene(controlOpts.scene),
                  handle: controls,
                  paramSync: options.paramSync
                });
              }
              const wrapped = attachSchedulerDispose(controls, scheduler);
              attached = true;
              return wrapped;
            } catch (err) {
              adapter.releaseUrlRestorePermit();
              throw err;
            } finally {
              if (!attached) scheduler.dispose();
            }
          }
        : undefined,
      onToggleTheme: (next) => container.setTheme(next),
      onSetMode: (mode) => container.setMode(mode),
      onSwitchLayout: () => {
        const current = container.currentLayout?.id;
        const w = container.container.clientWidth || window.innerWidth;
        const h = container.container.clientHeight || window.innerHeight;
        const orientation = w >= h ? 'landscape' : 'portrait';
        const ids = layoutRegistry
          .getAllMetadata()
          .filter((m) =>
            satisfiesConstraints(m, { width: w, height: h }, orientation)
          )
          .map((m) => m.id);
        if (ids.length === 0) return;
        const idx = current ? ids.indexOf(current) : -1;
        const next = ids[(idx + 1) % ids.length];
        if (next && next !== current) {
          // host 适配器已 surfaceSwitchError；此处只收口未处理 rejection。
          void Promise.resolve(
            container.switchLayout(next, {
              animate: true,
              savePreference: true
            })
          ).catch((err: unknown) => {
            console.error('[bootScenePage] switchLayout failed:', err);
          });
        }
      }
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
