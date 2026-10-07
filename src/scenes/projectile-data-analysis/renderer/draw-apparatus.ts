import {
  BALL_RADIUS_CM,
  CHUTE_FLAT_CM,
  CHUTE_RADIUS_CM,
  PAPER_HEIGHT_CM,
  PAPER_WIDTH_CM,
  RELEASE_H_MAX_CM,
  RELEASE_H_MIN_CM,
  chutePoint,
  releaseAngle,
  rotateAboutEnd,
  type ProjectileLabState
} from '../scene.sim';
import {
  PAPER_MARGIN_CM,
  type LabPalette,
  type StageTransform
} from './draw-paper';

/** 实验器外廓（cm，白纸坐标系）：定位板、底座与调平螺丝。 */
const BOARD_LEFT_CM = -(CHUTE_FLAT_CM + CHUTE_RADIUS_CM + 4);
const BOARD_RIGHT_CM = PAPER_WIDTH_CM + 3.5;
const BOARD_TOP_CM = -(CHUTE_RADIUS_CM + 4);
const BOARD_BOTTOM_CM = PAPER_HEIGHT_CM + 2;
const BASE_HEIGHT_CM = 2.2;
const FOOT_HEIGHT_CM = 1.6;

/** 实验视图的取景范围（cm）。 */
export const APPARATUS_BOUNDS = {
  left: BOARD_LEFT_CM - 3,
  right: BOARD_RIGHT_CM + 3,
  top: BOARD_TOP_CM - 1.5,
  bottom: BOARD_BOTTOM_CM + BASE_HEIGHT_CM + FOOT_HEIGHT_CM + 1
} as const;

/** 斜槽槽体厚度与球心到槽面的偏移（cm）。 */
const TRACK_THICKNESS_CM = 0.9;
const TRACK_OFFSET_CM = BALL_RADIUS_CM + TRACK_THICKNESS_CM / 2;
const PLATE_THICKNESS_CM = 1.2;
const RAIL_WIDTH_CM = 0.9;
const RAIL_X_CM = PAPER_WIDTH_CM + 1.2;

export type DrawApparatusInput = {
  ctx: CanvasRenderingContext2D;
  t: StageTransform;
  palette: LabPalette;
  state: ProjectileLabState;
  fontPx: number;
};

function rectCm(
  ctx: CanvasRenderingContext2D,
  t: StageTransform,
  left: number,
  top: number,
  right: number,
  bottom: number
): void {
  ctx.fillRect(
    t.px(left),
    t.py(top),
    t.px(right) - t.px(left),
    t.py(bottom) - t.py(top)
  );
}

/** 定位板、底座、调平螺丝与挡板导轨（画在白纸之下）。 */
export function drawBoard(input: DrawApparatusInput): void {
  const { ctx, t, palette } = input;
  const baseTop = BOARD_BOTTOM_CM;
  const baseBottom = baseTop + BASE_HEIGHT_CM;

  ctx.fillStyle = palette.board;
  rectCm(ctx, t, BOARD_LEFT_CM, BOARD_TOP_CM, BOARD_RIGHT_CM, BOARD_BOTTOM_CM);
  ctx.strokeStyle = palette.boardEdge;
  ctx.lineWidth = Math.max(1, t.pxPerCm * 0.12);
  ctx.strokeRect(
    t.px(BOARD_LEFT_CM),
    t.py(BOARD_TOP_CM),
    t.px(BOARD_RIGHT_CM) - t.px(BOARD_LEFT_CM),
    t.py(BOARD_BOTTOM_CM) - t.py(BOARD_TOP_CM)
  );

  ctx.fillStyle = palette.base;
  rectCm(ctx, t, BOARD_LEFT_CM - 2, baseTop, BOARD_RIGHT_CM + 2, baseBottom);
  ctx.fillStyle = palette.metalDark;
  for (const x of [BOARD_LEFT_CM + 1.5, BOARD_RIGHT_CM - 1.5]) {
    rectCm(ctx, t, x - 0.5, baseBottom, x + 0.5, baseBottom + FOOT_HEIGHT_CM);
    rectCm(
      ctx,
      t,
      x - 1.3,
      baseBottom + FOOT_HEIGHT_CM - 0.5,
      x + 1.3,
      baseBottom + FOOT_HEIGHT_CM
    );
  }

  // 挡板导轨：右侧带刻槽的立柱。
  ctx.fillStyle = palette.metal;
  rectCm(ctx, t, RAIL_X_CM, 1, RAIL_X_CM + RAIL_WIDTH_CM, PAPER_HEIGHT_CM);
  ctx.strokeStyle = palette.metalDark;
  ctx.lineWidth = Math.max(0.5, t.pxPerCm * 0.04);
  for (let y = 2; y < PAPER_HEIGHT_CM; y += 2) {
    ctx.beginPath();
    ctx.moveTo(t.px(RAIL_X_CM), t.py(y));
    ctx.lineTo(t.px(RAIL_X_CM + RAIL_WIDTH_CM * 0.5), t.py(y));
    ctx.stroke();
  }
}

