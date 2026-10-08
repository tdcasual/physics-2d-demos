import { drawArrow, pathRoundRect } from '../../../core/draw-primitives';
import type { TeachingTheme } from '../../../platform/standards';
import {
  CHARGE_DISTANCE,
  CHARGE_PROFILE_LABELS,
  CHARGE_V0,
  bellPeakVelocity,
  chargeStrips,
  chargeVelocityAt,
  inducedCurrent,
  type ChargeStrip
} from '../charge-model';
import { metalRodConstants, type MetalRodState } from '../scene.sim';
import {
  CHARGE_FONT_FAMILY,
  chargePalette,
  chargeTypeScale,
  type ChargePalette,
  type ChargeTypeScale
} from './charge-palette';
import type { Box } from './stage-occlusion';

/**
 * 微元法求电荷量模式：左（上）为导轨-导体棒动画，右（下）为 I–t 图与
 * Δt 小矩形。全部按画布 CSS 像素绘制，字号 / 线宽取课堂 token。
 */
export type ChargeDrawInput = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  theme: TeachingTheme;
  responsiveScale: number;
  contentScale: number;
  /** 读数面板、浮动播放条在画布 CSS 坐标中的遮挡矩形 */
  occlusions: Box[];
  state: MetalRodState;
};

export type ChargeLayout = {
  region: Box;
  header: { left: number; top: number; bottom: number; lines: number };
  apparatus: Box;
  graph: Box;
  orientation: 'row' | 'column';
};

const SIDE_BY_SIDE_ASPECT = 1.55;
const CURVE_SAMPLES = 160;

function intersects(a: Box, b: Box): boolean {
  return (
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
  );
}

function area(b: Box): number {
  return Math.max(0, b.right - b.left) * Math.max(0, b.bottom - b.top);
}

function boxW(b: Box): number {
  return b.right - b.left;
}

function boxH(b: Box): number {
  return b.bottom - b.top;
}

/**
 * 逐个浮层收缩可用区域：在「右缩 / 下移 / 上收 / 左让」中取面积最大且
 * 不小于下限的一种；都不满足时不避让（极窄画布仍画出完整图形）。
 */
export function avoidOcclusions(
  start: Box,
  occlusions: Box[],
  gap: number,
  min: { width: number; height: number }
): Box {
  let region = start;
  for (const occ of occlusions) {
    if (!intersects(occ, region)) continue;
    const candidates = [
      { ...region, right: Math.min(region.right, occ.left - gap) },
      { ...region, top: Math.max(region.top, occ.bottom + gap) },
      { ...region, bottom: Math.min(region.bottom, occ.top - gap) },
      { ...region, left: Math.max(region.left, occ.right + gap) }
    ].filter((b) => boxW(b) >= min.width && boxH(b) >= min.height);
    if (candidates.length === 0) continue;
    region = candidates.reduce((best, b) => (area(b) > area(best) ? b : best));
  }
  return region;
}

export function layoutCharge(
  width: number,
  height: number,
  type: ChargeTypeScale,
  occlusions: Box[]
): ChargeLayout {
  const pad = Math.max(8, type.labelPx * 0.8);
  const gap = Math.max(6, type.labelPx * 0.6);
  const region = avoidOcclusions(
    { left: pad, top: pad, right: width - pad, bottom: height - pad },
    occlusions,
    gap,
    { width: type.labelPx * 18, height: type.labelPx * 16 }
  );
  const headerLines = 3;
  const headerBottom =
    region.top + type.titlePx * 1.35 + type.labelPx * 1.5 * (headerLines - 1);
  const body: Box = { ...region, top: headerBottom + gap };
  const bodyW = boxW(body);
  const bodyH = boxH(body);
  const row =
    bodyW >= bodyH * SIDE_BY_SIDE_ASPECT && bodyW >= type.labelPx * 34;
  if (row) {
    const split = body.left + bodyW * 0.48;
    return {
      region,
      header: {
        left: region.left,
        top: region.top,
        bottom: headerBottom,
        lines: headerLines
      },
      apparatus: { ...body, right: split - gap / 2 },
      graph: { ...body, left: split + gap / 2 },
      orientation: 'row'
    };
  }
  const split = body.top + bodyH * 0.44;
  return {
    region,
    header: {
      left: region.left,
      top: region.top,
      bottom: headerBottom,
      lines: headerLines
    },
    apparatus: { ...body, bottom: split - gap / 2 },
    graph: { ...body, top: split + gap / 2 },
    orientation: 'column'
  };
}

