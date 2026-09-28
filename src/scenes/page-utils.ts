/**
 * 场景 page.ts 可重用工具
 *
 * 提取多个场景中重复的参数映射和预设应用逻辑，
 * 使 page.ts 更薄、更易测试。
 */

/**
 * 创建参数映射器：将控制面板的 key 映射到场景参数 key。
 *
 * @param mapping - 控制 key → 场景参数 key 的映射表
 * @param onApply - 应用参数的回调
 * @returns 可直接传给 renderSchema onChange 的处理函数
 */
export function createParamMapper<TParams extends Record<string, unknown>>(
  mapping: Record<string, string>,
  onApply: (params: Partial<TParams>) => void
): (key: string, value: unknown) => void {
  return (key: string, value: unknown) => {
    const paramKey = mapping[key];
    if (paramKey) {
      onApply({ [paramKey]: value } as Partial<TParams>);
    }
  };
}

/**
 * 创建预设应用器：根据预设 ID 查找并应用参数。
 *
 * @param presets - 预设 ID → 参数 Partial 的映射表
 * @param onApply - 应用参数的回调
 * @param onAfterApply - 应用后的可选回调（如 reset + render）
 * @returns 可直接在 onChange 中调用的处理函数
 */
export function createPresetApplier<TParams>(
  presets: Record<string, Partial<TParams>>,
  onApply: (params: Partial<TParams>) => void,
  onAfterApply?: () => void
): (presetId: string) => boolean {
  return (presetId: string) => {
    const params = presets[presetId];
    if (params) {
      onApply(params);
      onAfterApply?.();
      return true;
    }
    return false;
  };
}

/**
 * Double-rAF chrome scheduler used by mechanical-energy and
 * projectile-components data panels. Shared so H2 a11y attributes on wrap
 * stay local to each panel; this helper never rewrites wrap cssText.
 */
export function createChromeScheduler(run: () => void): {
  start(): void;
  dispose(): void;
} {
  let disposed = false;
  let raf1 = 0;
  let raf2 = 0;
  const cancelBoth = (): void => {
    if (raf1) window.cancelAnimationFrame(raf1);
    if (raf2) window.cancelAnimationFrame(raf2);
    raf1 = 0;
    raf2 = 0;
  };
  const guarded = (): void => {
    if (disposed) return;
    run();
  };
  return {
    start() {
      if (disposed) return;
      cancelBoth();
      raf1 = window.requestAnimationFrame(() => {
        raf1 = 0;
        if (disposed) return;
        guarded();
        if (disposed) return;
        raf2 = window.requestAnimationFrame(() => {
          raf2 = 0;
          if (disposed) return;
          guarded();
        });
      });
    },
    dispose() {
      disposed = true;
      cancelBoth();
    }
  };
}
