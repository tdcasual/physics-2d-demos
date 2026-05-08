/**
 * CIE 1931 光谱→sRGB 转换工具
 *
 * 用于白光薄膜干涉的彩色条纹渲染。
 * 色匹配函数使用 Wyman, Sloan & Shirley (2013) 的解析高斯近似。
 */

// ── CIE 1931 色匹配函数（Wyman 高斯近似）──

function asymGauss(lambda: number, mu: number, s1: number, s2: number): number {
  const s = lambda < mu ? s1 : s2;
  return Math.exp(-0.5 * ((lambda - mu) / s) ** 2);
}

function cieX(lambda: number): number {
  return (
    1.056 * asymGauss(lambda, 599.8, 37.9, 31.0) +
    0.362 * asymGauss(lambda, 442.0, 16.0, 26.7) -
    0.065 * asymGauss(lambda, 501.1, 20.4, 26.2)
  );
}

function cieY(lambda: number): number {
  return (
    0.821 * asymGauss(lambda, 568.8, 46.9, 40.5) +
    0.286 * asymGauss(lambda, 530.9, 16.3, 31.1)
  );
}

function cieZ(lambda: number): number {
  return (
    1.217 * asymGauss(lambda, 437.0, 11.8, 36.0) +
    0.681 * asymGauss(lambda, 459.0, 26.0, 13.8)
  );
}

// ── XYZ → sRGB 转换 ──

function xyzToSrgbLinear(x: number, y: number, z: number): [number, number, number] {
  const r = 3.2406 * x - 1.5372 * y - 0.4986 * z;
  const g = -0.9689 * x + 1.8758 * y + 0.0415 * z;
  const b = 0.0557 * x - 0.2040 * y + 1.0570 * z;
  return [r, g, b];
}

function srgbGamma(c: number): number {
  const clamped = Math.max(0, Math.min(1, c));
  return clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

function xyzToSrgb(x: number, y: number, z: number): [number, number, number] {
  const [rl, gl, bl] = xyzToSrgbLinear(x, y, z);
  return [srgbGamma(rl), srgbGamma(gl), srgbGamma(bl)];
}

// ── 薄膜反射率 ──

/**
 * 薄膜在近正入射下对特定波长的反射率（双光束近似）
 * @param d 薄膜厚度 nm
 * @param n 折射率
 * @param lambda 波长 nm
 */
export function thinFilmReflectance(d: number, n: number, lambda: number): number {
  const r0 = ((n - 1) / (n + 1)) ** 2;
  const delta = (4 * Math.PI * n * d) / lambda;
  return 4 * r0 * Math.sin(delta / 2) ** 2;
}

// 预计算 CIE 权重归一化因子
const SPECTRAL_SAMPLES: number[] = [];
const CIE_X_WEIGHTS: number[] = [];
const CIE_Y_WEIGHTS: number[] = [];
const CIE_Z_WEIGHTS: number[] = [];
let Y_NORM = 0;

function initSpectralTables(): void {
  if (SPECTRAL_SAMPLES.length > 0) return;
  for (let lambda = 380; lambda <= 780; lambda += 5) {
    SPECTRAL_SAMPLES.push(lambda);
    const x = cieX(lambda);
    const y = cieY(lambda);
    const z = cieZ(lambda);
    CIE_X_WEIGHTS.push(x);
    CIE_Y_WEIGHTS.push(y);
    CIE_Z_WEIGHTS.push(z);
    Y_NORM += y;
  }
}

/**
 * 白光照射下薄膜的反射颜色
 * @param d 薄膜厚度 nm
 * @param n 折射率
 * @returns [r, g, b] 各 ∈ [0, 255]
 */
export function whiteLightFilmColor(d: number, n: number): [number, number, number] {
  initSpectralTables();

  let xSum = 0;
  let ySum = 0;
  let zSum = 0;

  for (let i = 0; i < SPECTRAL_SAMPLES.length; i++) {
    const lambda = SPECTRAL_SAMPLES[i];
    const R = thinFilmReflectance(d, n, lambda);
    xSum += R * CIE_X_WEIGHTS[i];
    ySum += R * CIE_Y_WEIGHTS[i];
    zSum += R * CIE_Z_WEIGHTS[i];
  }

  const x = xSum / Y_NORM;
  const y = ySum / Y_NORM;
  const z = zSum / Y_NORM;

  const [r, g, b] = xyzToSrgb(x, y, z);
  return [
    Math.round(Math.max(0, Math.min(255, r * 255))),
    Math.round(Math.max(0, Math.min(255, g * 255))),
    Math.round(Math.max(0, Math.min(255, b * 255)))
  ];
}
