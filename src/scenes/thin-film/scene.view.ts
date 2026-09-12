/**
 * 薄膜干涉 — Canvas 渲染（竖直肥皂膜模型）
 */

import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import type { ThinFilmState } from './scene.sim';
import { thicknessAt } from './scene.sim';
import { lambdaToRgb, wavelengthToColor } from '../../core/wavelength';
import { whiteLightFilmColor } from '../../core/spectral-color';

export type CreateThinFilmViewOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

export function createThinFilmView(options: CreateThinFilmViewOptions = {}) {
  const env = createViewEnvironment({
    theme: options.theme,
    mode: options.mode,
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    initialWidth: 800,
    initialHeight: 600
  });
  // 图表 canvas 的记录尺寸（resize 时更新，render 热路径不再读 getBoundingClientRect）
  const graph = createCanvasViewport({
    canvas: options.graphCanvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: 400,
      fallbackHeight: 200,
      minWidth: 200,
      minHeight: 100
    },
    initialWidth: 400,
    initialHeight: 200
  });

  // 离屏 canvas 缓存，避免每帧分配（同时解决 HiDPI putImageData 坐标问题）
  let offCanvas: HTMLCanvasElement | null = null;
  let offCtx: CanvasRenderingContext2D | null = null;
  let offW = 0;
  let offH = 0;
  let _offKey = ''; // 缓存 key：参数未变时跳过重绘

  type Pane = { x: number; y: number; w: number; h: number };
  let hit: { film: Pane; side: Pane } | null = null;

  function drawScene(next: ThinFilmState): void {
    const c = stage.ctx;
    if (!c) return;
    const w = stage.cssWidth;
    const h = stage.cssHeight;
    const scale = stage.responsiveScale;
    // 演示模式内容放大系数（normal=1，presentation=renderHints.contentScale）
    const modeScale = env.contentScale();
    const isDark = env.theme === 'dark';
    const text = isDark ? '#e2e8f0' : '#1e293b';
    const dim = isDark ? '#94a3b8' : '#64748b';
    const accent = wavelengthToColor(next.params.lambda);
    const bgR = isDark ? 15 : 248;
    const bgG = isDark ? 23 : 250;
    const bgB = isDark ? 42 : 252;

    c.clearRect(0, 0, w, h);
    c.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    c.fillRect(0, 0, w, h);

    const step = next.params.step;
    const uneven = next.params.profile === 'quad';
    const s = scale;
    const ms = modeScale;

    const gap = 12 * s;
    const captionH = Math.max(52 * s, h * 0.14);
    const topPad = Math.max(36 * s, h * 0.08);
    const bodyY = topPad;
    const bodyH = h - topPad - captionH;
    const sideW = w * 0.22;
    const mainW = w - sideW - gap * 3;
    const mainX = gap;
    const sideX = mainX + mainW + gap;
    const main: Pane = { x: mainX, y: bodyY, w: mainW, h: bodyH };
    const side: Pane = { x: sideX, y: bodyY, w: sideW, h: bodyH };

    c.save();

    drawPaneLabel(c, '主视图', main, text, s, ms, 'right');
    drawPaneLabel(c, '侧视图', side, text, s, ms, 'right');

    const film = drawFilmFront(c, next, {
      pane: main,
      s,
      ms,
      text,
      dim,
      accent,
      isDark,
      bgR,
      bgG,
      bgB
    });
    drawFilmSide(c, next, { pane: side, s, ms, text, dim, accent });

    hit = { film, side };

    const stepBaseY = bodyY + bodyH + 22 * s;
    if (step === 'geometry') {
      c.fillStyle = dim;
      c.font = `${Math.max(11, 14 * s * ms)}px sans-serif`;
      c.textAlign = 'center';
      c.fillText(
        uneven
          ? 'd(y) = d₀ + (d₁ − d₀) · (y / H)³'
          : 'd(y) = d₀ + (d₁ − d₀) · y / H',
        w / 2,
        stepBaseY
      );
      c.fillStyle = text;
      c.font = `${Math.max(10, 12 * s * ms)}px sans-serif`;
      c.fillText(
        uneven
          ? '非均匀变化：越往下厚度增加越快，等厚条纹越来越密'
          : '均匀变化：厚度随高度线性增加，等厚条纹近似等间距',
        w / 2,
        stepBaseY + 20 * s
      );
    } else if (step === 'path-diff') {
      drawPathDiffPhase(c, {
        w,
        h,
        text,
        dim,
        accent,
        scale,
        modeScale,
        state: next,
        baseY: stepBaseY
      });
    } else if (step === 'half-wave') {
      drawHalfWavePhase(c, {
        w,
        h,
        text,
        dim,
        accent,
        scale,
        modeScale,
        state: next,
        baseY: stepBaseY
      });
    } else if (step === 'result') {
      drawResultPhase(c, {
        w,
        h,
        text,
        dim,
        accent,
        scale,
        modeScale,
        state: next,
        baseY: stepBaseY
      });
    }

    c.restore();

    // ── 图表面板 ──
    drawReflectivityGraph(next);
  }

  type DrawTone = {
    s: number;
    ms: number;
    text: string;
    dim: string;
    accent: string;
  };

  function drawPaneLabel(
    c: CanvasRenderingContext2D,
    label: string,
    pane: Pane,
    color: string,
    s: number,
    ms: number,
    align: 'left' | 'right'
  ): void {
    c.fillStyle = color;
    c.textAlign = align;
    c.font = `${Math.max(10, 12 * s * ms)}px sans-serif`;
    const x = align === 'right' ? pane.x + pane.w - 6 * s : pane.x + 6 * s;
    c.fillText(label, x, pane.y + 14 * s);
  }

  function ensureOffscreen(
    pw: number,
    ph: number
  ): CanvasRenderingContext2D | null {
    if (pw <= 0 || ph <= 0) return null;
    if (!offCanvas || offW !== pw || offH !== ph) {
      offCanvas = document.createElement('canvas');
      offCanvas.width = pw;
      offCanvas.height = ph;
      offCtx = offCanvas.getContext('2d');
      offW = pw;
      offH = ph;
    }
    return offCtx;
  }

  function fringeColor(
    d: number,
    n: number,
    lambda: number,
    whiteLight: boolean,
    bg: [number, number, number]
  ): [number, number, number] {
    if (whiteLight) return whiteLightFilmColor(d, n);
    const [cr, cg, cb] = lambdaToRgb(lambda);
    const delta = (4 * Math.PI * n * d) / lambda;
    const R = Math.sin(delta / 2) ** 2;
    return [
      Math.round(bg[0] + (cr - bg[0]) * R),
      Math.round(bg[1] + (cg - bg[1]) * R),
      Math.round(bg[2] + (cb - bg[2]) * R)
    ];
  }

  function fillLinearOffscreen(
    oc: CanvasRenderingContext2D,
    pw: number,
    ph: number,
    state: ThinFilmState,
    bg: [number, number, number]
  ): void {
    const { dTop, dBottom, n, lambda, whiteLight, profile } = state.params;
    for (let py = 0; py < ph; py++) {
      const t = py / Math.max(1, ph);
      const d = thicknessAt(dTop, dBottom, t, profile);
      const [r, g, b] = fringeColor(d, n, lambda, whiteLight, bg);
      oc.fillStyle = `rgb(${r},${g},${b})`;
      oc.fillRect(0, py, pw, 1);
    }
  }

  function drawFilmFront(
    c: CanvasRenderingContext2D,
    state: ThinFilmState,
    g: DrawTone & {
      pane: Pane;
      isDark: boolean;
      bgR: number;
      bgG: number;
      bgB: number;
    }
  ): Pane {
    const { pane, s, ms, text, dim, accent, isDark, bgR, bgG, bgB } = g;
    const { dTop, dBottom, n, lambda, whiteLight } = state.params;
    const leftGutter = Math.max(78 * s, 70 * s * ms);
    const film: Pane = {
      x: pane.x + leftGutter,
      y: pane.y + 26 * s,
      w: Math.max(8, pane.w - leftGutter - 16 * s),
      h: Math.max(8, pane.h - 52 * s)
    };
    const pw = Math.round(film.w);
    const ph = Math.round(film.h);
    const oc = ensureOffscreen(pw, ph);
    if (oc && pw > 0 && ph > 0) {
      const key = `${state.params.profile}_${dTop}_${dBottom}_${n}_${lambda}_${whiteLight ? 1 : 0}_${pw}_${ph}_${isDark ? 1 : 0}`;
      if (_offKey !== key) {
        _offKey = key;
        fillLinearOffscreen(oc, pw, ph, state, [bgR, bgG, bgB]);
      }
      c.drawImage(offCanvas!, film.x, film.y, film.w, film.h);
    }
    c.strokeStyle = isDark ? 'rgba(226,232,240,0.6)' : 'rgba(30,41,59,0.5)';
    c.lineWidth = 2.5 * s * ms;
    c.strokeRect(film.x, film.y, film.w, film.h);
    const handleW = 16 * s;
    c.lineWidth = 3.5 * s * ms;
    c.beginPath();
    c.moveTo(film.x - handleW, film.y);
    c.lineTo(film.x + handleW, film.y);
    c.moveTo(film.x - handleW, film.y + film.h);
    c.lineTo(film.x + handleW, film.y + film.h);
    c.stroke();

    const py = film.y + film.h * state.cursorY;
    c.strokeStyle = accent;
    c.lineWidth = 1.5 * s * ms;
    c.setLineDash([4 * s, 3 * s]);
    c.beginPath();
    c.moveTo(film.x - 10 * s, py);
    c.lineTo(film.x + film.w + 10 * s, py);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = accent;
    c.beginPath();
    c.arc(film.x - 6 * s, py, 3.5 * s, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = text;
    c.textAlign = 'left';
    c.font = `${Math.max(10, 12 * s * ms)}px sans-serif`;
    c.fillText(
      `P (d=${state.localThickness.toFixed(0)} nm)`,
      film.x + 8 * s,
      py - 8 * s
    );

    const rayX = film.x - Math.min(56 * s, leftGutter - 16 * s);
    c.strokeStyle = accent;
    c.lineWidth = 2 * s * ms;
    c.globalAlpha = 0.7;
    c.beginPath();
    c.moveTo(rayX, py - 40 * s);
    c.lineTo(rayX, py);
    c.stroke();
    drawArrow(c, rayX, py - 40 * s, rayX, py, 5 * s * ms);
    c.beginPath();
    c.moveTo(rayX, py);
    c.lineTo(rayX + 25 * s, py - 35 * s);
    c.stroke();
    drawArrow(c, rayX, py, rayX + 25 * s, py - 35 * s, 5 * s * ms);
    c.setLineDash([3 * s, 2 * s]);
    c.beginPath();
    c.moveTo(rayX, py + 12 * s);
    c.lineTo(rayX + 30 * s, py - 30 * s);
    c.stroke();
    c.setLineDash([]);
    c.globalAlpha = 1;
    c.fillStyle = dim;
    c.textAlign = 'center';
    c.font = `${Math.max(9, 11 * s * ms)}px sans-serif`;
    c.fillText('入射光', rayX, py - 48 * s);
    c.fillText('反射', rayX + 40 * s, py - 38 * s);

    c.fillStyle = text;
    c.textAlign = 'center';
    c.font = `${Math.max(10, 13 * s * ms)}px sans-serif`;
    c.fillText(
      `n = ${n.toFixed(2)}`,
      film.x + film.w / 2,
      film.y + film.h + 18 * s
    );
    return film;
  }

  function drawFilmSide(
    c: CanvasRenderingContext2D,
    state: ThinFilmState,
    g: DrawTone & { pane: Pane }
  ): void {
    const { pane, s, ms, text, dim, accent } = g;
    const { dTop, dBottom, profile } = state.params;
    const x0 = pane.x + 18 * s;
    const y0 = pane.y + 18 * s;
    const innerW = pane.w - 36 * s;
    const innerH = pane.h - 44 * s;
    const frontX = x0 + 10 * s;
    const thin = 8 * s;
    const thick = innerW * 0.7;
    const topY = y0;
    const botY = y0 + innerH;
    const widthAt = (t: number) =>
      thin + (thick - thin) * (profile === 'quad' ? t * t * t : t);

    c.fillStyle = 'rgba(56, 189, 248, 0.18)';
    c.beginPath();
    c.moveTo(frontX, topY);
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      c.lineTo(frontX + widthAt(t), topY + innerH * t);
    }
    c.lineTo(frontX, botY);
    c.closePath();
    c.fill();
    c.strokeStyle = dim;
    c.lineWidth = 2 * s * ms;
    c.stroke();

    c.fillStyle = text;
    c.font = `${Math.max(9, 11 * s * ms)}px sans-serif`;
    c.textAlign = 'left';
    c.fillText(`${dTop} nm`, frontX + widthAt(0) + 6 * s, topY + 12 * s);
    c.fillText(`${dBottom} nm`, frontX + widthAt(1) - 48 * s, botY - 6 * s);
    c.textAlign = 'center';
    c.fillStyle = dim;
    c.fillText('厚度（夸张）', x0 + innerW / 2, botY + 16 * s);

    const t = state.cursorY;
    const py = topY + innerH * t;
    const px = frontX + widthAt(t);
    c.strokeStyle = accent;
    c.setLineDash([3 * s, 2 * s]);
    c.beginPath();
    c.moveTo(frontX - 6 * s, py);
    c.lineTo(px + 8 * s, py);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = accent;
    c.beginPath();
    c.arc(px, py, 3.5 * s, 0, Math.PI * 2);
    c.fill();
  }

  function drawReflectivityGraph(next: ThinFilmState): void {
    const gc = graph.ctx;
    const gCanvas = graph.canvas;
    if (!gc || !gCanvas) return;

    // 隐藏 tab（display:none）下跳过重绘；切回可见时由 SceneAdapter
    // 的可见性 ResizeObserver 触发 resize+render 补帧。
    // 注意不能用 resize 记录的 graphW/graphH 判断：
    // 记录值经 Math.max clamp 恒 > 0，无法反映可见性。
    if (gCanvas.offsetParent === null) return;

    // 使用 resize 记录的尺寸，避免每帧同步布局查询
    const gw = graph.cssWidth;
    const gh = graph.cssHeight;
    const gScale = graph.responsiveScale;
    const isDark = env.theme === 'dark';
    const text = isDark ? '#e2e8f0' : '#1e293b';
    const dim = isDark ? '#94a3b8' : '#64748b';
    const accent = wavelengthToColor(next.params.lambda);

    gc.clearRect(0, 0, gCanvas.width, gCanvas.height);
    gc.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    gc.fillRect(0, 0, gCanvas.width, gCanvas.height);

    const gDpr = gCanvas.width / Math.max(1, gw);
    gc.setTransform(gDpr, 0, 0, gDpr, 0, 0);
    gc.save();

    const d = next.localThickness;
    const n = next.params.n;

    const padL = 36 * gScale;
    const padR = 28 * gScale;
    const padT = 20 * gScale;
    // 底边让开左下角 FPS 条（约 38px）和 δ/R 标注
    const padB = Math.max(72, 80 * gScale);

    gc.fillStyle = text;
    gc.font = `${Math.max(10, 12 * gScale)}px sans-serif`;
    gc.textAlign = 'left';
    const lightLabel = next.params.whiteLight
      ? '白光'
      : `λ=${next.params.lambda}nm`;
    gc.fillText(
      `${lightLabel}  d=${d.toFixed(0)}nm  n=${n.toFixed(2)}`,
      padL,
      padT
    );

    const bodyTop = padT + 8 * gScale;
    const bodyBot = gh - padB;
    const split = bodyTop + (bodyBot - bodyTop) * 0.4;
    const plotLeft = padL;
    const plotRight = gw - padR - 16 * gScale;

    // ── 反射率-波长曲线（归一化 0–1，与膜面条纹 / HUD 同一套 R）──
    const curveTop = bodyTop + 4 * gScale;
    const curveBot = split - 22 * gScale;
    const curveH = Math.max(24, curveBot - curveTop);

    gc.strokeStyle = dim;
    gc.lineWidth = 1 * gScale;
    gc.beginPath();
    gc.moveTo(plotLeft, curveBot);
    gc.lineTo(plotRight, curveBot);
    gc.stroke();
    gc.beginPath();
    gc.moveTo(plotLeft, curveTop);
    gc.lineTo(plotLeft, curveBot);
    gc.stroke();

    gc.strokeStyle = accent;
    gc.lineWidth = 1.5 * gScale;
    gc.beginPath();
    for (let px = plotLeft; px <= plotRight; px += 2) {
      const lambda = 400 + ((px - plotLeft) / (plotRight - plotLeft)) * 300;
      const delta = (4 * Math.PI * n * d) / lambda;
      const R = Math.sin(delta / 2) ** 2;
      const py = curveBot - R * curveH;
      if (px === plotLeft) gc.moveTo(px, py);
      else gc.lineTo(px, py);
    }
    gc.stroke();

    if (!next.params.whiteLight) {
      const curPx =
        plotLeft + ((next.params.lambda - 400) / 300) * (plotRight - plotLeft);
      gc.strokeStyle = accent;
      gc.lineWidth = 1.2 * gScale;
      gc.setLineDash([3 * gScale, 2 * gScale]);
      gc.beginPath();
      gc.moveTo(curPx, curveTop);
      gc.lineTo(curPx, curveBot);
      gc.stroke();
      gc.setLineDash([]);
    }

    gc.fillStyle = text;
    gc.font = `${Math.max(9, 11 * gScale)}px sans-serif`;
    gc.textAlign = 'center';
    gc.fillText('400', plotLeft, curveBot + 12 * gScale);
    gc.fillText('700', plotRight, curveBot + 12 * gScale);
    if (plotRight - plotLeft > 160 * gScale) {
      gc.fillText('λ / nm', (plotLeft + plotRight) / 2, curveBot + 12 * gScale);
    }
    gc.textAlign = 'right';
    gc.fillText('R', plotLeft - 6 * gScale, curveTop + 10 * gScale);

    drawWaveSuperposition(gc, next, {
      gScale,
      text,
      dim,
      waveTop: split,
      waveBot: bodyBot,
      plotLeft,
      plotRight
    });

    gc.restore();
  }

  function drawWaveSuperposition(
    gc: CanvasRenderingContext2D,
    state: ThinFilmState,
    g: {
      gScale: number;
      text: string;
      dim: string;
      waveTop: number;
      waveBot: number;
      plotLeft: number;
      plotRight: number;
    }
  ): void {
    const { gScale, text, dim, waveTop, waveBot, plotLeft, plotRight } = g;

    const headH = 16 * gScale;
    const plotTop = waveTop + headH;
    const waveH = Math.max(24, waveBot - plotTop);
    const waveMid = plotTop + waveH / 2;

    gc.fillStyle = text;
    gc.font = `${Math.max(9, 11 * gScale)}px sans-serif`;
    gc.textAlign = 'left';
    gc.fillText('两束反射', plotLeft, waveTop + 12 * gScale);

    const legendY = waveTop + 12 * gScale;
    const swatch = 14 * gScale;
    let lx = plotRight - 108 * gScale;
    if (lx < plotLeft + 72 * gScale) lx = plotLeft + 72 * gScale;
    gc.strokeStyle = '#38bdf8';
    gc.lineWidth = 2 * gScale;
    gc.beginPath();
    gc.moveTo(lx, legendY - 3 * gScale);
    gc.lineTo(lx + swatch, legendY - 3 * gScale);
    gc.stroke();
    gc.fillStyle = '#38bdf8';
    gc.font = `${Math.max(8, 10 * gScale)}px sans-serif`;
    gc.fillText('上', lx + swatch + 3 * gScale, legendY);
    const lx2 = lx + 40 * gScale;
    gc.strokeStyle = '#fb7185';
    gc.beginPath();
    gc.moveTo(lx2, legendY - 3 * gScale);
    gc.lineTo(lx2 + swatch, legendY - 3 * gScale);
    gc.stroke();
    gc.fillStyle = '#fb7185';
    gc.fillText('下', lx2 + swatch + 3 * gScale, legendY);

    gc.strokeStyle = dim;
    gc.lineWidth = 1 * gScale;
    gc.beginPath();
    gc.moveTo(plotLeft, waveBot);
    gc.lineTo(plotRight, waveBot);
    gc.stroke();
    gc.beginPath();
    gc.moveTo(plotLeft, plotTop);
    gc.lineTo(plotLeft, waveBot);
    gc.stroke();

    const plotW = Math.max(1, plotRight - plotLeft);
    const amp = waveH * 0.36;
    const t = state.time;
    const delta = state.phaseDiff;

    gc.strokeStyle = '#38bdf8';
    gc.lineWidth = 1.5 * gScale;
    gc.beginPath();
    for (let px = plotLeft; px <= plotRight; px += 1) {
      const x = ((px - plotLeft) / plotW) * 4 * Math.PI;
      const y = Math.cos(x + t);
      const py = waveMid - y * amp;
      if (px === plotLeft) gc.moveTo(px, py);
      else gc.lineTo(px, py);
    }
    gc.stroke();

    gc.strokeStyle = '#fb7185';
    gc.lineWidth = 1.5 * gScale;
    gc.beginPath();
    for (let px = plotLeft; px <= plotRight; px += 1) {
      const x = ((px - plotLeft) / plotW) * 4 * Math.PI;
      const y = Math.cos(x + t + delta);
      const py = waveMid - y * amp;
      if (px === plotLeft) gc.moveTo(px, py);
      else gc.lineTo(px, py);
    }
    gc.stroke();

    gc.strokeStyle = '#fbbf24';
    gc.lineWidth = 2 * gScale;
    gc.beginPath();
    for (let px = plotLeft; px <= plotRight; px += 1) {
      const x = ((px - plotLeft) / plotW) * 4 * Math.PI;
      const y1 = Math.cos(x + t);
      const y2 = Math.cos(x + t + delta);
      const y = (y1 + y2) * 0.5;
      const py = waveMid - y * amp;
      if (px === plotLeft) gc.moveTo(px, py);
      else gc.lineTo(px, py);
    }
    gc.stroke();

    const intensity = Math.cos(delta / 2) ** 2;
    const barW = 8 * gScale;
    const barX = plotRight + 6 * gScale;
    const barTop = plotTop;
    const barBot = waveBot;
    const barH = Math.max(8, barBot - barTop);

    gc.fillStyle = dim;
    gc.globalAlpha = 0.3;
    gc.fillRect(barX, barTop, barW, barH);
    gc.globalAlpha = 1;

    const fillH = intensity * barH;
    gc.fillStyle = `rgba(251, 191, 36, ${0.4 + intensity * 0.6})`;
    gc.fillRect(barX, barBot - fillH, barW, fillH);

    gc.fillStyle = text;
    gc.font = `${Math.max(8, 10 * gScale)}px sans-serif`;
    gc.textAlign = 'center';
    gc.fillText('I', barX + barW / 2, barTop - 3 * gScale);

    gc.font = `${Math.max(9, 11 * gScale)}px sans-serif`;
    gc.textAlign = 'left';
    const deg = ((((delta * 180) / Math.PI) % 360) + 360) % 360;
    const tagY = waveBot + 14 * gScale;
    gc.fillText(`δ=${deg.toFixed(0)}°`, plotLeft, tagY);
    const midX = plotLeft + Math.min(90 * gScale, plotW * 0.38);
    gc.fillText(`R=${(intensity * 100).toFixed(0)}%`, midX, tagY);
    gc.fillText(
      state.isConstructive ? '相长' : '相消',
      plotRight - 28 * gScale,
      tagY
    );
  }

  // 开口 V 形箭头头；箭杆由调用方按自身样式绘制。
  function drawArrow(
    c: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    size: number
  ): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    c.beginPath();
    c.moveTo(x2, y2);
    c.lineTo(
      x2 - size * Math.cos(angle - Math.PI / 6),
      y2 - size * Math.sin(angle - Math.PI / 6)
    );
    c.moveTo(x2, y2);
    c.lineTo(
      x2 - size * Math.cos(angle + Math.PI / 6),
      y2 - size * Math.sin(angle + Math.PI / 6)
    );
    c.stroke();
  }

  return {
    render(next: ThinFilmState): void {
      // 尺寸由 SceneAdapter 的 ResizeObserver/rAF 驱动 view.resize() 维护；
      // 仅在尚未完成首次 sizing（ctx 未建立）时兜底一次，防首帧 0 尺寸。
      // 记录尺寸经 Math.max clamp 恒 > 0，故以 ctx 是否建立作为判据。
      if (!stage.ctx) stage.resize();
      if (!graph.ctx) graph.resize();
      drawScene(next);
    },
    resize(): void {
      stage.resize();
      graph.resize();
    },
    setTheme(t: TeachingTheme): void {
      env.setTheme(t);
      _offKey = ''; // 主题改变背景色，需重绘
    },
    setMode(next: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(next, hints);
    },
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      graph.attach(canvas);
    },
    pickCursor(cssX: number, cssY: number): number | null {
      if (!hit) return null;
      const { film, side } = hit;
      const inRect = (p: Pane) =>
        cssX >= p.x && cssX <= p.x + p.w && cssY >= p.y && cssY <= p.y + p.h;
      if (inRect(film)) {
        return Math.max(0, Math.min(1, (cssY - film.y) / Math.max(1, film.h)));
      }
      if (inRect(side)) {
        const top = side.y + 18 * (stage.responsiveScale || 1);
        const hh = side.h - 44 * (stage.responsiveScale || 1);
        return Math.max(0, Math.min(1, (cssY - top) / Math.max(1, hh)));
      }
      return null;
    },
    dispose(): void {}
  };
}

