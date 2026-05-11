/**
 * 波长 → 颜色转换（连续可见光谱）
 */

/** 波长(nm) → RGB 分量（原始计算） */
function computeLambdaToRgb(lambda: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (lambda < 440) {
    r = 120 + (lambda - 400) * 3.375;
    g = 0;
    b = 255;
  } else if (lambda < 490) {
    r = 0;
    g = (lambda - 440) * 5.1;
    b = 255;
  } else if (lambda < 510) {
    r = 0;
    g = 255;
    b = 255 - (lambda - 490) * 12.75;
  } else if (lambda < 570) {
    r = (lambda - 510) * 4.25;
    g = 255;
    b = 0;
  } else if (lambda < 590) {
    r = 255;
    g = 255;
    b = (lambda - 570) * 12.75;
  } else if (lambda < 620) {
    r = 255;
    g = 255 - (lambda - 590) * 8.5;
    b = 0;
  } else {
    r = 255;
    g = 0;
    b = 0;
  }
  return [Math.round(Math.max(0, Math.min(255, r))), Math.round(Math.max(0, Math.min(255, g))), Math.round(Math.max(0, Math.min(255, b)))];
}

/** 预计算 400-700nm 查找表 */
const _rgbLUT: [number, number, number][] = [];
for (let w = 400; w <= 700; w++) _rgbLUT.push(computeLambdaToRgb(w));

/** 波长(nm) → RGB 分量（LUT 加速） */
export function lambdaToRgb(lambda: number): [number, number, number] {
  const idx = Math.round(lambda) - 400;
  if (idx >= 0 && idx < _rgbLUT.length) return _rgbLUT[idx];
  return computeLambdaToRgb(lambda);
}

/** 波长(nm) → CSS 颜色字符串 */
export function wavelengthToColor(lambda: number): string {
  const [r, g, b] = lambdaToRgb(lambda);
  return `rgb(${r},${g},${b})`;
}