/** CSS font-weight 用字符串，避免与尺寸类数字混淆 */
const SEMIBOLD = '600';
const REGULAR = '400';

function font(px: number, weight: string = REGULAR): string {
  return `${weight} ${px}px ${CHARGE_FONT_FAMILY}`;
}

function fitText(
  ctx: CanvasRenderingContext2D,
  value: string,
  maxWidth: number
): string {
  if (ctx.measureText(value).width <= maxWidth) return value;
  let text = value;
  while (text.length > 1 && ctx.measureText(`${text}…`).width > maxWidth) {
    text = text.slice(0, -1);
  }
  return `${text}…`;
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  layout: ChargeLayout,
  type: ChargeTypeScale,
  p: ChargePalette,
  state: MetalRodState
): void {
  const { header, region } = layout;
  const maxWidth = boxW(region);
  const c = state.charge;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = p.text;
  ctx.font = font(type.titlePx, SEMIBOLD);
  ctx.fillText(
    fitText(ctx, '微元法求电荷量：Δq = IΔt = BLΔx/R', maxWidth),
    header.left,
    header.top
  );
  let y = header.top + type.titlePx * 1.35;
  ctx.font = font(type.labelPx);
  ctx.fillStyle = p.textSecondary;
  ctx.fillText(
    fitText(
      ctx,
      `速度变化方式：${CHARGE_PROFILE_LABELS[c.profile]} · 全程分 n = ${state.strips} 份`,
      maxWidth
    ),
    header.left,
    y
  );
  y += type.labelPx * 1.5;
  ctx.fillStyle = c.finished ? p.strip : p.textSecondary;
  ctx.font = font(type.labelPx, c.finished ? SEMIBOLD : REGULAR);
  const note = c.finished
    ? `滑过 x = ${c.displacement.toFixed(2)} m：ΣIΔt ≈ BLx/R，与 v 怎样变化无关`
    : '棒向右滑动，每个 Δt 的 Δq = IΔt 逐条累加';
  ctx.fillText(fitText(ctx, note, maxWidth), header.left, y);
  ctx.restore();
}

function drawFieldMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  const d = r * 0.6;
  ctx.beginPath();
  ctx.moveTo(x - d, y - d);
  ctx.lineTo(x + d, y + d);
  ctx.moveTo(x + d, y - d);
  ctx.lineTo(x - d, y + d);
  ctx.stroke();
}

