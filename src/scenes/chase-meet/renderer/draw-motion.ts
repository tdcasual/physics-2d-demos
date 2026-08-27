/**
 * 追及相遇 — 卡通版运动场景
 *
 * 分层活背景（天空 + 日/月 + 漂移云 + 丘陵）+ 卡通道路（里程牌 + 草地）+
 * 带表情/转轮/扬尘/速度线的卡通小车 + 距离气泡 + 相遇漫画爆裂。
 * 整幅画布被填满（解决旧版上下空旷、移动端观感差的问题）。
 * 物理逻辑（sim）不变，所有尺寸随 visualScale 缩放（响应式 + 演示模式）。
 */

import type { MotionDrawContext } from './types';
import { nearestSample } from './view-utils';
import { pathRoundRect } from '../../../core/draw-primitives';

type Theme = 'light' | 'dark';

interface Pal {
  skyTop: string;
  skyBottom: string;
  orb: string;
  orbGlow: string;
  cloud: string;
  hillFar: string;
  hillNear: string;
  road: string;
  roadEdge: string;
  dash: string;
  post: string;
  postSign: string;
  postText: string;
  grass: string;
  grassBlade: string;
  carA: string;
  cabinA: string;
  carB: string;
  cabinB: string;
  wheel: string;
  hub: string;
  eyeWhite: string;
  pupil: string;
  text: string;
  textSoft: string;
  bubble: string;
  bubbleBorder: string;
}

const PALETTE_LIGHT: Pal = {
  skyTop: '#7ec8ff',
  skyBottom: '#eaf7ff',
  orb: '#ffd23f',
  orbGlow: 'rgba(255,210,63,0.45)',
  cloud: 'rgba(255,255,255,0.92)',
  hillFar: '#9bd98a',
  hillNear: '#6bbf59',
  road: '#8a93a3',
  roadEdge: '#5b6473',
  dash: 'rgba(255,255,255,0.9)',
  post: '#c98a4b',
  postSign: '#fff7e6',
  postText: '#7a5230',
  grass: '#7cc36a',
  grassBlade: '#5aa84a',
  carA: '#3b82f6',
  cabinA: '#cfe2ff',
  carB: '#ef4444',
  cabinB: '#ffd2d2',
  wheel: '#2b2f36',
  hub: '#cfd6df',
  eyeWhite: '#ffffff',
  pupil: '#1f2937',
  text: '#1f2937',
  textSoft: 'rgba(31,41,55,0.7)',
  bubble: 'rgba(255,255,255,0.95)',
  bubbleBorder: 'rgba(31,41,55,0.35)'
};

const PALETTE_DARK: Pal = {
  skyTop: '#16213a',
  skyBottom: '#0b1224',
  orb: '#e8eefc',
  orbGlow: 'rgba(226,238,252,0.3)',
  cloud: 'rgba(148,163,184,0.22)',
  hillFar: '#1d3a2c',
  hillNear: '#143024',
  road: '#3a4456',
  roadEdge: '#222b3a',
  dash: 'rgba(203,213,225,0.7)',
  post: '#7a5a36',
  postSign: '#2a3344',
  postText: '#cbd5e1',
  grass: '#163a22',
  grassBlade: '#0f2c19',
  carA: '#60a5fa',
  cabinA: '#1e3a8a',
  carB: '#f87171',
  cabinB: '#7f1d1d',
  wheel: '#0b0f17',
  hub: '#94a3b8',
  eyeWhite: '#f8fafc',
  pupil: '#0b0f17',
  text: '#f1f5f9',
  textSoft: 'rgba(226,232,240,0.7)',
  bubble: 'rgba(30,41,59,0.92)',
  bubbleBorder: 'rgba(148,163,184,0.4)'
};

function palette(theme: Theme): Pal {
  return theme === 'light' ? PALETTE_LIGHT : PALETTE_DARK;
}

// 每帧重建的线性渐变缓存：key 为主题 + 几何坐标，失效才重建
const gradientCache = new Map<string, CanvasGradient>();

function cachedLinearGradient(
  ctx: CanvasRenderingContext2D,
  cacheKey: string,
  y0: number,
  y1: number,
  stops: ReadonlyArray<readonly [number, string]>
): CanvasGradient {
  const hit = gradientCache.get(cacheKey);
  if (hit) return hit;
  const grad = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [offset, color] of stops) {
    grad.addColorStop(offset, color);
  }
  gradientCache.set(cacheKey, grad);
  return grad;
}

