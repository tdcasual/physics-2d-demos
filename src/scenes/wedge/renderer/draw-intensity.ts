/**
 * 劈尖干涉 — 光强曲线（几何图下方，紧凑）
 */

import type { WedgeState } from '../scene.sim';
import type { WedgeViewContext } from './types';

// 光强曲线静态层（坐标轴 + 曲线 + x/I 标签）离屏缓存：
// 静态于 (lambda, theta, L, 曲线区几何, scale/modeScale, 主题色, dpr)，
// 与 cursorX 无关；光标竖线每帧在 blit 之上直绘。
// 离屏原点对齐设备像素整数格、内容按相同 CSS 绝对坐标渲染，保证像素级一致。
let intensityCache: {
  key: string;
  canvas: HTMLCanvasElement;
  devOX: number; // blit 目标原点（设备像素，整数对齐）
  devOY: number;
} | null = null;

function drawIntensityStatic(
  c: CanvasRenderingContext2D,
  state: WedgeState,
  g: {
    text: string;
    dim: string;
    accent: string;
    leftX: number;
    rightX: number;
    curveTop: number;
    curveBot: number;
    scale: number;
    modeScale: number;
  }
): void {
  const {
    text,
    dim,
    accent,
    leftX,
    rightX,
    curveTop,
    curveBot,
    scale,
    modeScale
  } = g;
  const curveH = curveBot - curveTop;

  c.strokeStyle = dim;
  c.lineWidth = 1 * scale;

  // 坐标轴
  c.beginPath();
  c.moveTo(leftX, curveBot);
  c.lineTo(rightX, curveBot);
  c.stroke();
  c.beginPath();
  c.moveTo(leftX, curveTop);
  c.lineTo(leftX, curveBot);
  c.stroke();

  // 光强曲线
  c.strokeStyle = accent;
  c.lineWidth = 1.5 * scale * modeScale;
  c.beginPath();
  const lambda = state.params.lambda;
  const thetaRad = state.params.theta * (Math.PI / 180);
  const L = state.params.L * 10; // mm

  for (let px = leftX; px <= rightX; px += 2) {
    const x = ((px - leftX) / (rightX - leftX)) * L; // mm
    const d = x * Math.tan(thetaRad) * 1e6; // nm
    const phase = (2 * Math.PI * d) / lambda;
    const intensity = Math.sin(phase) ** 2;
    const py = curveBot - intensity * curveH * 0.85;
    if (px === leftX) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.stroke();

  // 标签
  c.fillStyle = text;
  c.font = `${Math.max(9, 11 * scale * modeScale)}px sans-serif`;
  c.textAlign = 'center';
  c.fillText('x', (leftX + rightX) / 2, curveBot + 14 * scale);
  c.textAlign = 'right';
  c.fillText('I', leftX - 6 * scale, curveTop + 10 * scale);
}

export function drawIntensityCurve(
  vc: WedgeViewContext,
  state: WedgeState,
  g: {
    text: string;
    dim: string;
    accent: string;
    bg: string;
    leftX: number;
    rightX: number;
    botY: number;
    scale: number;
    modeScale: number;
  }
): void {
  const c = vc.ctx;
  if (!c) return;
  const { text, dim, accent, leftX, rightX, botY, scale, modeScale } = g;
  const h = vc.cssHeight;

  const curveTop = botY + 20 * scale;
  const curveBot = h * 0.56;

  c.save();

  // 静态层离屏缓存（key 覆盖静态画面的全部输入）
  const dpr = vc.dpr;
  const cacheKey = `${state.params.lambda}|${state.params.theta}|${state.params.L}|${leftX}|${rightX}|${curveTop}|${curveBot}|${scale}|${modeScale}|${text}|${dim}|${accent}|${dpr}`;
  // 区域外扩以覆盖轴线宽与 x/I 标签
  const pad = 30 * scale;
  const devOX = Math.floor((leftX - pad) * dpr);
  const devOY = Math.floor((curveTop - pad) * dpr);
  const devW = Math.ceil((rightX + pad) * dpr) - devOX;
  const devH = Math.ceil((curveBot + pad) * dpr) - devOY;

  if (devW > 0 && devH > 0) {
    if (!intensityCache || intensityCache.key !== cacheKey) {
      const off = document.createElement('canvas');
      off.width = devW;
      off.height = devH;
      const oc = off.getContext('2d');
      if (oc) {
        // 平移整数个设备像素，绘制坐标与直接绘制完全一致
        oc.setTransform(dpr, 0, 0, dpr, -devOX, -devOY);
        drawIntensityStatic(oc, state, {
          text,
          dim,
          accent,
          leftX,
          rightX,
          curveTop,
          curveBot,
          scale,
          modeScale
        });
        intensityCache = {
          key: cacheKey,
          canvas: off,
          devOX,
          devOY
        };
      }
    }
    if (intensityCache && intensityCache.key === cacheKey) {
      // 设备像素 1:1 blit（identity transform + 整数原点），无重采样
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(
        intensityCache.canvas,
        intensityCache.devOX,
        intensityCache.devOY
      );
      c.restore();
    } else {
      // 离屏 2d context 不可用时回退直接绘制
      drawIntensityStatic(c, state, {
        text,
        dim,
        accent,
        leftX,
        rightX,
        curveTop,
        curveBot,
        scale,
        modeScale
      });
    }
  }

  // 光标位置竖线（随 cursorX 每帧变化，直绘）
  const cursorPx = leftX + (rightX - leftX) * state.cursorX;
  c.strokeStyle = accent;
  c.lineWidth = 1.2 * scale;
  c.setLineDash([3 * scale, 2 * scale]);
  c.beginPath();
  c.moveTo(cursorPx, curveTop);
  c.lineTo(cursorPx, curveBot);
  c.stroke();
  c.setLineDash([]);

  c.restore();
}
