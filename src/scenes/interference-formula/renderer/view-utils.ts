/**
 * 双缝干涉 — 通用绘制工具
 */

export function drawArrowLine(
  c: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  scale: number
): void {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();

  const arrowSize = 5 * scale;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(
    x1 + arrowSize * Math.cos(angle + Math.PI / 6),
    y1 + arrowSize * Math.sin(angle + Math.PI / 6)
  );
  c.moveTo(x1, y1);
  c.lineTo(
    x1 + arrowSize * Math.cos(angle - Math.PI / 6),
    y1 + arrowSize * Math.sin(angle - Math.PI / 6)
  );
  c.stroke();
  c.beginPath();
  c.moveTo(x2, y2);
  c.lineTo(
    x2 - arrowSize * Math.cos(angle + Math.PI / 6),
    y2 - arrowSize * Math.sin(angle + Math.PI / 6)
  );
  c.moveTo(x2, y2);
  c.lineTo(
    x2 - arrowSize * Math.cos(angle - Math.PI / 6),
    y2 - arrowSize * Math.sin(angle - Math.PI / 6)
  );
  c.stroke();
}
