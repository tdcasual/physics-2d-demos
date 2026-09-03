/**
 * 游标卡尺 — 场景渲染
 *
 * 标准构造（人教版必修第三册 §11.3）：主尺 + 游标尺 + 内/外测量爪 +
 * 深度尺 + 紧固螺钉 + 被测物。drawVernierCaliper 纯绘制函数，
 * 供 scene.view.ts 调用（原 instruments/vernier-caliper 仪器的渲染
 * 代码；该仪器组件已由 vernier-caliper-guide 取代并移除，场景渲染
 * 收归场景自身）。
 */

import type { TeachingTheme } from '../../platform/standards';
import { pathRoundRect } from '../../core/draw-primitives';

type Pal = {
  isDark: boolean;
  metalLight: string;
  metalMid: string;
  metalDark: string;
  jaw: string;
  edge: string;
  tick: string;
  tickNum: string;
  accent: string;
  accentGlow: string;
  object: string;
  text: string;
  dim: string;
  panelBg: string;
  panelBorder: string;
};

function palette(theme: TeachingTheme): Pal {
  const isDark = theme === 'dark';
  return {
    isDark,
    metalLight: isDark ? '#cbd5e1' : '#f1f5f9',
    metalMid: isDark ? '#94a3b8' : '#cbd5e1',
    metalDark: isDark ? '#64748b' : '#94a3b8',
    jaw: isDark ? '#475569' : '#64748b',
    edge: isDark ? '#334155' : '#475569',
    tick: isDark ? '#1e293b' : '#334155',
    tickNum: isDark ? '#0f172a' : '#1e293b',
    accent: isDark ? '#fbbf24' : '#e11d48',
    accentGlow: isDark ? 'rgba(251,191,36,0.5)' : 'rgba(225,29,72,0.4)',
    object: isDark ? '#fb7185' : '#e11d48',
    text: isDark ? '#e2e8f0' : '#1e293b',
    dim: isDark ? '#94a3b8' : '#64748b',
    panelBg: isDark ? 'rgba(15,23,42,0.78)' : 'rgba(255,255,255,0.9)',
    panelBorder: isDark ? 'rgba(148,163,184,0.28)' : 'rgba(100,116,139,0.22)'
  };
}

const FONT = '"Noto Sans SC", system-ui, sans-serif';

/** 绘制所需的最小状态结构（场景 state 满足） */
export type VernierCaliperReading = {
  objectName: string;
  objectSize: number;
  jawPosition: number;
  mainScaleReading: number;
  vernierAlignment: number;
  totalReading: number;
  vernierDivisions: number;
  vernierLength: number;
  precision: number;
};

export type VernierCaliperDrawOptions = {
  ctx: CanvasRenderingContext2D;
  region: { x: number; y: number; w: number; h: number };
  state: VernierCaliperReading;
  theme: TeachingTheme;
  contentScale?: number;
  showReading?: boolean;
};

function metalV(
  ctx: CanvasRenderingContext2D,
  P: Pal,
  y: number,
  h: number
): CanvasGradient {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, P.metalDark);
  g.addColorStop(0.3, P.metalLight);
  g.addColorStop(0.55, P.metalMid);
  g.addColorStop(0.8, P.metalLight);
  g.addColorStop(1, P.metalDark);
  return g;
}

