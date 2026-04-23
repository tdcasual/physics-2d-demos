import type { PixelCharge } from './types';

/**
 * 绘制等势线
 * 使用简化方法：在网格上计算电势，然后沿电势梯度方向追踪等势路径
 */
export function drawEquipotentialLines(
  ctx: CanvasRenderingContext2D,
  charges: PixelCharge[],
  width: number,
  height: number,
  responsiveScale: number,
  isDark: boolean
): void {
  // 移动端不绘制等势线（性能考虑）
  if (responsiveScale < 0.6) return;

  const gridSize = Math.max(12, Math.min(25, Math.round(18 * responsiveScale)));
  const cellW = width / gridSize;
  const cellH = height / gridSize;

  // 计算电势网格
  const potentialGrid: number[][] = [];
  let minV = Infinity;
  let maxV = -Infinity;

  for (let row = 0; row <= gridSize; row++) {
    potentialGrid[row] = [];
    for (let col = 0; col <= gridSize; col++) {
      const px = col * cellW;
      const py = row * cellH;
      const v = getPotentialAt(px, py, charges);
      potentialGrid[row][col] = v;
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }
  }

  // 确定等势值集合
  const levels = generatePotentialLevels(minV, maxV, charges.length);

  ctx.save();
  ctx.strokeStyle = isDark
    ? 'rgba(255, 255, 255, 0.12)'
    : 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = Math.max(0.5, responsiveScale);
  ctx.setLineDash([4, 6]);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const level of levels) {
    drawSingleEquipotential(ctx, potentialGrid, level, cellW, cellH, gridSize);
  }

  ctx.restore();
}

function getPotentialAt(px: number, py: number, charges: PixelCharge[]): number {
  let v = 0;
  for (const charge of charges) {
    const dx = px - charge.x;
    const dy = py - charge.y;
    const r = Math.max(charge.radius * 0.5, Math.hypot(dx, dy));
    v += charge.q / r;
  }
  return v;
}

function generatePotentialLevels(
  minV: number,
  maxV: number,
  numCharges: number
): number[] {
  const levels: number[] = [];
  const range = Math.max(Math.abs(minV), Math.abs(maxV));

  if (range < 0.001) return levels;

  // 根据电荷数量调整等势线密度
  const stepCount = numCharges <= 2 ? 8 : 5;
  const step = range / stepCount;

  for (let i = -stepCount; i <= stepCount; i++) {
    const level = i * step;
    if (Math.abs(level) > range * 0.05) {
      levels.push(level);
    }
  }

  return levels;
}

/**
 * 沿等势线追踪路径点
 * 从网格交点出发，沿着电势不变的方向（垂直于梯度）追踪
 */
function drawSingleEquipotential(
  ctx: CanvasRenderingContext2D,
  potentialGrid: number[][],
  level: number,
  cellW: number,
  cellH: number,
  gridSize: number
): void {
  const visited = new Set<string>();
  const paths: Array<Array<{ x: number; y: number }>> = [];

  // 寻找等势线上的种子点
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const key = `${col},${row}`;
      if (visited.has(key)) continue;

      const seed = findSeedOnCellEdge(potentialGrid, level, col, row);
      if (!seed) continue;

      const path = traceEquipotential(
        seed.x, seed.y, level, cellW, cellH, gridSize, potentialGrid, visited
      );
      if (path.length >= 4) {
        paths.push(path);
      }
    }
  }

  // 绘制路径
  for (const path of paths) {
    if (path.length < 3) continue;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
  }
}