export function drawMotion(context: MotionDrawContext): void {
  const { ctx, cssW, cssH, visualScale, snapshot, theme } = context;
  const P = palette(theme);
  const s = visualScale;
  const t = snapshot.state.t;

  ctx.clearRect(0, 0, cssW, cssH);

  const horizonY = cssH * 0.58;
  const groundY = cssH * 0.74; // 车轮触地线
  const roadTop = horizonY;
  const roadBottom = cssH * 0.86;

  // ---------- 天空 ----------
  const sky = cachedLinearGradient(
    ctx,
    `${theme}|sky|${horizonY}`,
    0,
    horizonY,
    [
      [0, P.skyTop],
      [1, P.skyBottom]
    ]
  );
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cssW, horizonY);

  // 日 / 月
  const orbX = cssW * 0.86;
  const orbY = cssH * 0.16;
  const orbR = Math.max(14, 22 * s);
  ctx.save();
  ctx.shadowColor = P.orbGlow;
  ctx.shadowBlur = 24 * s;
  ctx.fillStyle = P.orb;
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (theme === 'dark') {
    // 月坑
    ctx.fillStyle = 'rgba(148,163,184,0.35)';
    ctx.beginPath();
    ctx.arc(orbX - orbR * 0.3, orbY - orbR * 0.2, orbR * 0.18, 0, Math.PI * 2);
    ctx.arc(
      orbX + orbR * 0.25,
      orbY + orbR * 0.25,
      orbR * 0.12,
      0,
      Math.PI * 2
    );
    ctx.fill();
  } else {
    ctx.strokeStyle = P.orbGlow;
    ctx.lineWidth = Math.max(2, 3 * s);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + t * 0.3;
      ctx.beginPath();
      ctx.moveTo(
        orbX + Math.cos(a) * orbR * 1.3,
        orbY + Math.sin(a) * orbR * 1.3
      );
      ctx.lineTo(
        orbX + Math.cos(a) * orbR * 1.6,
        orbY + Math.sin(a) * orbR * 1.6
      );
      ctx.stroke();
    }
  }

  // 漂移云
  const clouds = [
    { bx: 0.18, y: 0.14, sc: 1.0, spd: 6 },
    { bx: 0.5, y: 0.24, sc: 0.75, spd: 9 },
    { bx: 0.72, y: 0.1, sc: 1.2, spd: 4 },
    { bx: 0.36, y: 0.32, sc: 0.6, spd: 12 }
  ];
  ctx.fillStyle = P.cloud;
  for (const c of clouds) {
    const drift = (t * c.spd) % (cssW + 160 * s);
    let cx = c.bx * cssW + drift;
    cx =
      (((cx % (cssW + 160 * s)) + (cssW + 160 * s)) % (cssW + 160 * s)) -
      80 * s;
    const cy = c.y * cssH;
    const u = 16 * s * c.sc;
    ctx.beginPath();
    ctx.arc(cx, cy, u, 0, Math.PI * 2);
    ctx.arc(cx + u * 1.1, cy + u * 0.2, u * 0.8, 0, Math.PI * 2);
    ctx.arc(cx - u * 1.1, cy + u * 0.25, u * 0.7, 0, Math.PI * 2);
    ctx.arc(cx + u * 0.3, cy - u * 0.6, u * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // 标题牌（顶部居中，避开左上浮动运输条与右上日/月）
  const titleText = '🏁 追及大冒险';
  ctx.font = `800 ${Math.max(13, Math.round(15 * s))}px system-ui`;
  const tW = ctx.measureText(titleText).width + 28 * s;
  const tH = 30 * s;
  const tX = cssW * 0.5 - tW / 2;
  const tY = 14 * s;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 8 * s;
  ctx.fillStyle =
    theme === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(30,41,59,0.85)';
  pathRoundRect(ctx, tX, tY, tW, tH, tH / 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = P.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(titleText, cssW * 0.5, tY + tH / 2);

  // 丘陵（两层）
  const hill = (baseY: number, amp: number, color: string, phase: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let x = 0; x <= cssW; x += 12) {
      const y =
        baseY -
        amp * (0.5 + 0.5 * Math.sin(x * 0.012 + phase)) -
        amp * 0.4 * (0.5 + 0.5 * Math.sin(x * 0.03 + phase * 2));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(cssW, cssH);
    ctx.lineTo(0, cssH);
    ctx.closePath();
    ctx.fill();
  };
  hill(horizonY + 6 * s, 26 * s, P.hillFar, 1.3);
  hill(horizonY + 14 * s, 18 * s, P.hillNear, 3.1);

  // ---------- 道路 ----------
  const roadGrad = cachedLinearGradient(
    ctx,
    `${theme}|road|${roadTop}|${roadBottom}`,
    roadTop,
    roadBottom,
    [
      [0, P.roadEdge],
      [0.5, P.road],
      [1, P.roadEdge]
    ]
  );
  ctx.fillStyle = roadGrad;
  ctx.fillRect(0, roadTop, cssW, roadBottom - roadTop);
  // 车道虚线（随时间轻微流动）
  ctx.strokeStyle = P.dash;
  ctx.lineWidth = Math.max(2, 3 * s);
  ctx.setLineDash([18 * s, 14 * s]);
  ctx.lineDashOffset = -((t * 30) % (32 * s));
  const laneY = (roadTop + roadBottom) / 2;
  ctx.beginPath();
  ctx.moveTo(0, laneY);
  ctx.lineTo(cssW, laneY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 前景草地
  ctx.fillStyle = P.grass;
  ctx.fillRect(0, roadBottom, cssW, cssH - roadBottom);
  ctx.strokeStyle = P.grassBlade;
  ctx.lineWidth = Math.max(1, 1.5 * s);
  for (let x = 6 * s; x < cssW; x += 16 * s) {
    const sway = Math.sin(t * 2 + x * 0.1) * 2 * s;
    ctx.beginPath();
    ctx.moveTo(x, roadBottom + 8 * s);
    ctx.quadraticCurveTo(
      x + sway,
      roadBottom + 2 * s,
      x + 3 * s,
      roadBottom - 2 * s
    );
    ctx.stroke();
  }

  // 世界坐标映射
  const padding = Math.max(36, 46 * s);
  const usable = cssW - 2 * padding;
  const range = snapshot.bounds.maxX - snapshot.bounds.minX || 1;
  const toScreenX = (wx: number) =>
    padding + ((wx - snapshot.bounds.minX) / range) * usable;

  // 里程牌（道路上的世界坐标刻度）
  const steps = 8;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= steps; i += 1) {
    const ratio = i / steps;
    const wx = snapshot.bounds.minX + ratio * range;
    const x = toScreenX(wx);
    // 牌柱
    ctx.fillStyle = P.post;
    ctx.fillRect(x - 1.5 * s, roadTop - 16 * s, 3 * s, 16 * s);
    // 牌面
    ctx.fillStyle = P.postSign;
    pathRoundRect(ctx, x - 11 * s, roadTop - 30 * s, 22 * s, 15 * s, 4 * s);
    ctx.fill();
    ctx.fillStyle = P.postText;
    ctx.font = `700 ${Math.max(8, Math.round(9 * s))}px system-ui`;
    ctx.fillText(wx.toFixed(0), x, roadTop - 22 * s);
  }

  // 当前样本
  const cur = nearestSample(snapshot.samples, t);
  const ax = toScreenX(cur.xA);
  const bx = toScreenX(cur.xB);
  const dist = Math.abs(cur.xA - cur.xB);
  const meetThresh = range * 0.04;
  const met = dist < meetThresh && dist > 1e-6;

  // 判定谁追谁（在后且更快者为追者）
  const aChasing = cur.xA < cur.xB ? cur.vA > cur.vB : cur.vA < cur.vB;
  const moodA: 'chase' | 'flee' | 'meet' | 'calm' = met
    ? 'meet'
    : aChasing
      ? 'chase'
      : cur.vA < cur.vB && cur.xA > cur.xB
        ? 'flee'
        : 'calm';
  const moodB: 'chase' | 'flee' | 'meet' | 'calm' = met
    ? 'meet'
    : !aChasing
      ? 'chase'
      : cur.vB < cur.vA && cur.xB > cur.xA
        ? 'flee'
        : 'calm';

  // ---------- 距离气泡 / 相遇爆裂 ----------
  if (met) {
    const mx = (ax + bx) / 2;
    const my = groundY - 70 * s;
    const pulse = 1 + 0.12 * Math.sin(t * 12);
    ctx.save();
    ctx.translate(mx, my);
    ctx.scale(pulse, pulse);
    // 星爆
    const spikes = 12;
    const rOut = 30 * s;
    const rIn = 15 * s;
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = Math.max(2, 2.5 * s);
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i += 1) {
      const ang = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? rOut : rIn;
      const px = Math.cos(ang) * rr;
      const py = Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#7c2d12';
    ctx.font = `800 ${Math.max(11, Math.round(13 * s))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('相遇!', 0, 0);
    ctx.restore();
    // 火花
    ctx.fillStyle = '#fde68a';
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + t * 4;
      const rr = (34 + 8 * Math.sin(t * 10 + i)) * s;
      ctx.beginPath();
      ctx.arc(
        mx + Math.cos(a) * rr,
        my + Math.sin(a) * rr,
        2.5 * s,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  } else {
    const midX = (ax + bx) / 2;
    const bubY = groundY - 64 * s;
    const label = `Δx = ${dist.toFixed(1)} m`;
    ctx.font = `700 ${Math.max(10, Math.round(12 * s))}px system-ui`;
    const tw = ctx.measureText(label).width + 22 * s;
    ctx.fillStyle = P.bubble;
    ctx.strokeStyle = P.bubbleBorder;
    ctx.lineWidth = Math.max(1.5, 2 * s);
    pathRoundRect(ctx, midX - tw / 2, bubY - 13 * s, tw, 26 * s, 13 * s);
    ctx.fill();
    ctx.stroke();
    // 气泡尖
    ctx.beginPath();
    ctx.moveTo(midX - 6 * s, bubY + 13 * s);
    ctx.lineTo(midX, bubY + 22 * s);
    ctx.lineTo(midX + 6 * s, bubY + 13 * s);
    ctx.closePath();
    ctx.fillStyle = P.bubble;
    ctx.fill();
    ctx.fillStyle = P.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, midX, bubY);
    // 连接虚线
    ctx.strokeStyle = P.bubbleBorder;
    ctx.lineWidth = Math.max(1.5, 2 * s);
    ctx.setLineDash([5 * s, 4 * s]);
    ctx.beginPath();
    ctx.moveTo(ax, groundY - 30 * s);
    ctx.lineTo(bx, groundY - 30 * s);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ---------- 卡通小车 ----------
  drawCar(ctx, ax, groundY, s, t, P.carA, P.cabinA, P, cur.vA, moodA, 'A');
  drawCar(ctx, bx, groundY, s, t, P.carB, P.cabinB, P, cur.vB, moodB, 'B');
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  s: number,
  t: number,
  body: string,
  cabin: string,
  P: Pal,
  velocity: number,
  mood: 'chase' | 'flee' | 'meet' | 'calm',
  label: string
): void {
  const facingRight = velocity >= 0;
  const bob = Math.sin(t * 9 + (label === 'A' ? 0 : 1.7)) * 1.6 * s;

  ctx.save();
  ctx.translate(x, groundY + bob);
  if (!facingRight) ctx.scale(-1, 1);

  const carW = 60 * s;
  const carH = 24 * s;
  const wheelR = 8 * s;
  const wheelY = -wheelR * 0.7;
  const bodyTop = -carH - wheelR * 0.4;

  // 接地阴影
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 2 * s, carW * 0.52, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // 速度线（快时）
  const absV = Math.abs(velocity);
  if (absV > 1.5) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(1.5, 2 * s);
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i += 1) {
      const ly = bodyTop + carH * (0.25 + i * 0.28);
      const len = Math.min(absV * 2.2, 26) * s;
      const jitter = Math.sin(t * 20 + i) * 2 * s;
      ctx.beginPath();
      ctx.moveTo(-carW * 0.5 - 6 * s, ly + jitter);
      ctx.lineTo(-carW * 0.5 - 6 * s - len, ly + jitter);
      ctx.stroke();
    }
  }

  // 扬尘（车后）
  ctx.fillStyle = 'rgba(180,170,150,0.35)';
  for (let i = 0; i < 3; i += 1) {
    const puff = (t * 3 + i * 0.7) % 1;
    const px = -carW * 0.5 - puff * 22 * s;
    const py = -wheelR * 0.3 + Math.sin(t * 6 + i) * 2 * s;
    ctx.beginPath();
    ctx.arc(px, py, (3 + puff * 5) * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // 车身（圆角）
  ctx.fillStyle = body;
  pathRoundRect(ctx, -carW * 0.5, bodyTop, carW, carH, 8 * s);
  ctx.fill();
  // 车顶舱
  const cabW = carW * 0.5;
  const cabH = carH * 0.7;
  const cabX = -cabW * 0.25;
  const cabY = bodyTop - cabH + 3 * s;
  ctx.fillStyle = body;
  pathRoundRect(ctx, cabX, cabY, cabW, cabH, 7 * s);
  ctx.fill();
  // 车窗
  ctx.fillStyle = cabin;
  pathRoundRect(
    ctx,
    cabX + 3 * s,
    cabY + 3 * s,
    cabW - 6 * s,
    cabH - 6 * s,
    4 * s
  );
  ctx.fill();

  // 车灯（车头在右）
  ctx.save();
  ctx.shadowColor = 'rgba(255,236,150,0.8)';
  ctx.shadowBlur = 8 * s;
  ctx.fillStyle = '#ffe08a';
  ctx.beginPath();
  ctx.arc(carW * 0.5 - 3 * s, bodyTop + carH * 0.4, 3.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 表情（在车头一侧）
  const eyeX = carW * 0.26;
  const eyeY = bodyTop + carH * 0.42;
  const eyeR = 5 * s;
  const look = facingRight ? 1 : -1; // 在翻转坐标系内，朝车头看 = +x
  const drawEye = (ex: number) => {
    ctx.fillStyle = P.eyeWhite;
    ctx.beginPath();
    ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    let px = ex + look * eyeR * 0.35;
    let py = eyeY;
    if (mood === 'flee') py = eyeY - eyeR * 0.25;
    if (mood === 'meet') {
      px = ex;
      py = eyeY;
    }
    ctx.fillStyle = P.pupil;
    ctx.beginPath();
    ctx.arc(px, py, eyeR * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // 眉毛 / 表情线
    ctx.strokeStyle = P.pupil;
    ctx.lineWidth = Math.max(1, 1.4 * s);
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (mood === 'chase') {
      ctx.moveTo(ex - eyeR * 0.7, eyeY - eyeR * 1.3);
      ctx.lineTo(ex + eyeR * 0.7, eyeY - eyeR * 0.9);
    } else if (mood === 'flee') {
      ctx.moveTo(ex - eyeR * 0.7, eyeY - eyeR * 0.9);
      ctx.lineTo(ex + eyeR * 0.7, eyeY - eyeR * 1.3);
      // 汗滴
      ctx.moveTo(ex + eyeR * 1.4, eyeY - eyeR * 0.6);
      ctx.lineTo(ex + eyeR * 1.4, eyeY + eyeR * 0.2);
    } else if (mood === 'meet') {
      // 笑眼（弧）
      ctx.moveTo(ex - eyeR * 0.6, eyeY);
      ctx.quadraticCurveTo(ex, eyeY - eyeR * 0.8, ex + eyeR * 0.6, eyeY);
    }
    ctx.stroke();
  };
  drawEye(eyeX);
  drawEye(eyeX - 11 * s);
  // 嘴
  ctx.strokeStyle = P.pupil;
  ctx.lineWidth = Math.max(1, 1.4 * s);
  ctx.beginPath();
  const mouthX = carW * 0.34;
  const mouthY = bodyTop + carH * 0.72;
  if (mood === 'meet') {
    ctx.arc(mouthX, mouthY - 2 * s, 3 * s, 0, Math.PI);
  } else if (mood === 'flee') {
    ctx.arc(mouthX, mouthY + 2 * s, 2.5 * s, Math.PI, 0);
  } else {
    ctx.moveTo(mouthX - 3 * s, mouthY);
    ctx.lineTo(mouthX + 3 * s, mouthY);
  }
  ctx.stroke();

  // 车轮（带转动辐条）
  const spin = (x * 0.4 + t * velocity * 4) * (facingRight ? 1 : 1);
  const drawWheel = (wx: number) => {
    ctx.fillStyle = P.wheel;
    ctx.beginPath();
    ctx.arc(wx, wheelY, wheelR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.hub;
    ctx.beginPath();
    ctx.arc(wx, wheelY, wheelR * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = P.hub;
    ctx.lineWidth = Math.max(1, 1.3 * s);
    for (let k = 0; k < 4; k += 1) {
      const a = spin + (k / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(wx, wheelY);
      ctx.lineTo(
        wx + Math.cos(a) * wheelR * 0.8,
        wheelY + Math.sin(a) * wheelR * 0.8
      );
      ctx.stroke();
    }
  };
  drawWheel(-carW * 0.3);
  drawWheel(carW * 0.3);

  ctx.restore();

  // 标签（不翻转，始终正立）
  ctx.fillStyle = P.text;
  ctx.font = `800 ${Math.max(13, Math.round(13 * s))}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, x, groundY - carH - 18 * s + bob);
}
