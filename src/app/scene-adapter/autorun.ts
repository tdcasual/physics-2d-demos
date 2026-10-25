/**
 * B22：恢复值 → 是否播放。
 * 显式覆盖 0 / '0' / false / 'false' / NaN 判假，其余判真。
 * 非法数值（`?autoRun=abc`）已由 readSceneParams 在入口丢弃，不进 snapshot，
 * 回退静态 autoPlay；NaN 分支仅作其他来源的防御。
 */
export function coerceAutoRun(value: unknown): boolean {
  if (
    value === 0 ||
    value === '0' ||
    value === false ||
    value === 'false' ||
    (typeof value === 'number' && Number.isNaN(value))
  ) {
    return false;
  }
  return true;
}
