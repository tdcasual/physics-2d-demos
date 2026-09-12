import type { PixelCharge, FieldLinePath, FieldProbe } from './types';
import { linesForCharge } from '../scene.sim';

const CALCULATION_STEP = 3;

export function getElectricFieldAt(
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
 * 追踪单条电场线。direction=-1 时沿 −E 从负电荷往外走，返回前把点列
 * 反转，使路径方向与物理 E 一致（指向负电荷 / 离开正电荷）。
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

    // 像素单位下 |E|~1/r²，画布边缘约 1e-6；旧阈值 1e-5 会让线在 ~300px 处截断
    if (field.magnitude < 1e-12) break;

    points.push({ x: px, y: py });
    fieldMagnitudes.push(field.magnitude);

    const dirX = direction * (field.Ex / field.magnitude);
    const dirY = direction * (field.Ey / field.magnitude);

    px += dirX * CALCULATION_STEP;
    py += dirY * CALCULATION_STEP;

    if (
      px < -20 ||
      px > bounds.width + 20 ||
      py < -20 ||
      py > bounds.height + 20
    ) {
      break;
    }

    let nearCharge = false;
    for (const charge of charges) {
      if (Math.hypot(px - charge.x, py - charge.y) < charge.radius * 1.3) {
        nearCharge = true;
        break;
      }
    }
    if (nearCharge) break;
  }

  if (direction === -1) {
    points.reverse();
    fieldMagnitudes.reverse();
  }

  return { points, fieldMagnitudes, direction };
}

function emitFromCharge(
  charge: PixelCharge,
  direction: 1 | -1,
  charges: PixelCharge[],
  bounds: { width: number; height: number },
  maxSegments: number,
  angleOffset = 0
): FieldLinePath[] {
  const paths: FieldLinePath[] = [];
  const numLines = linesForCharge(charge.q);
  for (let i = 0; i < numLines; i++) {
    const angle = ((i + angleOffset) / numLines) * Math.PI * 2;
    const startX = charge.x + charge.radius * 1.4 * Math.cos(angle);
    const startY = charge.y + charge.radius * 1.4 * Math.sin(angle);
    const path = traceFieldLine(
      startX,
      startY,
      maxSegments,
      direction,
      charges,
      bounds
    );
    if (path.points.length >= 3) {
      paths.push(path);
    }
  }
  return paths;
}

/** 从负电荷回追的线若远端落在正电荷附近，说明已由正电荷发出，属于重复。 */
function pathApproachesPositive(
  path: FieldLinePath,
  positives: PixelCharge[]
): boolean {
  if (positives.length === 0 || path.points.length === 0) return false;
  const n = Math.min(12, path.points.length);
  for (let i = 0; i < n; i++) {
    const p = path.points[i];
    for (const c of positives) {
      if (Math.hypot(p.x - c.x, p.y - c.y) < c.radius * 2.5) return true;
    }
  }
  return false;
}

/**
 * 按 |Q| 生成电场线骨架。正电荷向外发；负电荷从外侧回追，
 * 丢掉已经由正电荷连过来的重复线，这样负电荷远侧也会被电场线包围。
 * 条数不随试探次数 n 变化。
 */
export function generateFieldLines(
  charges: PixelCharge[],
  bounds: { width: number; height: number }
): FieldLinePath[] {
  const maxSegments = 900;
  const positives = charges.filter((c) => c.q > 0);
  const negatives = charges.filter((c) => c.q < 0);
  const paths: FieldLinePath[] = [];

  for (const charge of positives) {
    paths.push(...emitFromCharge(charge, 1, charges, bounds, maxSegments, 0));
  }

  for (const charge of negatives) {
    const fromNeg = emitFromCharge(
      charge,
      -1,
      charges,
      bounds,
      maxSegments,
      0.5
    );
    for (const path of fromNeg) {
      if (positives.length > 0 && pathApproachesPositive(path, positives)) {
        continue;
      }
      paths.push(path);
    }
  }

  return paths;
}

/**
 * 沿一条预定电场线按弧长均匀取 n 个试探点，并在该点重算 E。
 * n 变密不改变路径，只增加采样。
 */
export function sampleProbesAlongPath(
  path: FieldLinePath,
  n: number,
  charges: PixelCharge[]
): FieldProbe[] {
  const pts = path.points;
  const count = Math.max(0, Math.floor(n));
  if (pts.length < 2 || count < 1) return [];

  const dist: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    dist.push(
      dist[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    );
  }
  const total = dist[dist.length - 1];
  if (total < 1) return [];

  const t0 = 0.08;
  const t1 = 0.92;
  const probes: FieldProbe[] = [];

  for (let k = 0; k < count; k++) {
    const t = count === 1 ? 0.35 : t0 + ((t1 - t0) * k) / (count - 1);
    const target = t * total;
    let i = 1;
    while (i < dist.length && dist[i] < target) i += 1;
    const i1 = Math.min(i, dist.length - 1);
    const i0 = Math.max(0, i1 - 1);
    const span = dist[i1] - dist[i0];
    const u = span > 0 ? (target - dist[i0]) / span : 0;
    const x = pts[i0].x + (pts[i1].x - pts[i0].x) * u;
    const y = pts[i0].y + (pts[i1].y - pts[i0].y) * u;
    const field = getElectricFieldAt(x, y, charges);
    probes.push({
      x,
      y,
      Ex: field.Ex,
      Ey: field.Ey,
      magnitude: field.magnitude
    });
  }

  return probes;
}