// ── path-diff 阶段 ──
function drawPathDiffPhase(
  c: CanvasRenderingContext2D,
  g: {
    w: number;
    h: number;
    text: string;
    dim: string;
    accent: string;
    scale: number;
    modeScale: number;
    state: ThinFilmState;
    baseY: number;
  }
): void {
  const { text, dim, scale, modeScale, state, baseY } = g;
  c.save();
  c.fillStyle = text;
  c.textAlign = 'center';
  c.font = `${Math.max(11, 14 * scale * modeScale)}px sans-serif`;
  c.fillText('Δ = 2nd + λ/2', g.w / 2, baseY);
  c.fillStyle = dim;
  c.font = `${Math.max(9, 11 * scale * modeScale)}px sans-serif`;
  c.fillText(
    `d = ${state.localThickness.toFixed(0)} nm   n = ${state.params.n.toFixed(2)}   Δ = ${state.pathDiff.toFixed(0)} nm`,
    g.w / 2,
    baseY + 18 * scale
  );
  c.fillStyle = text;
  c.font = `${Math.max(10, 12 * scale * modeScale)}px sans-serif`;
  c.fillText(
    '上表面反射有半波损失 λ/2，下表面反射无半波损失',
    g.w / 2,
    baseY + 36 * scale
  );
  c.restore();
}

