/**
 * 劈尖干涉 — 主 canvas 底部的竖直干涉条纹
 */

import type { WedgeState } from '../scene.sim';
import type { WedgeViewContext } from './types';
import { hexToRgb } from './view-utils';

// 条纹带离屏缓存：条纹仅依赖 (lambda, theta, L, accent, 条纹区几何, dpr)，
// 与 cursorX/时间无关。key 未变时按设备像素 1:1 blit，避免每帧 ~342 次
// Math.tan/Math.sin + 模板字符串分配 + 独立 fillRect。
// 离屏 canvas 原点对齐到设备像素整数格，内容以与直接绘制完全相同的
// CSS 绝对坐标渲染（transform 平移整数个设备像素），保证像素级一致。
let fringeCache: {
  key: string;
  canvas: HTMLCanvasElement;
  devOX: number; // blit 目标原点（设备像素，整数对齐）
  devOY: number;
} | null = null;

function drawStripeBand(
  c: CanvasRenderingContext2D,
  leftX: number,
  rightX: number,
  stripeTop: number,
  stripeH: number,
  displayL: number,
  thetaRad: number,
  lambda: number,
  color: { r: number; g: number; b: number }
): void {
  const stripeW = rightX - leftX;
  // 绘制竖直条纹（水平方向对应位置 x，垂直方向为条纹高度）
  for (let px = leftX; px <= rightX; px += 2) {
    const x = ((px - leftX) / stripeW) * displayL; // mm
    const d = x * Math.tan(thetaRad) * 1e6; // nm
    const phase = (2 * Math.PI * d) / lambda;
    const intensity = Math.sin(phase) ** 2;
    const brightness = intensity * 255;

    const r = Math.min(255, color.r + brightness * 0.3);
    const g = Math.min(255, color.g + brightness * 0.3);
    const b = Math.min(255, color.b + brightness * 0.3);

    c.fillStyle = `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
    c.fillRect(px, stripeTop, 2, stripeH);
  }
}

export function drawFringeOnMainCanvas(
  vc: WedgeViewContext,
  next: WedgeState,
  g: {
    text: string;
    dim: string;
    accent: string;
    leftX: number;
    rightX: number;
    scale: number;
    modeScale: number;
  }
): void {
  const c = vc.ctx;
  if (!c) return;
  const { text, accent, leftX, rightX, scale, modeScale } = g;
  const h = vc.cssHeight;

  const stripeTop = h * 0.6;
  const stripeH = h * 0.18;
  const stripeW = rightX - leftX;

  c.save();

  // 标题
  c.fillStyle = text;
  c.font = `${Math.max(9, 11 * scale * modeScale)}px sans-serif`;
  c.textAlign = 'left';
  c.fillText('干涉条纹（等厚线）', leftX, stripeTop - 6 * scale);

  // 物理参数
  const lambda = next.params.lambda;
  const thetaRad = next.params.theta * (Math.PI / 180);
  const fringeSpacing = (lambda * 1e-6) / (2 * Math.sin(thetaRad)); // mm
  const L = next.params.L * 10; // cm -> mm

  // 自适应显示范围：保证约 6~15 条亮纹可见
  const rawFringes = L / fringeSpacing;
  let displayL: number;
  if (rawFringes < 6) {
    displayL = fringeSpacing * 8;
  } else if (rawFringes > 15) {
    displayL = fringeSpacing * 12;
  } else {
    displayL = L;
  }
  const color = hexToRgb(accent);

  // 条纹带离屏缓存（key 覆盖条纹画面的全部输入）
  const dpr = vc.dpr;
  const cacheKey = `${lambda}|${next.params.theta}|${next.params.L}|${accent}|${leftX}|${rightX}|${stripeTop}|${stripeH}|${dpr}`;
  // 条纹列 fillRect(px, ..., 2, stripeH) 最右一列右缘可达 rightX + 2
  const devOX = Math.floor(leftX * dpr);
  const devOY = Math.floor(stripeTop * dpr);
  const devW = Math.ceil((rightX + 2) * dpr) - devOX;
  const devH = Math.ceil((stripeTop + stripeH) * dpr) - devOY;

  if (devW > 0 && devH > 0) {
    if (!fringeCache || fringeCache.key !== cacheKey) {
      const off = document.createElement('canvas');
      off.width = devW;
      off.height = devH;
      const oc = off.getContext('2d');
      if (oc) {
        // 平移整数个设备像素，绘制坐标与直接绘制完全一致
        oc.setTransform(dpr, 0, 0, dpr, -devOX, -devOY);
        drawStripeBand(
          oc,
          leftX,
          rightX,
          stripeTop,
          stripeH,
          displayL,
          thetaRad,
          lambda,
          color
        );
        fringeCache = {
          key: cacheKey,
          canvas: off,
          devOX,
          devOY
        };
      }
    }
    if (fringeCache && fringeCache.key === cacheKey) {
      // 设备像素 1:1 blit（identity transform + 整数原点），无重采样
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(fringeCache.canvas, fringeCache.devOX, fringeCache.devOY);
      c.restore();
    } else {
      // 离屏 2d context 不可用时回退直接绘制
      drawStripeBand(
        c,
        leftX,
        rightX,
        stripeTop,
        stripeH,
        displayL,
        thetaRad,
        lambda,
        color
      );
    }
  }

  // 边框
  c.strokeStyle = text;
  c.lineWidth = 1 * scale;
  c.strokeRect(leftX, stripeTop, stripeW, stripeH);

  // 级次标注（竖直条纹：m 标注在条纹下方，密度自适应）
  c.fillStyle = text;
  c.textAlign = 'center';
  c.font = `${Math.max(8, 10 * scale * modeScale)}px sans-serif`;
  const labelStep =
    fringeSpacing < 0.02
      ? 10
      : fringeSpacing < 0.05
        ? 5
        : fringeSpacing < 0.15
          ? 2
          : 1;
  for (let m = 0; m < 100; m++) {
    const xPos = m * fringeSpacing;
    if (xPos > displayL) break;
    if (m % labelStep !== 0) continue;
    const px = leftX + (xPos / displayL) * stripeW;
    c.fillText(`m=${m}`, px, stripeTop + stripeH + 12 * scale);
  }

  // 条纹间距标注
  c.fillStyle = text;
  c.font = `${Math.max(9, 11 * scale * modeScale)}px sans-serif`;
  c.textAlign = 'left';
  c.fillText(
    `显示范围: 0 ~ ${displayL.toFixed(2)} mm   条纹间距 l = ${fringeSpacing.toFixed(3)} mm`,
    leftX,
    stripeTop + stripeH + 26 * scale
  );

  c.restore();
}
