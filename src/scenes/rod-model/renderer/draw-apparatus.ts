import type { RodState } from '../scene.sim';
import {
  arrow,
  forceArrowGeom,
  rodXToPx,
  stageMetrics,
  text,
  velocityArrowGeom,
  type Palette
} from './draw-helpers';

function drawResistor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: Palette,
  scale: number,
  font: (n: number) => number
): void {
  const hw = 10 * scale;
  const hh = 22 * scale;
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = Math.max(2, 2.6 * scale);
  ctx.strokeRect(x - hw, y - hh, hw * 2, hh * 2);
  text(ctx, 'R', x - hw - 8 * scale, y, p.gold, font(13), 'right', 700);
}

function drawCapacitor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: Palette,
  scale: number,
  font: (n: number) => number
): void {
  const gap = 8 * scale;
  const hh = 22 * scale;
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = Math.max(3, 4 * scale);
  ctx.beginPath();
  ctx.moveTo(x - gap, y - hh);
  ctx.lineTo(x - gap, y + hh);
  ctx.moveTo(x + gap, y - hh);
  ctx.lineTo(x + gap, y + hh);
  ctx.stroke();
  text(ctx, 'C', x - gap - 8 * scale, y, p.teal, font(13), 'right', 700);
}

export function drawApparatus(
  ctx: CanvasRenderingContext2D,
  state: RodState,
  width: number,
  height: number,
  p: Palette,
  scale: number,
  font: (n: number) => number
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);
  const m = stageMetrics(width, height, scale);
  const fieldH = m.fieldBottom - m.fieldTop;
  const fieldW = m.fieldRight - m.fieldLeft;

  ctx.fillStyle = `${p.fieldFill}`;
  ctx.fillRect(m.fieldLeft, m.fieldTop, fieldW, fieldH);
  ctx.strokeStyle = p.field;
  ctx.lineWidth = Math.max(1.2, 1.6 * scale);
  ctx.setLineDash([6 * scale, 4 * scale]);
  ctx.strokeRect(m.fieldLeft, m.fieldTop, fieldW, fieldH);
  ctx.setLineDash([]);

  const cols = Math.max(6, Math.round(fieldW / (26 * scale)));
  const rows = Math.max(3, Math.round(fieldH / (28 * scale)));
  ctx.fillStyle = p.field;
  ctx.font = `700 ${font(14)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const x = m.fieldLeft + ((c + 0.5) * fieldW) / cols;
      const y = m.fieldTop + ((r + 0.5) * fieldH) / rows;
      ctx.fillText('×', x, y);
    }
  }
  text(
    ctx,
    'B ⊗',
    (m.fieldLeft + m.fieldRight) / 2,
    m.fieldTop + 12 * scale,
    p.blue,
    font(13),
    'center',
    700
  );

  ctx.strokeStyle = p.rail;
  ctx.lineWidth = Math.max(5, 7 * scale);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(m.left, m.railTop);
  ctx.lineTo(m.right, m.railTop);
  ctx.moveTo(m.left, m.railBottom);
  ctx.lineTo(m.right, m.railBottom);
  ctx.stroke();
  ctx.lineCap = 'butt';

  const rodX = rodXToPx(state.position, m);
  const rodTop = m.railTop - 12 * scale;
  const rodBottom = m.railBottom + 12 * scale;
  const rodW = m.rodHalf * 2;
  ctx.fillStyle = p.rod;
  ctx.fillRect(rodX - m.rodHalf, rodTop, rodW, rodBottom - rodTop);
  ctx.strokeStyle = p.rod;
  ctx.lineWidth = Math.max(1.4, 1.8 * scale);
  ctx.strokeRect(rodX - m.rodHalf, rodTop, rodW, rodBottom - rodTop);
  text(ctx, '+', rodX, rodTop + 12 * scale, '#ffffff', font(13), 'center', 700);
  text(
    ctx,
    '−',
    rodX,
    rodBottom - 12 * scale,
    '#ffffff',
    font(13),
    'center',
    700
  );
  const rodLabelY = Math.max(m.fieldTop + 10 * scale, rodTop - 14 * scale);
  const rodLabelRight = m.right - rodX < Math.max(36 * scale, width * 0.08);
  text(
    ctx,
    '导体棒',
    rodLabelRight ? rodX - m.rodHalf - 6 * scale : rodX,
    rodLabelY,
    p.rod,
    font(12),
    rodLabelRight ? 'right' : 'center',
    700
  );

  ctx.strokeStyle = p.muted;
  ctx.lineWidth = Math.max(2, 2.6 * scale);
  ctx.setLineDash([7 * scale, 5 * scale]);
  ctx.beginPath();
  ctx.moveTo(m.circuitX, m.railTop);
  ctx.lineTo(rodX, m.railTop);
  ctx.moveTo(m.circuitX, m.railBottom);
  ctx.lineTo(rodX, m.railBottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(m.circuitX, m.railTop);
  ctx.lineTo(m.circuitX, m.railBottom);
  ctx.stroke();
  const midY = (m.railTop + m.railBottom) / 2;
  if (state.params.model === 'resistor') {
    drawResistor(ctx, m.circuitX, midY, p, scale, font);
  } else {
    drawCapacitor(ctx, m.circuitX, midY, p, scale, font);
  }

  const forceArrow = forceArrowGeom(
    state.position,
    state.params.externalForce,
    width,
    height,
    scale
  );
  arrow(
    ctx,
    forceArrow.x1,
    forceArrow.y,
    forceArrow.x2,
    forceArrow.y,
    p.red,
    Math.max(2.2, 3 * scale),
    8 * scale
  );
  text(
    ctx,
    'F',
    forceArrow.labelX,
    forceArrow.y,
    p.red,
    font(13),
    forceArrow.labelAlign,
    700
  );

  if (state.velocity > 0.02) {
    const velArrow = velocityArrowGeom(
      state.position,
      state.velocity,
      width,
      height,
      scale
    );
    arrow(
      ctx,
      velArrow.x1,
      velArrow.y,
      velArrow.x2,
      velArrow.y,
      p.teal,
      Math.max(1.8, 2.4 * scale),
      7 * scale
    );
    text(
      ctx,
      'v',
      velArrow.labelX,
      velArrow.y,
      p.teal,
      font(12),
      velArrow.labelAlign,
      700
    );
  }

  if (Math.abs(state.magneticForce) > 0.02) {
    const minAmp = Math.max(20 * scale, 16);
    const ampLen = Math.max(
      minAmp,
      Math.min(
        width * 0.16,
        16 * scale + 8 * scale * Math.abs(state.magneticForce)
      )
    );
    const labelOffset = Math.max(11 * scale, 10);
    const ampY = Math.min(
      rodBottom + Math.max(16 * scale, height * 0.045),
      Math.max(
        rodBottom + 8 * scale,
        Math.min(m.fieldBottom, height) - labelOffset - 4 * scale
      )
    );
    const leftLimit = m.left + Math.max(8 * scale, 6);
    let ampStart = rodX;
    let ampEnd = ampStart - ampLen;
    if (ampEnd < leftLimit) {
      ampEnd = leftLimit;
      ampStart = Math.max(ampEnd + minAmp, rodX + m.rodHalf);
    }
    if (ampStart - ampEnd > 2) {
      arrow(
        ctx,
        ampStart,
        ampY,
        ampEnd,
        ampY,
        p.blue,
        Math.max(2, 2.8 * scale),
        8 * scale
      );
      text(
        ctx,
        'F安',
        (ampStart + ampEnd) / 2,
        ampY + labelOffset,
        p.blue,
        font(12),
        'center',
        700
      );
    }
  }
}
