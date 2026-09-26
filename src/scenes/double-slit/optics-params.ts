/**
 * 双缝光学参数失效判据（数据任务模块外置，供 scene.entry 静态引用，
 * 不把 data-task 拉进入口 chunk）。
 *
 * 失效集 = 改变条纹间距、判分 knowns（d/L）或读数零位基准的参数。
 * 明确不含：stripeOffset（十字准星位移是测量交互本身，x₁/x₂ 之间必然变化）、
 * crosshairAngle / viewMode（不改变间距与零位，冻结读数自洽）、
 * activeInstrument（走 syncInstrument 既有失效路径）。
 * micrometerOffset 当前无 UI 入口（schema 无该字段），diff 覆盖它面向未来。
 */

import { DEFAULT_L, type DoubleSlitParams } from './scene.sim';

export const OPTICS_INVALIDATION_MESSAGE =
  '光源或几何参数已变更，请重新测量校对';

export function opticsChangeReason(
  prev: DoubleSlitParams,
  next: DoubleSlitParams
): string | null {
  if (prev.lambda !== next.lambda) return OPTICS_INVALIDATION_MESSAGE;
  if (prev.slitDistance !== next.slitDistance) {
    return OPTICS_INVALIDATION_MESSAGE;
  }
  if ((prev.L ?? DEFAULT_L) !== (next.L ?? DEFAULT_L)) {
    return OPTICS_INVALIDATION_MESSAGE;
  }
  if (prev.lightMode !== next.lightMode) return OPTICS_INVALIDATION_MESSAGE;
  if (prev.filterColor !== next.filterColor) {
    return OPTICS_INVALIDATION_MESSAGE;
  }
  if (prev.micrometerOffset !== next.micrometerOffset) {
    return OPTICS_INVALIDATION_MESSAGE;
  }
  return null;
}
