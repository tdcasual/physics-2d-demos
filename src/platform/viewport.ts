/**
 * 视口工具
 * 提供响应式视口检测和舞台宽度计算
 */

/** 响应式视口信息 */
export type ResponsiveViewport = {
  /** 视口宽度（像素） */
  width: number;
  /** 视口高度（像素） */
  height: number;
  /** 是否为窄屏 */
  isNarrow: boolean;
};

function getViewportWidth(): number {
  const vv = window.visualViewport?.width;
  if (typeof vv === 'number' && Number.isFinite(vv) && vv > 0) {
    return vv;
  }
  return window.innerWidth;
}

function getViewportHeight(): number {
  const vv = window.visualViewport?.height;
  if (typeof vv === 'number' && Number.isFinite(vv) && vv > 0) {
    return vv;
  }
  return window.innerHeight;
}

/**
 * 获取响应式视口尺寸
 * @param narrowBreakpointPx - 窄屏断点（默认 1180px）
 * @returns 视口宽度和窄屏标记
 */
export function getResponsiveViewport(
  narrowBreakpointPx = 1180
): ResponsiveViewport {
  const width = Math.max(1, Math.floor(getViewportWidth()));
  const height = Math.max(1, Math.floor(getViewportHeight()));
  return {
    width,
    height,
    isNarrow: width <= narrowBreakpointPx
  };
}

/**
 * 解析响应式舞台宽度
 * 在宿主元素和视口约束下计算最佳舞台宽度
 * @param host - 宿主元素
 * @param options - 配置选项
 * @returns 可用的舞台宽度（像素）
 */
export function resolveResponsiveStageWidth(
  host: HTMLElement,
  options: {
    minWidthPx?: number;
    horizontalPaddingPx?: number;
    narrowBreakpointPx?: number;
  } = {}
): number {
  const minWidthPx = options.minWidthPx ?? 320;
  const horizontalPaddingPx = options.horizontalPaddingPx ?? 16;
  const viewport = getResponsiveViewport(options.narrowBreakpointPx);
  const hostWidth = Math.floor(
    host.clientWidth || host.getBoundingClientRect().width || viewport.width
  );
  return Math.max(
    minWidthPx,
    Math.min(
      hostWidth - horizontalPaddingPx,
      viewport.width - horizontalPaddingPx
    )
  );
}