function drawChute(input: DrawApparatusInput): void {
  const { ctx, t, palette, state } = input;
  const cx = t.px(-CHUTE_FLAT_CM);
  const cy = t.py(-CHUTE_RADIUS_CM);
  const trackRadius = (CHUTE_RADIUS_CM + TRACK_OFFSET_CM) * t.pxPerCm;
  const topAngle = releaseAngle(RELEASE_H_MAX_CM) + 0.16;

  // 整条斜槽绕槽口 O 转过末端倾角（画布 y 向下，上翘为逆时针）。
  ctx.save();
  ctx.translate(t.px(0), t.py(0));
  ctx.rotate((-state.params.chuteTilt * Math.PI) / 180);
  ctx.translate(-t.px(0), -t.py(0));

  // 槽体：末端水平段 + 圆弧段（圆心在槽的上方，θ 自最低点起算）。
  ctx.strokeStyle = palette.metal;
  ctx.lineWidth = TRACK_THICKNESS_CM * t.pxPerCm;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(t.px(0), t.py(TRACK_OFFSET_CM));
  ctx.lineTo(cx, t.py(TRACK_OFFSET_CM));
  ctx.arc(cx, cy, trackRadius, Math.PI / 2, Math.PI / 2 + topAngle, false);
  ctx.stroke();

  // 槽面高光，让槽体看起来是一条金属轨。
  ctx.strokeStyle = palette.metalDark;
  ctx.lineWidth = Math.max(0.6, t.pxPerCm * 0.08);
  const edgeRadius = (CHUTE_RADIUS_CM + BALL_RADIUS_CM) * t.pxPerCm;
  ctx.beginPath();
  ctx.moveTo(t.px(0), t.py(BALL_RADIUS_CM));
  ctx.lineTo(cx, t.py(BALL_RADIUS_CM));
  ctx.arc(cx, cy, edgeRadius, Math.PI / 2, Math.PI / 2 + topAngle, false);
  ctx.stroke();

  // 释放高度刻线（每 1 cm 一条）。
  for (let h = RELEASE_H_MIN_CM; h <= RELEASE_H_MAX_CM; h += 1) {
    const angle = Math.PI / 2 + releaseAngle(h);
    const inner = trackRadius + (TRACK_THICKNESS_CM / 2) * t.pxPerCm;
    const outer = inner + (h % 2 === 0 ? 0.8 : 0.45) * t.pxPerCm;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.stroke();
  }

  if (!state.params.useLocator) {
    ctx.restore();
    return;
  }
  // 定位卡：卡在释放位置上方，保证每次都从同一处由静止释放。
  const stopAngle =
    Math.PI / 2 +
    releaseAngle(state.params.releaseH) +
    (BALL_RADIUS_CM + 0.45) / CHUTE_RADIUS_CM;
  const stopInner = (CHUTE_RADIUS_CM - BALL_RADIUS_CM - 0.4) * t.pxPerCm;
  const stopOuter =
    (CHUTE_RADIUS_CM + TRACK_OFFSET_CM + TRACK_THICKNESS_CM) * t.pxPerCm;
  ctx.strokeStyle = palette.locator;
  ctx.lineWidth = Math.max(2, t.pxPerCm * 0.7);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(
    cx + Math.cos(stopAngle) * stopInner,
    cy + Math.sin(stopAngle) * stopInner
  );
  ctx.lineTo(
    cx + Math.cos(stopAngle) * stopOuter,
    cy + Math.sin(stopAngle) * stopOuter
  );
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.restore();
}

function drawPlumbLine(input: DrawApparatusInput): void {
  const { ctx, t, palette } = input;
  const top = TRACK_OFFSET_CM + TRACK_THICKNESS_CM / 2;
  const bobTop = PAPER_HEIGHT_CM - 5;
  const bobHalf = 0.7;
  ctx.strokeStyle = palette.plumb;
  ctx.fillStyle = palette.plumb;
  ctx.lineWidth = Math.max(1, t.pxPerCm * 0.06);
  ctx.beginPath();
  ctx.moveTo(t.px(0), t.py(top));
  ctx.lineTo(t.px(0), t.py(bobTop));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(t.px(-bobHalf), t.py(bobTop));
  ctx.lineTo(t.px(bobHalf), t.py(bobTop));
  ctx.lineTo(t.px(0), t.py(bobTop + 2.4));
  ctx.closePath();
  ctx.fill();
}