function label(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color: string,
  px: number,
  align: CanvasTextAlign = 'center',
  weight: string = SEMIBOLD
): void {
  ctx.fillStyle = color;
  ctx.font = font(px, weight);
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

/** 导轨、电阻、⊗ 磁场、扫过面积与导体棒（含 I、v、Fₐ 箭头） */
function drawApparatus(
  ctx: CanvasRenderingContext2D,
  box: Box,
  type: ChargeTypeScale,
  p: ChargePalette,
  state: MetalRodState
): void {
  const c = state.charge;
  const w = boxW(box);
  const h = boxH(box);
  const lp = type.labelPx;
  const railTop = box.top + Math.max(lp * 1.6, h * 0.16);
  const railBottom = box.bottom - Math.max(lp * 2.2, h * 0.2);
  const railH = railBottom - railTop;
  const resistorX = box.left + lp * 1.6;
  const railEnd = box.right - lp * 0.6;
  const x0 = resistorX + Math.max(lp * 2.5, w * 0.14);
  const x1 = railEnd - Math.max(lp * 3, w * 0.14);
  const perMeter = (x1 - x0) / CHARGE_DISTANCE;
  const rodX = x0 + c.displacement * perMeter;

  ctx.save();
  // ⊗ 匀强磁场（垂直纸面向里）
  const spacing = Math.max(lp * 1.9, railH / 4);
  const markR = Math.max(3, lp * 0.32);
  ctx.strokeStyle = p.field;
  ctx.lineWidth = type.thinStroke * 0.8;
  for (let y = railTop + spacing / 2; y < railBottom - markR; y += spacing) {
    for (let x = x0 - spacing / 2; x < railEnd - markR; x += spacing) {
      if (x > resistorX + markR * 2) drawFieldMark(ctx, x, y, markR);
    }
  }
  label(ctx, 'B ⊗', railEnd, box.top + lp * 0.6, p.textSecondary, lp, 'right');

  // 扫过面积 ΔΦ = BLx
  if (rodX > x0) {
    ctx.fillStyle = p.sweptFill;
    ctx.fillRect(x0, railTop, rodX - x0, railH);
    if (rodX - x0 > lp * 5) {
      label(
        ctx,
        'ΔΦ = BLx',
        (x0 + rodX) / 2,
        railTop + railH * 0.5,
        p.strip,
        lp
      );
    }
  }

  // 起点 / 终点虚线
  ctx.setLineDash([lp * 0.4, lp * 0.35]);
  ctx.strokeStyle = p.textSecondary;
  ctx.lineWidth = type.thinStroke;
  for (const x of [x0, x1]) {
    ctx.beginPath();
    ctx.moveTo(x, railTop - lp * 0.6);
    ctx.lineTo(x, railBottom + lp * 0.6);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  label(ctx, 'x = 0', x0, railBottom + lp * 1.5, p.textSecondary, type.tickPx);
  label(
    ctx,
    `x = ${CHARGE_DISTANCE.toFixed(1)} m`,
    x1,
    railBottom + lp * 1.5,
    p.textSecondary,
    type.tickPx
  );

  // 导轨 + 电阻
  ctx.strokeStyle = p.rail;
  ctx.lineWidth = type.stroke;
  ctx.lineCap = 'round';
  const resistorH = Math.min(railH * 0.42, lp * 3.2);
  const resistorW = Math.max(lp * 0.8, resistorH * 0.34);
  const midY = (railTop + railBottom) / 2;
  ctx.beginPath();
  ctx.moveTo(railEnd, railTop);
  ctx.lineTo(resistorX, railTop);
  ctx.lineTo(resistorX, midY - resistorH / 2);
  ctx.moveTo(resistorX, midY + resistorH / 2);
  ctx.lineTo(resistorX, railBottom);
  ctx.lineTo(railEnd, railBottom);
  ctx.stroke();
  ctx.fillStyle = p.bg;
  ctx.fillRect(
    resistorX - resistorW / 2,
    midY - resistorH / 2,
    resistorW,
    resistorH
  );
  ctx.strokeRect(
    resistorX - resistorW / 2,
    midY - resistorH / 2,
    resistorW,
    resistorH
  );
  label(ctx, 'R', resistorX + resistorW, midY, p.text, lp, 'left');

  // 导体棒
  const rodW = Math.max(6, lp * 0.55);
  const overhang = lp * 0.5;
  pathRoundRect(
    ctx,
    rodX - rodW / 2,
    railTop - overhang,
    rodW,
    railH + overhang * 2,
    rodW / 2
  );
  ctx.fillStyle = p.rod;
  ctx.fill();
  ctx.strokeStyle = p.rodEdge;
  ctx.lineWidth = type.thinStroke;
  ctx.stroke();
  label(ctx, 'L', rodX - rodW, railTop - overhang - lp * 0.7, p.text, lp);

  const moving = c.velocity > 1e-3;
  if (moving) {
    const head = Math.max(6, lp * 0.55);
    const vRef = Math.max(CHARGE_V0, bellPeakVelocity());
    const ratio = Math.min(1, c.velocity / vRef);
    const maxLen = Math.max(lp * 2, w * 0.16);
    const len = lp * 0.8 + ratio * (maxLen - lp * 0.8);
    // 感应电流：B 向里、v 向右 ⇒ 棒中电流沿棒指向上导轨
    const iTop = railTop + railH * 0.18;
    const iBottom = railBottom - railH * 0.18;
    drawArrow(ctx, rodX + rodW, iBottom, rodX + rodW, iTop, {
      color: p.curve,
      lineWidth: type.stroke,
      headSize: head
    });
    label(ctx, 'I', rodX + rodW * 1.6, iTop, p.curve, lp, 'left');
    // 速度 v（向右）
    const vy = railTop + railH * 0.36;
    drawArrow(ctx, rodX + rodW * 2.4, vy, rodX + rodW * 2.4 + len, vy, {
      color: p.velocity,
      lineWidth: type.stroke,
      headSize: head
    });
    label(
      ctx,
      'v',
      rodX + rodW * 2.4 + len + lp * 0.5,
      vy,
      p.velocity,
      lp,
      'left'
    );
    // 安培力 Fₐ（与 v 相反）
    const fy = railTop + railH * 0.66;
    drawArrow(ctx, rodX - rodW, fy, rodX - rodW - len, fy, {
      color: p.force,
      lineWidth: type.stroke,
      headSize: head
    });
    label(ctx, 'Fₐ', rodX - rodW - len - lp * 0.3, fy, p.force, lp, 'right');
  }
  ctx.restore();
}

function niceStep(span: number, targetTicks: number): number {
  const raw = span / Math.max(1, targetTicks);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / pow;
  const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : 5;
  return nice * pow;
}

export function formatTick(value: number, step: number): string {
  let digits = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  // 2.5 × 10ᵏ 之类的步长需要多一位小数（0.25 而非 0.3）
  while (digits < 4) {
    const scaled = step * 10 ** digits;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-6) break;
    digits += 1;
  }
  return value.toFixed(digits);
}

/** I–t 图：曲线（全程淡、已走过实线）、Δt 小矩形（面积 = q）、时间游标 */
function drawGraph(
  ctx: CanvasRenderingContext2D,
  box: Box,
  type: ChargeTypeScale,
  p: ChargePalette,
  state: MetalRodState,
  strips: ChargeStrip[]
): void {
  const c = state.charge;
  const lp = type.labelPx;
  const tp = type.tickPx;
  const B = state.magneticField;
  const L = metalRodConstants.rodLength;
  const R = state.resistance;
  const iRef = inducedCurrent(B, L, R, Math.max(CHARGE_V0, bellPeakVelocity()));
  const yMax = Math.max(1e-6, iRef * 1.25);
  const tMax = c.duration;

  ctx.save();
  // 注释两行：ΣIΔt 与 BLx/R
  const sumText = `面积 ΣIΔt = ${c.stripSum.toFixed(3)} C`;
  const formulaText = `BLx/R = ${c.formula.toFixed(3)} C`;
  ctx.font = font(lp, SEMIBOLD);
  const oneLine =
    ctx.measureText(`${sumText}    ${formulaText}`).width <= boxW(box);
  const noteRows = oneLine ? 1 : 2;

  ctx.font = font(tp);
  const plotTop = box.top + lp * 1.5 * noteRows + lp * 1.2;
  const plotBottom = box.bottom - tp * 1.9;
  // 刻度行距不小于 ≈2 倍字号：矮画布（移动端）自动减少 y 刻度
  const yTicks = Math.max(
    1,
    Math.min(4, Math.floor((plotBottom - plotTop) / (tp * 2)))
  );
  const yStep = niceStep(yMax, yTicks);
  const yTickW = ctx.measureText(formatTick(yStep * 4, yStep)).width;
  const plot: Box = {
    left: box.left + yTickW + tp * 0.8,
    top: plotTop,
    right: box.right - tp * 4.2,
    bottom: plotBottom
  };
  const pw = Math.max(1, boxW(plot));
  const ph = Math.max(1, boxH(plot));
  const px = (t: number): number => plot.left + (t / tMax) * pw;
  const py = (i: number): number => plot.bottom - (i / yMax) * ph;

  // 注释
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = font(lp, SEMIBOLD);
  const noteY = box.top + lp * 0.75;
  ctx.fillStyle = p.strip;
  ctx.fillText(sumText, box.left, noteY);
  ctx.fillStyle = p.curve;
  if (oneLine) {
    ctx.textAlign = 'right';
    ctx.fillText(formulaText, box.right, noteY);
  } else {
    ctx.fillText(formulaText, box.left, noteY + lp * 1.5);
  }

  // 网格与刻度
  ctx.lineWidth = 1;
  ctx.strokeStyle = p.grid;
  ctx.fillStyle = p.textSecondary;
  ctx.font = font(tp);
  ctx.textAlign = 'right';
  for (let v = 0; v <= yMax + 1e-9; v += yStep) {
    const y = py(v);
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();
    ctx.fillText(formatTick(v, yStep), plot.left - tp * 0.4, y);
  }
  const tStep = niceStep(tMax, Math.max(2, Math.floor(pw / (tp * 4))));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let t = 0; t <= tMax + 1e-9; t += tStep) {
    const x = px(t);
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();
    ctx.fillText(formatTick(t, tStep), x, plot.bottom + tp * 0.35);
  }

  // Δt 小矩形（中点取值）：已走过的填色，当前一条高亮
  const now = c.time;
  let active: { x0: number; x1: number; y: number } | null = null;
  ctx.lineWidth = type.thinStroke * 0.8;
  for (const strip of strips) {
    if (strip.t0 >= now) break;
    const tEnd = Math.min(strip.t1, now);
    const x0 = px(strip.t0);
    const x1 = px(tEnd);
    const y = py(strip.current);
    const partial = tEnd < strip.t1 - 1e-9;
    ctx.fillStyle = partial ? p.accentFill : p.stripFill;
    ctx.strokeStyle = partial ? p.accent : p.strip;
    ctx.fillRect(x0, y, x1 - x0, plot.bottom - y);
    ctx.strokeRect(x0, y, x1 - x0, plot.bottom - y);
    if (partial) active = { x0, x1: px(strip.t1), y };
  }

  // I–t 曲线：全程淡虚线 + 已走过实线
  const curveAt = (t: number): number =>
    inducedCurrent(B, L, R, chargeVelocityAt(c.profile, t));
  const drawCurve = (tEnd: number): void => {
    ctx.beginPath();
    for (let k = 0; k <= CURVE_SAMPLES; k += 1) {
      const t = (tEnd * k) / CURVE_SAMPLES;
      const x = px(t);
      const y = py(curveAt(t));
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  ctx.lineWidth = type.thinStroke;
  ctx.strokeStyle = p.curveSoft;
  ctx.setLineDash([lp * 0.35, lp * 0.3]);
  drawCurve(tMax);
  ctx.setLineDash([]);
  if (now > 0) {
    ctx.lineWidth = type.stroke;
    ctx.strokeStyle = p.curve;
    drawCurve(now);
  }

  // 坐标轴
  ctx.strokeStyle = p.textSecondary;
  ctx.lineWidth = type.thinStroke;
  drawArrow(ctx, plot.left, plot.bottom, plot.right + tp * 1.2, plot.bottom, {
    color: p.textSecondary,
    lineWidth: type.thinStroke,
    headSize: Math.max(5, tp * 0.45)
  });
  drawArrow(ctx, plot.left, plot.bottom, plot.left, plot.top - lp * 0.9, {
    color: p.textSecondary,
    lineWidth: type.thinStroke,
    headSize: Math.max(5, tp * 0.45)
  });
  label(
    ctx,
    'I / A',
    plot.left + tp * 0.4,
    plot.top - lp * 0.7,
    p.textSecondary,
    tp,
    'left',
    REGULAR
  );
  label(
    ctx,
    't / s',
    plot.right + tp * 1.5,
    plot.bottom,
    p.textSecondary,
    tp,
    'left',
    REGULAR
  );

  // 时间游标与当前点
  if (!c.finished || now > 0) {
    const x = px(now);
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = type.thinStroke;
    ctx.setLineDash([tp * 0.3, tp * 0.3]);
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = p.curve;
    ctx.beginPath();
    ctx.arc(x, py(c.current), type.marker, 0, Math.PI * 2);
    ctx.fill();
  }

  if (active && active.x1 - active.x0 > 0) {
    const mid = (active.x0 + active.x1) / 2;
    const text = 'Δq = IΔt';
    ctx.font = font(tp, SEMIBOLD);
    const tw = ctx.measureText(text).width;
    const lx = Math.min(Math.max(mid, plot.left + tw / 2), plot.right - tw / 2);
    label(ctx, text, lx, active.y - tp * 0.9, p.accent, tp);
  } else if (c.finished) {
    label(
      ctx,
      '小矩形面积之和 = q',
      (plot.left + plot.right) / 2,
      plot.top + lp * 0.4,
      p.strip,
      lp
    );
  }
  ctx.restore();
}

export function drawChargeMode(input: ChargeDrawInput): ChargeLayout {
  const { ctx, width, height, theme, state } = input;
  const p = chargePalette(theme);
  const type = chargeTypeScale(input.responsiveScale, input.contentScale);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);
  const layout = layoutCharge(width, height, type, input.occlusions);
  const strips = chargeStrips(
    state.charge.profile,
    state.magneticField,
    metalRodConstants.rodLength,
    state.resistance,
    state.strips
  );
  drawHeader(ctx, layout, type, p, state);
  drawApparatus(ctx, layout.apparatus, type, p, state);
  drawGraph(ctx, layout.graph, type, p, state, strips);
  return layout;
}
