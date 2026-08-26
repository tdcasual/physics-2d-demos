/**
 * 劈尖干涉 — 渲染工具函数
 */

export function drawArrow(
  c: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size: number
): void {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  c.beginPath();
  c.moveTo(x2, y2);
  c.lineTo(
    x2 - size * Math.cos(angle - Math.PI / 6),
    y2 - size * Math.sin(angle - Math.PI / 6)
  );
  c.moveTo(x2, y2);
  c.lineTo(
    x2 - size * Math.cos(angle + Math.PI / 6),
    y2 - size * Math.sin(angle + Math.PI / 6)
  );
  c.stroke();
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 200, g: 200, b: 200 };
}
