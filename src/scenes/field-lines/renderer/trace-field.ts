import type { PixelCharge, FieldLinePath } from './types';

const CALCULATION_STEP = 3;

function getElectricFieldAt(
  px: number,
  py: number,
  charges: PixelCharge[]
): { Ex: number; Ey: number; magnitude: number } {
  let Ex = 0;
  let Ey = 0;
  for (const charge of charges) {
    const dx = px - charge.x;
    const dy = py - charge.y;
    const rSquared = Math.max(charge.radius * charge.radius, dx * dx + dy * dy);
    const r = Math.sqrt(rSquared);
    const magnitude = charge.q / rSquared;
    Ex += magnitude * (dx / r);
    Ey += magnitude * (dy / r);
  }
  const magnitude = Math.hypot(Ex, Ey);
  return { Ex, Ey, magnitude };
}

/**
 * 追踪单条电场线，返回完整路径点和各点场强
 */
export function traceFieldLine(
  startX: number,
  startY: number,
  maxSegments: number,
  direction: 1 | -1,
  charges: PixelCharge[],
  bounds: { width: number; height: number }
): FieldLinePath {
  const points: Array<{ x: number; y: number }> = [];
  const fieldMagnitudes: number[] = [];

  let px = startX;
  let py = startY;

  for (let i = 0; i < maxSegments; i++) {
    const field = getElectricFieldAt(px, py, charges);

    if (field.magnitude < 0.00001) break;

    points.push({ x: px, y: py });
    fieldMagnitudes.push(field.magnitude);

    const dirX = direction * (field.Ex / field.magnitude);
    const dirY = direction * (field.Ey / field.magnitude);

    px += dirX * CALCULATION_STEP;
    py += dirY * CALCULATION_STEP;

    // 越界检查
    if (
      px < -20 ||
      px > bounds.width + 20 ||
      py < -20 ||
      py > bounds.height + 20
    ) {
      break;
    }

    // 靠近任意电荷时停止
    let nearCharge = false;
    for (const charge of charges) {
      if (Math.hypot(px - charge.x, py - charge.y) < charge.radius * 1.3) {
        nearCharge = true;
        break;
      }
    }
    if (nearCharge) break;
  }

  return { points, fieldMagnitudes, direction };
}

/**
 * 为所有电荷生成电场线路径
 */
export function generateFieldLines(
  charges: PixelCharge[],
  density: number,
  bounds: { width: number; height: number }
): FieldLinePath[] {
  const paths: FieldLinePath[] = [];
  const maxSegments = 900;
  // density 1~100 映射到 visualStepSize 120~5，但这里只用于起始点数量
  const linesPerUnitCharge = Math.max(
    4,
    Math.min(32, Math.round(density * 0.3))
  );

  // 正电荷：发出电场线（direction = 1）
  for (const charge of charges) {
    if (charge.q <= 0) continue;
    const numLines = Math.max(
      4,
      Math.min(40, Math.round(linesPerUnitCharge * charge.q))
    );
    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2;
      const startX = charge.x + charge.radius * 1.4 * Math.cos(angle);
      const startY = charge.y + charge.radius * 1.4 * Math.sin(angle);
      const path = traceFieldLine(
        startX,
        startY,
        maxSegments,
        1,
        charges,
        bounds
      );
      if (path.points.length >= 3) {
        paths.push(path);
      }
    }
  }

  // 负电荷：吸收电场线（direction = -1，从电荷外开始向内追踪）
  for (const charge of charges) {
    if (charge.q >= 0) continue;
    const numLines = Math.max(
      4,
      Math.min(40, Math.round(linesPerUnitCharge * Math.abs(charge.q)))
    );
    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2;
      const startX = charge.x + charge.radius * 1.4 * Math.cos(angle);
      const startY = charge.y + charge.radius * 1.4 * Math.sin(angle);
      const path = traceFieldLine(
        startX,
        startY,
        maxSegments,
        -1,
        charges,
        bounds
      );
      if (path.points.length >= 3) {
        paths.push(path);
      }
    }
  }

  return paths;
}