export function drawVernierCaliper(o: VernierCaliperDrawOptions): void {
  const { ctx, region, state, theme } = o;
  const contentScale = o.contentScale ?? 1;
  const showReading = o.showReading ?? true;
  const P = palette(theme);
  const s = Math.max(0.3, Math.min(1.5, Math.min(region.w, region.h) / 320));
  const fs = s * contentScale;
  const { w, h } = region;
  const ox = region.x;
  const oy = region.y;

  const {
    jawPosition,
    objectSize,
    objectName,
    mainScaleReading,
    vernierAlignment,
    totalReading,
    vernierDivisions,
    vernierLength,
    precision
  } = state;

  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, w, h);
  ctx.clip();

  const mmToPx = 8 * s;
  const mainScaleStartX = ox + w * 0.08;
  const mainScaleLen = 50 * mmToPx;
  const mainScaleH = 26 * s;
  const mainScaleY = oy + h * (showReading ? 0.3 : 0.4);

  const vernierW = vernierLength * mmToPx;
  const vernierH = 24 * s;
  const vernierX = mainScaleStartX + jawPosition * mmToPx;
  const vernierY = mainScaleY - 6 * s;

  const jawW = 5 * s;
  const upperJawH = 20 * s;
  const lowerJawH = 28 * s;

  // 1. 深度尺
  const depthW = 4 * s;
  const depthLen = 35 * s;
  const depthX = vernierX + vernierW;
  const depthY = mainScaleY + mainScaleH;
  ctx.fillStyle = metalV(ctx, P, depthY, depthLen);
  ctx.fillRect(depthX, depthY, depthW, depthLen);
  ctx.strokeStyle = P.edge;
  ctx.lineWidth = 1 * s;
  ctx.strokeRect(depthX, depthY, depthW, depthLen);

  // 2. 主尺体（金属渐变）
  ctx.fillStyle = metalV(ctx, P, mainScaleY, mainScaleH);
  ctx.fillRect(mainScaleStartX, mainScaleY, mainScaleLen, mainScaleH);
  ctx.strokeStyle = P.edge;
  ctx.lineWidth = 1.5 * s;
  ctx.strokeRect(mainScaleStartX, mainScaleY, mainScaleLen, mainScaleH);

  // 3. 主尺刻度
  ctx.strokeStyle = P.tick;
  ctx.fillStyle = P.tickNum;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${Math.max(8, 10 * fs)}px ${FONT}`;
  for (let mm = 0; mm <= 80; mm += 1) {
    const x = mainScaleStartX + mm * mmToPx;
    if (x > mainScaleStartX + mainScaleLen) break;
    const tickH = mm % 10 === 0 ? 12 * s : mm % 5 === 0 ? 8 * s : 5 * s;
    ctx.lineWidth = mm % 10 === 0 ? 1.5 * s : 1 * s;
    ctx.beginPath();
    ctx.moveTo(x, mainScaleY + mainScaleH);
    ctx.lineTo(x, mainScaleY + mainScaleH - tickH);
    ctx.stroke();
    if (mm % 10 === 0 && mm < 80) {
      ctx.fillText(String(mm), x, mainScaleY + mainScaleH - tickH - 3 * s);
    }
  }

  // 4. 主尺测量爪
  const drawJaw = (x: number, topY: number, jawH: number, knifeDir: number) => {
    ctx.fillStyle = P.jaw;
    ctx.fillRect(x, topY, jawW, jawH);
    ctx.strokeStyle = P.edge;
    ctx.lineWidth = 1 * s;
    ctx.strokeRect(x, topY, jawW, jawH);
    ctx.beginPath();
    const kx = knifeDir > 0 ? x + jawW : x;
    ctx.moveTo(kx, topY);
    ctx.lineTo(kx + knifeDir * 5 * s, topY + 3 * s);
    ctx.lineTo(kx + knifeDir * 5 * s, topY + 9 * s);
    ctx.lineTo(kx, topY + 12 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  drawJaw(mainScaleStartX - jawW, mainScaleY + mainScaleH, lowerJawH, 0);
  drawJaw(mainScaleStartX - jawW, mainScaleY - upperJawH, upperJawH, 1);

  // 5. 游标尺体（金属渐变）
  ctx.fillStyle = metalV(ctx, P, vernierY, vernierH);
  ctx.fillRect(vernierX, vernierY, vernierW, vernierH);
  ctx.strokeStyle = P.edge;
  ctx.lineWidth = 1.5 * s;
  ctx.strokeRect(vernierX, vernierY, vernierW, vernierH);

  // 6. 游标刻度 + 对齐格高亮
  ctx.font = `${Math.max(7, 9 * fs)}px ${FONT}`;
  for (let k = 0; k <= vernierDivisions; k += 1) {
    const x = vernierX + k * (vernierLength / vernierDivisions) * mmToPx;
    const isAligned = k === vernierAlignment;
    if (isAligned) {
      ctx.save();
      ctx.shadowColor = P.accentGlow;
      ctx.shadowBlur = 6 * s;
      ctx.strokeStyle = P.accent;
      ctx.lineWidth = 2.6 * s;
      ctx.beginPath();
      ctx.moveTo(x, vernierY + vernierH);
      ctx.lineTo(x, vernierY + vernierH - 16 * s);
      ctx.stroke();
      ctx.restore();
    } else {
      const tickH = k % 5 === 0 ? 10 * s : 6 * s;
      ctx.strokeStyle = P.tick;
      ctx.lineWidth = k % 5 === 0 ? 1.2 * s : 0.8 * s;
      ctx.beginPath();
      ctx.moveTo(x, vernierY + vernierH);
      ctx.lineTo(x, vernierY + vernierH - tickH);
      ctx.stroke();
    }
    if (k % 5 === 0 && k < vernierDivisions && !isAligned) {
      ctx.fillStyle = P.tickNum;
      ctx.textAlign = 'center';
      ctx.fillText(
        String(k),
        x,
        vernierY + vernierH - (k % 5 === 0 ? 10 : 6) * s - 3 * s
      );
    }
  }

  // 7. 游标零线高亮
  ctx.save();
  ctx.shadowColor = P.accentGlow;
  ctx.shadowBlur = 5 * s;
  ctx.strokeStyle = P.accent;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(vernierX, vernierY);
  ctx.lineTo(vernierX, vernierY + vernierH);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = P.accent;
  ctx.font = `700 ${Math.max(8, 10 * fs)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('0', vernierX, vernierY - 4 * s);

  // 8. 游标测量爪
  drawJaw(vernierX - jawW, vernierY + vernierH, lowerJawH, 0);
  drawJaw(vernierX - jawW, vernierY - upperJawH, upperJawH, -1);

  // 9. 被测物
  const objectCenterX = (mainScaleStartX + vernierX) / 2;
  const objectY = mainScaleY + mainScaleH + lowerJawH / 2;
  ctx.fillStyle = P.object;
  ctx.strokeStyle = P.edge;
  ctx.lineWidth = 1 * s;
  if (objectName.includes('小球')) {
    const ballR = Math.min((objectSize / 2) * mmToPx, lowerJawH * 0.4);
    ctx.beginPath();
    ctx.arc(objectCenterX, objectY, ballR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (objectName.includes('金属块')) {
    const blockW = Math.min(
      objectSize * mmToPx,
      vernierX - mainScaleStartX - 2 * s
    );
    const blockH = Math.min(16 * s, lowerJawH - 4 * s);
    ctx.fillRect(
      objectCenterX - blockW / 2,
      objectY - blockH / 2,
      blockW,
      blockH
    );
    ctx.strokeRect(
      objectCenterX - blockW / 2,
      objectY - blockH / 2,
      blockW,
      blockH
    );
  } else {
    const tubeOuterR = Math.min((objectSize / 2 + 2) * mmToPx, lowerJawH * 0.4);
    ctx.beginPath();
    ctx.arc(objectCenterX, objectY, tubeOuterR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 10. 紧固螺钉
  const screwR = 5 * s;
  const screwX = vernierX + vernierW * 0.65;
  const screwY = vernierY - 12 * s;
  ctx.fillStyle = P.isDark ? '#1e293b' : '#475569';
  ctx.beginPath();
  ctx.arc(screwX, screwY, screwR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = P.edge;
  ctx.lineWidth = 1 * s;
  ctx.stroke();
  ctx.strokeStyle = P.isDark ? '#64748b' : '#1e293b';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(screwX - screwR * 0.6, screwY);
  ctx.lineTo(screwX + screwR * 0.6, screwY);
  ctx.stroke();

  // 11. 读数面板
  if (showReading) {
    const decimals = precision === 0.1 ? 1 : 2;
    const readStr = `${totalReading.toFixed(decimals)} mm`;
    const subStr = `主尺 ${mainScaleReading} + 游标 ${vernierAlignment}×${precision} = ${totalReading.toFixed(decimals)} mm`;
    const objStr = `${objectName} · 精度 ${precision} mm`;
    const readFont = Math.max(20, 34 * fs);
    const subFont = Math.max(10, 13 * fs);
    ctx.font = `700 ${readFont}px ${FONT}`;
    const readW = ctx.measureText(readStr).width;
    ctx.font = `${subFont}px ${FONT}`;
    const subW = Math.max(
      ctx.measureText(subStr).width,
      ctx.measureText(objStr).width
    );
    const panelW = Math.max(readW, subW) + 48 * s;
    const panelH = readFont + subFont * 2 + 40 * s;
    const px0 = ox + (w - panelW) / 2;
    const py0 = oy + h * 0.72;
    ctx.fillStyle = P.panelBg;
    pathRoundRect(ctx, px0, py0, panelW, panelH, 10 * s);
    ctx.fill();
    ctx.strokeStyle = P.panelBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = P.accent;
    ctx.font = `700 ${readFont}px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(readStr, ox + w / 2, py0 + readFont * 0.6 + 8 * s);
    ctx.fillStyle = P.dim;
    ctx.font = `${subFont}px ${FONT}`;
    ctx.fillText(subStr, ox + w / 2, py0 + readFont + subFont * 0.7 + 16 * s);
    ctx.fillText(objStr, ox + w / 2, py0 + readFont + subFont * 1.7 + 22 * s);
  }

  ctx.restore();
}