// ── half-wave 阶段 ──
function drawHalfWavePhase(
  c: CanvasRenderingContext2D,
  g: {
    w: number;
    h: number;
    text: string;
    dim: string;
    accent: string;
    scale: number;
    modeScale: number;
    state: ThinFilmState;
    baseY: number;
  }
): void {
  const { text, dim, accent, scale, modeScale, baseY } = g;
  c.save();
  c.fillStyle = text;
  c.textAlign = 'center';
  c.font = `${Math.max(11, 14 * scale * modeScale)}px sans-serif`;
  c.fillText('上表面（空气→薄膜）：n↑，反射有半波损失 λ/2', g.w / 2, baseY);
  c.fillText(
    '下表面（薄膜→空气）：n↓，反射无半波损失',
    g.w / 2,
    baseY + 18 * scale
  );
  c.fillStyle = dim;
  c.font = `${Math.max(9, 11 * scale * modeScale)}px sans-serif`;
  c.fillText(
    '净效果：一次半波损失，附加光程差 λ/2',
    g.w / 2,
    baseY + 36 * scale
  );
  c.fillStyle = accent;
  c.font = `bold ${Math.max(12, 16 * scale * modeScale)}px sans-serif`;
  c.fillText('总光程差  Δ = 2nd + λ/2', g.w / 2, baseY + 56 * scale);
  c.restore();
}