function findSeedOnCellEdge(
  grid: number[][],
  level: number,
  col: number,
  row: number
): { x: number; y: number } | null {
  const v00 = grid[row][col];
  const v10 = grid[row][col + 1];
  const v01 = grid[row + 1][col];
  const v11 = grid[row + 1][col + 1];

  // 检查四条边是否跨越 level
  const edges = [
    { x0: col, y0: row, x1: col + 1, y1: row, v0: v00, v1: v10 },
    { x0: col + 1, y0: row, x1: col + 1, y1: row + 1, v0: v10, v1: v11 },
    { x0: col + 1, y0: row + 1, x1: col, y1: row + 1, v0: v11, v1: v01 },
    { x0: col, y0: row + 1, x1: col, y1: row, v0: v01, v1: v00 }
  ];

  for (const edge of edges) {
    if ((edge.v0 - level) * (edge.v1 - level) < 0) {
      const t = (level - edge.v0) / (edge.v1 - edge.v0);
      return {
        x: edge.x0 + t * (edge.x1 - edge.x0),
        y: edge.y0 + t * (edge.y1 - edge.y0)
      };
    }
  }

  return null;
}

function traceEquipotential(
  startX: number,
  startY: number,
  level: number,
  cellW: number,
  cellH: number,
  gridSize: number,
  potentialGrid: number[][],
  visited: Set<string>
): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = [];
  let cx = startX;
  let cy = startY;
  const stepSize = 0.8;
  const maxSteps = 200;

  for (let step = 0; step < maxSteps; step++) {
    const col = Math.floor(cx);
    const row = Math.floor(cy);
    const key = `${col},${row}`;

    if (col < 0 || col >= gridSize || row < 0 || row >= gridSize) break;
    if (visited.has(key) && step > 5) break;
    visited.add(key);

    // 计算局部梯度（垂直于等势方向）
    const gx = getPotentialAtGrid(potentialGrid, col + 1, row) - getPotentialAtGrid(potentialGrid, col - 1, row);
    const gy = getPotentialAtGrid(potentialGrid, col, row + 1) - getPotentialAtGrid(potentialGrid, col, row - 1);
    const gradMag = Math.hypot(gx, gy);

    if (gradMag < 0.0001) break;

    // 等势方向 = 垂直于梯度
    const dx = (-gy / gradMag) * stepSize;
    const dy = (gx / gradMag) * stepSize;

    // 尝试两个方向，选择更接近 level 的
    const px1 = cx + dx;
    const py1 = cy + dy;
    const px2 = cx - dx;
    const py2 = cy - dy;

    const v1 = Math.abs(bilinearSample(potentialGrid, px1, py1, gridSize) - level);
    const v2 = Math.abs(bilinearSample(potentialGrid, px2, py2, gridSize) - level);

    if (v1 < v2) {
      cx = px1;
      cy = py1;
    } else {
      cx = px2;
      cy = py2;
    }

    // 转换为像素坐标
    path.push({ x: cx * cellW, y: cy * cellH });

    // 如果回到起点附近，闭合路径
    if (step > 10 && Math.hypot(cx - startX, cy - startY) < stepSize * 2) {
      break;
    }
  }

  return path;
}

function getPotentialAtGrid(grid: number[][], col: number, row: number): number {
  const r = Math.max(0, Math.min(grid.length - 1, row));
  const c = Math.max(0, Math.min(grid[0].length - 1, col));
  return grid[r][c];
}

function bilinearSample(
  grid: number[][],
  x: number,
  y: number,
  gridSize: number
): number {
  const x0 = Math.max(0, Math.min(gridSize, Math.floor(x)));
  const y0 = Math.max(0, Math.min(gridSize, Math.floor(y)));
  const x1 = Math.min(gridSize, x0 + 1);
  const y1 = Math.min(gridSize, y0 + 1);

  const fx = x - x0;
  const fy = y - y0;

  const v00 = grid[y0][x0];
  const v10 = grid[y0][x1];
  const v01 = grid[y1][x0];
  const v11 = grid[y1][x1];

  return (
    v00 * (1 - fx) * (1 - fy) +
    v10 * fx * (1 - fy) +
    v01 * (1 - fx) * fy +
    v11 * fx * fy
  );
}