function drawPlate(input: DrawApparatusInput): void {
  const { ctx, t, palette, state } = input;
  const surface = state.params.plateY + BALL_RADIUS_CM;
  const left = -PAPER_MARGIN_CM + 1;
  const right = RAIL_X_CM + RAIL_WIDTH_CM + 0.6;
  const lip = PLATE_THICKNESS_CM * 0.38;

  // 俯视可见的斜面（向定位板一侧倾斜）+ 正面侧壁。
  ctx.fillStyle = palette.plateTop;
  ctx.beginPath();
  ctx.moveTo(t.px(left + 0.6), t.py(surface));
  ctx.lineTo(t.px(right), t.py(surface));
  ctx.lineTo(t.px(right), t.py(surface + lip));
  ctx.lineTo(t.px(left), t.py(surface + lip));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = palette.plateSide;
  rectCm(ctx, t, left, surface + lip, right, surface + PLATE_THICKNESS_CM);

  // 导轨上的滑块。
  ctx.fillStyle = palette.metalDark;
  rectCm(
    ctx,
    t,
    RAIL_X_CM - 0.3,
    surface - 0.5,
    RAIL_X_CM + RAIL_WIDTH_CM + 0.3,
    surface + PLATE_THICKNESS_CM + 0.5
  );
}

function drawBall(input: DrawApparatusInput): void {
  const { ctx, t, palette, state } = input;
  const x = t.px(state.ball.x);
  const y = t.py(state.ball.y);
  const r = Math.max(2.5, BALL_RADIUS_CM * t.pxPerCm);

  if (state.phase === 'flying' && state.flightTrail.length > 1) {
    ctx.strokeStyle = palette.trail;
    ctx.lineWidth = Math.max(1, t.pxPerCm * 0.08);
    ctx.setLineDash([t.pxPerCm * 0.5, t.pxPerCm * 0.4]);
    ctx.beginPath();
    state.flightTrail.forEach((point, i) => {
      if (i === 0) ctx.moveTo(t.px(point.x), t.py(point.y));
      else ctx.lineTo(t.px(point.x), t.py(point.y));
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const gradient = ctx.createRadialGradient(
    x - r * 0.35,
    y - r * 0.35,
    r * 0.1,
    x,
    y,
    r
  );
  gradient.addColorStop(0, palette.ballLight);
  gradient.addColorStop(1, palette.ballDark);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawLabels(input: DrawApparatusInput): void {
  const { ctx, t, palette, state, fontPx } = input;
  const label = (
    text: string,
    xCm: number,
    yCm: number,
    align: CanvasTextAlign
  ): void => {
    ctx.textAlign = align;
    ctx.fillText(text, t.px(xCm), t.py(yCm));
  };
  ctx.font = `${fontPx}px ui-sans-serif, sans-serif`;
  ctx.textBaseline = 'middle';

  // 定位板木面上的文字。
  ctx.fillStyle = palette.text;
  label('定位板（白纸 + 复写纸）', 4, BOARD_TOP_CM / 2 - 2, 'left');
  label('斜槽', -CHUTE_FLAT_CM - 3, -CHUTE_RADIUS_CM * 0.3, 'center');
  const rest = rotateAboutEnd(
    chutePoint(releaseAngle(state.params.releaseH)),
    state.params.chuteTilt
  );
  if (state.params.useLocator) {
    label('定位卡', rest.x + 2.6, rest.y - 2.6, 'left');
  }
  if (state.phase === 'idle') label('小钢球', rest.x + 2, rest.y + 0.2, 'left');
  if (state.params.chuteTilt !== 0) {
    label(
      state.params.chuteTilt > 0 ? '末端上翘' : '末端下倾',
      -CHUTE_FLAT_CM,
      TRACK_OFFSET_CM + 3.4,
      'center'
    );
  }

  // 白纸上的文字。
  ctx.fillStyle = palette.ink;
  label('铅垂线', 0.9, PAPER_HEIGHT_CM - 7.5, 'left');
  label(
    '倾斜挡板',
    PAPER_WIDTH_CM - 0.8,
    state.params.plateY + BALL_RADIUS_CM - 1.1,
    'right'
  );
}

/** 画在白纸之上的器材：斜槽、定位卡、铅垂线、倾斜挡板、小钢球与标注。 */
export function drawApparatus(input: DrawApparatusInput): void {
  drawPlumbLine(input);
  drawChute(input);
  drawPlate(input);
  drawBall(input);
  if (input.state.params.showLabels) drawLabels(input);
}
