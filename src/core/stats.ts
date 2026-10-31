/**
 * 最小二乘与描述统计。中心化后再算，避免大坐标抵消。
 * 点数不足或分母退化时返回 null，不抛。
 */

export type Point = { x: number; y: number };

export type LinearFit = {
  slope: number;
  intercept: number;
  r2: number;
  slopeStdErr: number;
  interceptStdErr: number;
  n: number;
};

export type QuadraticFit = {
  a: number;
  b: number;
  c: number;
  r2: number;
};

const EPS = 1e-18;

function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function mean(values: readonly number[]): number | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

export function stdDev(values: readonly number[]): number | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length < 2) return null;
  const avg = mean(finite);
  if (avg === null) return null;
  const ss = finite.reduce((sum, value) => sum + (value - avg) ** 2, 0);
  return Math.sqrt(ss / (finite.length - 1));
}

export function standardError(values: readonly number[]): number | null {
  const s = stdDev(values);
  const finite = values.filter((value) => Number.isFinite(value));
  if (s === null || finite.length === 0) return null;
  return s / Math.sqrt(finite.length);
}

export function linearFit(points: readonly Point[]): LinearFit | null {
  const pts = points.filter(isFinitePoint);
  const n = pts.length;
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  for (const p of pts) {
    sumX += p.x;
    sumY += p.y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  let xx = 0;
  let yy = 0;
  let xy = 0;
  for (const p of pts) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    xx += dx * dx;
    yy += dy * dy;
    xy += dx * dy;
  }
  if (xx < EPS) return null;
  const slope = xy / xx;
  const intercept = meanY - slope * meanX;
  let ssRes = 0;
  for (const p of pts) {
    const pred = slope * p.x + intercept;
    ssRes += (p.y - pred) ** 2;
  }
  const ssTot = yy;
  const r2 = ssTot < EPS ? 1 : 1 - ssRes / ssTot;
  const mse = n > 2 ? ssRes / (n - 2) : 0;
  const slopeStdErr = Math.sqrt(mse / xx);
  const interceptStdErr = Math.sqrt(mse * (1 / n + (meanX * meanX) / xx));
  return {
    slope,
    intercept,
    r2: Number.isFinite(r2) ? r2 : 0,
    slopeStdErr: Number.isFinite(slopeStdErr) ? slopeStdErr : 0,
    interceptStdErr: Number.isFinite(interceptStdErr) ? interceptStdErr : 0,
    n
  };
}

export function linearFitThroughOrigin(
  points: readonly Point[]
): { slope: number; r2: number; n: number } | null {
  const pts = points.filter(isFinitePoint);
  const n = pts.length;
  if (n < 1) return null;
  let xx = 0;
  let xy = 0;
  let yy = 0;
  for (const p of pts) {
    xx += p.x * p.x;
    xy += p.x * p.y;
    yy += p.y * p.y;
  }
  if (xx < EPS) return null;
  const slope = xy / xx;
  let ssRes = 0;
  for (const p of pts) {
    ssRes += (p.y - slope * p.x) ** 2;
  }
  const r2 = yy < EPS ? 1 : 1 - ssRes / yy;
  return { slope, r2: Number.isFinite(r2) ? r2 : 0, n };
}

/**
 * y = a t² + b t + c。高斯消元；退化返回 null。
 */
export function quadraticFit(points: readonly Point[]): QuadraticFit | null {
  const pts = points.filter(isFinitePoint);
  if (pts.length < 3) return null;
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  let s3 = 0;
  let s4 = 0;
  let sy = 0;
  let s1y = 0;
  let s2y = 0;
  for (const p of pts) {
    const t = p.x;
    const t2 = t * t;
    s0 += 1;
    s1 += t;
    s2 += t2;
    s3 += t2 * t;
    s4 += t2 * t2;
    sy += p.y;
    s1y += t * p.y;
    s2y += t2 * p.y;
  }
  const aug = [
    [s0, s1, s2, sy],
    [s1, s2, s3, s1y],
    [s2, s3, s4, s2y]
  ];
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row;
    }
    if (Math.abs(aug[pivot][col]) < EPS) return null;
    if (pivot !== col) {
      const tmp = aug[col];
      aug[col] = aug[pivot];
      aug[pivot] = tmp;
    }
    const div = aug[col][col];
    for (let j = col; j < 4; j++) aug[col][j] /= div;
    for (let row = 0; row < 3; row++) {
      if (row === col) continue;
      const f = aug[row][col];
      for (let j = col; j < 4; j++) aug[row][j] -= f * aug[col][j];
    }
  }
  const c = aug[0][3];
  const b = aug[1][3];
  const a = aug[2][3];
  if (![a, b, c].every(Number.isFinite)) return null;
  const meanY = sy / s0;
  let ssRes = 0;
  let ssTot = 0;
  for (const p of pts) {
    const pred = a * p.x * p.x + b * p.x + c;
    ssRes += (p.y - pred) ** 2;
    ssTot += (p.y - meanY) ** 2;
  }
  const r2 = ssTot < EPS ? 1 : 1 - ssRes / ssTot;
  return { a, b, c, r2: Number.isFinite(r2) ? r2 : 0 };
}

/**
 * y = a x + b x²（无常数项）。过原点的抛体轨迹；退化时退回 a=0、过原点二次。
 */
export function quadraticFitNoConstant(
  points: readonly Point[]
): { a: number; b: number } | null {
  const pts = points.filter(isFinitePoint);
  if (pts.length === 0) return null;
  let s2 = 0;
  let s3 = 0;
  let s4 = 0;
  let t1 = 0;
  let t2 = 0;
  for (const { x, y } of pts) {
    const x2 = x * x;
    s2 += x2;
    s3 += x2 * x;
    s4 += x2 * x2;
    t1 += x * y;
    t2 += x2 * y;
  }
  if (!(s4 > 0)) return null;
  const det = s2 * s4 - s3 * s3;
  if (Math.abs(det) > 1e-9 * s2 * s4) {
    const a = (t1 * s4 - t2 * s3) / det;
    const b = (s2 * t2 - s3 * t1) / det;
    if (b > 0) return { a, b };
  }
  return { a: 0, b: t2 / s4 };
}

/**
 * 先全点拟合，再丢掉残差明显偏大的点后重拟合。
 * 缺省算法对齐纸带：cutoff = max(0.05, 3 × 其余残差均值)。
 */
export function linearFitDroppingOutliers(
  points: readonly Point[],
  opts?: { minResidual?: number; meanFactor?: number }
): { fit: LinearFit | null; outlierIndices: number[] } {
  const pts = points.filter(isFinitePoint);
  const fitAll = linearFit(pts);
  if (!fitAll || pts.length < 4) {
    return { fit: fitAll, outlierIndices: [] };
  }
  const residuals = pts.map((p) =>
    Math.abs(p.y - (fitAll.slope * p.x + fitAll.intercept))
  );
  const maxI = residuals.indexOf(Math.max(...residuals));
  const others = residuals.filter((_, i) => i !== maxI);
  const meanOthers =
    others.reduce((sum, r) => sum + r, 0) / Math.max(1, others.length);
  const cutoff = Math.max(
    opts?.minResidual ?? 0.05,
    (opts?.meanFactor ?? 3) * meanOthers
  );
  const outlierIndices = residuals
    .map((r, i) => (r > cutoff ? i : -1))
    .filter((i) => i >= 0);
  if (outlierIndices.length === 0) return { fit: fitAll, outlierIndices: [] };
  const kept = pts.filter((_, i) => !outlierIndices.includes(i));
  return { fit: linearFit(kept) ?? fitAll, outlierIndices };
}