// ── result 阶段 ──
function drawResultPhase(
  c: CanvasRenderingContext2D,
  g: {
    w: number;
    h: number;
    text: string;
    dim: string;
    accent: string;
    scale: number;
    modeScale: number;
    state: ThinFilmState;
    baseY: number;
  }
): void {
  const { text, accent, dim, scale, modeScale, state, baseY: fy } = g;
  c.save();
  const result = state.isConstructive ? '相长干涉（增强）' : '相消干涉（减弱）';

  c.fillStyle = state.isConstructive ? '#22c55e' : accent;
  c.font = `bold ${Math.max(14, 20 * scale * modeScale)}px sans-serif`;
  c.textAlign = 'center';
  c.fillText(result, g.w / 2, fy);

  c.fillStyle = text;
  c.font = `${Math.max(10, 13 * scale * modeScale)}px sans-serif`;
  c.fillText('增强：2nd = (m+½)λ    相消：2nd = mλ', g.w / 2, fy + 24 * scale);

  c.fillStyle = dim;
  c.font = `${Math.max(9, 11 * scale * modeScale)}px sans-serif`;
  c.fillText(
    `Δ = ${(state.pathDiff / 1e3).toFixed(2)} μm   m ≈ ${state.order.toFixed(1)}   R = ${(state.reflectivity * 100).toFixed(1)}%`,
    g.w / 2,
    fy + 44 * scale
  );
  c.restore();
}
