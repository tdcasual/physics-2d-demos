/**
 * 薄膜干涉 — Canvas 渲染（竖直肥皂膜模型）
 */

import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import type { ThinFilmState } from './scene.sim';
import { thicknessAtY } from './scene.sim';
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
  const canvas = options.canvas ?? null;
  let ctx: CanvasRenderingContext2D | null = null;
  let graphCanvas = options.graphCanvas ?? null;
  let graphCtx: CanvasRenderingContext2D | null = null;
  let theme: TeachingTheme = options.theme ?? 'dark';
  let mode: TeachingMode = options.mode ?? 'normal';
  let demoHints: DemoRenderHints | undefined = options.demoHints;
  let cssWidth = 800;
  let cssHeight = 600;
  let scale = 1;

  // 离屏 canvas 缓存，避免每帧分配（同时解决 HiDPI putImageData 坐标问题）
  let offCanvas: HTMLCanvasElement | null = null;
  let offCtx: CanvasRenderingContext2D | null = null;
  let offW = 0;
  let offH = 0;
  let _offKey = ''; // 缓存 key：参数未变时跳过重绘

  function resizeCanvas(): void {
    if (!canvas) return;
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(200, Math.floor(rect.width || 800));
    cssHeight = Math.max(150, Math.floor(rect.height || 600));
    scale = parseFloat(canvas.dataset.responsiveScale || '1');
  }

  function resizeGraphCanvas(): void {
    if (!graphCanvas) return;
    const newCtx = sizeCanvasToFill(graphCanvas);
    if (newCtx) graphCtx = newCtx;
  }

  function drawScene(next: ThinFilmState): void {
    const c = ctx;
    if (!c) return;
    const w = cssWidth;
    const h = cssHeight;
    // 演示模式内容放大系数（normal=1，presentation=renderHints.contentScale）
    const modeScale =
      mode === 'presentation' ? (demoHints?.contentScale ?? 1.5) : 1.0;
    const isDark = theme === 'dark';
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
    const { dTop, dBottom, n, lambda, whiteLight } = next.params;

    // ── 肥皂膜几何布局 ──
    const filmX = w * 0.3;
    const filmW = w * 0.4;
    const filmTopY = h * 0.08;
    const filmBotY = h * 0.72;
    const filmH = filmBotY - filmTopY;

    c.save();
    c.lineWidth = 2 * scale;

    // ── 干涉图样（离屏 canvas 渲染，避免 HiDPI putImageData 坐标问题）──
    const filmPixW = Math.round(filmW);
    const filmPixH = Math.round(filmH);

    if (filmPixW > 0 && filmPixH > 0) {
      // 确保离屏 canvas 尺寸匹配
      if (!offCanvas || offW !== filmPixW || offH !== filmPixH) {
        offCanvas = document.createElement('canvas');
        offCanvas.width = filmPixW;
        offCanvas.height = filmPixH;
        offCtx = offCanvas.getContext('2d');
        offW = filmPixW;
        offH = filmPixH;
      }
      const oc = offCtx!;

      // 缓存 key：参数+尺寸+主题未变时跳过重绘
      const offKey = `${dTop}_${dBottom}_${n}_${lambda}_${whiteLight ? 1 : 0}_${filmPixW}_${filmPixH}_${isDark ? 1 : 0}`;
      if (_offKey !== offKey) {
        _offKey = offKey;
        if (whiteLight) {
          // 白光模式：光谱颜色
          for (let py = 0; py < filmPixH; py++) {
            const y = py / filmPixH;
            const d = thicknessAtY(dTop, dBottom, y);
            const [cr, cg, cb] = whiteLightFilmColor(d, n);
            oc.fillStyle = `rgb(${cr},${cg},${cb})`;
            oc.fillRect(0, py, filmPixW, 1);
          }
        } else {
          // 单色模式：明暗条纹
          const [cr, cg, cb] = lambdaToRgb(lambda);
          for (let py = 0; py < filmPixH; py++) {
            const y = py / filmPixH;
            const d = thicknessAtY(dTop, dBottom, y);
            const delta = (4 * Math.PI * n * d) / lambda;
            const R = Math.sin(delta / 2) ** 2;
            const rr = Math.round(bgR + (cr - bgR) * R);
            const rg = Math.round(bgG + (cg - bgG) * R);
            const rb = Math.round(bgB + (cb - bgB) * R);
            oc.fillStyle = `rgb(${rr},${rg},${rb})`;
            oc.fillRect(0, py, filmPixW, 1);
          }
        }
      }

      // drawImage 受 DPR transform 影响，位置和缩放自动正确
      c.drawImage(offCanvas, filmX, filmTopY, filmW, filmH);
    }

    // ── 线框 ──
    c.strokeStyle = isDark ? 'rgba(226,232,240,0.6)' : 'rgba(30,41,59,0.5)';
    c.lineWidth = 3 * scale * modeScale;
    c.strokeRect(filmX, filmTopY, filmW, filmH);

    // 线框圆角装饰（手柄）
    const handleW = 20 * scale;
    c.lineWidth = 4 * scale * modeScale;
    c.beginPath();
    c.moveTo(filmX - handleW, filmTopY);
    c.lineTo(filmX + handleW, filmTopY);
    c.stroke();
    c.beginPath();
    c.moveTo(filmX - handleW, filmBotY);
    c.lineTo(filmX + handleW, filmBotY);
    c.stroke();

    // ── 观察点指示 ──
    const cursorPxY = filmTopY + filmH * next.cursorY;
    c.strokeStyle = accent;
    c.lineWidth = 1.5 * scale * modeScale;
    c.setLineDash([4 * scale, 3 * scale]);
    c.beginPath();
    c.moveTo(filmX - 15 * scale, cursorPxY);
    c.lineTo(filmX + filmW + 15 * scale, cursorPxY);
    c.stroke();
    c.setLineDash([]);

    // 观察点圆点
    c.fillStyle = accent;
    c.beginPath();
    c.arc(filmX - 8 * scale, cursorPxY, 4 * scale, 0, Math.PI * 2);
    c.fill();

    // 观察点标签
    c.fillStyle = text;
    c.textAlign = 'right';
    c.font = `${Math.max(10, 12 * scale * modeScale)}px sans-serif`;
    c.fillText(
      `P (d=${next.localThickness.toFixed(0)} nm)`,
      filmX - 14 * scale,
      cursorPxY - 8 * scale
    );

    // ── 厚度标注（右侧）──
    const annotX = filmX + filmW + 18 * scale;
    c.strokeStyle = dim;
    c.lineWidth = 1 * scale;
    c.beginPath();
    c.moveTo(annotX, filmTopY);
    c.lineTo(annotX, filmBotY);
    c.stroke();
    // 上箭头
    c.beginPath();
    c.moveTo(annotX, filmTopY);
    c.lineTo(annotX - 3 * scale, filmTopY + 6 * scale);
    c.moveTo(annotX, filmTopY);
    c.lineTo(annotX + 3 * scale, filmTopY + 6 * scale);
    c.stroke();
    // 下箭头
    c.beginPath();
    c.moveTo(annotX, filmBotY);
    c.lineTo(annotX - 3 * scale, filmBotY - 6 * scale);
    c.moveTo(annotX, filmBotY);
    c.lineTo(annotX + 3 * scale, filmBotY - 6 * scale);
    c.stroke();

    c.fillStyle = dim;
    c.textAlign = 'left';
    c.font = `${Math.max(9, 11 * scale * modeScale)}px sans-serif`;
    c.fillText(`${dTop} nm`, annotX + 6 * scale, filmTopY + 4 * scale);
    c.fillText(`${dBottom} nm`, annotX + 6 * scale, filmBotY + 4 * scale);

    // 薄膜折射率标签
    c.fillStyle = text;
    c.textAlign = 'center';
    c.font = `${Math.max(10, 13 * scale * modeScale)}px sans-serif`;
    c.fillText(`n = ${n.toFixed(2)}`, filmX + filmW / 2, filmBotY + 22 * scale);

    // ── 入射光路示意（左侧，跟随观察点位置）──
    const rayX = filmX - 60 * scale;
    const rayTop = cursorPxY;
    c.strokeStyle = accent;
    c.lineWidth = 2 * scale * modeScale;
    c.globalAlpha = 0.7;
    // 入射光（向下）
    c.beginPath();
    c.moveTo(rayX, rayTop - 40 * scale);
    c.lineTo(rayX, rayTop);
    c.stroke();
    drawArrow(
      c,
      rayX,
      rayTop - 40 * scale,
      rayX,
      rayTop,
      5 * scale * modeScale
    );
    // 反射光 1（上表面，向上偏右）
    c.beginPath();
    c.moveTo(rayX, rayTop);
    c.lineTo(rayX + 25 * scale, rayTop - 35 * scale);
    c.stroke();
    drawArrow(
      c,
      rayX,
      rayTop,
      rayX + 25 * scale,
      rayTop - 35 * scale,
      5 * scale * modeScale
    );
    // 反射光 2（下表面，向上偏右更多）
    c.setLineDash([3 * scale, 2 * scale]);
    c.beginPath();
    c.moveTo(rayX, rayTop + 12 * scale);
    c.lineTo(rayX + 30 * scale, rayTop - 30 * scale);
    c.stroke();
    c.setLineDash([]);
    c.globalAlpha = 1;

    // 光路标签
    c.fillStyle = dim;
    c.textAlign = 'center';
    c.font = `${Math.max(9, 11 * scale * modeScale)}px sans-serif`;
    c.fillText('入射光', rayX, rayTop - 48 * scale);
    c.fillText('反射', rayX + 40 * scale, rayTop - 38 * scale);

    // ── 步骤特定内容 ──
    const stepBaseY = filmBotY + 40 * scale;
    if (step === 'geometry') {
      c.fillStyle = dim;
      c.font = `${Math.max(11, 14 * scale * modeScale)}px sans-serif`;
      c.textAlign = 'center';
      c.fillText('d(y) = d_top + (d_bottom − d_top) · y / H', w / 2, stepBaseY);
      c.fillStyle = text;
      c.font = `${Math.max(10, 12 * scale * modeScale)}px sans-serif`;
      c.fillText(
        '重力使肥皂液下流，薄膜上薄下厚',
        w / 2,
        stepBaseY + 20 * scale
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

  function drawReflectivityGraph(next: ThinFilmState): void {
    const gc = graphCtx;
    const gCanvas = graphCanvas;
    if (!gc || !gCanvas) return;

    const rect = gCanvas.getBoundingClientRect();
    const gw = Math.max(200, Math.floor(rect.width || 400));
    const gh = Math.max(100, Math.floor(rect.height || 200));
    const gScale = parseFloat(gCanvas.dataset.responsiveScale || '1');
    const isDark = theme === 'dark';
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

    // 标题
    gc.fillStyle = text;
    gc.font = `${Math.max(10, 12 * gScale)}px sans-serif`;
    gc.textAlign = 'left';
    const lightLabel = next.params.whiteLight
      ? '白光'
      : `λ=${next.params.lambda}nm`;
    gc.fillText(
      `${lightLabel}  d=${d.toFixed(0)}nm  n=${n.toFixed(2)}`,
      8 * gScale,
      18 * gScale
    );

    // ── 反射率-波长曲线 ──
    const curveTop = gh * 0.22;
    const curveBot = gh * 0.48;
    const curveH = curveBot - curveTop;
    const plotLeft = 40 * gScale;
    const plotRight = gw - 15 * gScale;

    gc.strokeStyle = dim;
    gc.lineWidth = 1 * gScale;
    gc.beginPath();
    gc.moveTo(plotLeft, curveBot);
    gc.lineTo(plotRight, curveBot);
    gc.stroke();

    gc.strokeStyle = accent;
    gc.lineWidth = 1.5 * gScale;
    gc.beginPath();
    for (let px = plotLeft; px <= plotRight; px += 2) {
      const lambda = 400 + ((px - plotLeft) / (plotRight - plotLeft)) * 300;
      const r0 = ((n - 1) / (n + 1)) ** 2;
      const delta = (4 * Math.PI * n * d) / lambda;
      const R = 4 * r0 * Math.sin(delta / 2) ** 2;
      const py = curveBot - R * curveH;
      if (px === plotLeft) gc.moveTo(px, py);
      else gc.lineTo(px, py);
    }
    gc.stroke();

    // 当前波长标记
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
    gc.fillText('400', plotLeft, curveBot + 14 * gScale);
    gc.fillText('700', plotRight, curveBot + 14 * gScale);
    gc.fillText('λ / nm', (plotLeft + plotRight) / 2, curveBot + 14 * gScale);
    gc.textAlign = 'right';
    gc.fillText('R', 35 * gScale, curveTop + 10 * gScale);

    // ── 波叠加 ──
    drawWaveSuperposition(gc, next, { gw, gh, gScale, text, dim });

    gc.restore();
  }

  function drawWaveSuperposition(
    gc: CanvasRenderingContext2D,
    state: ThinFilmState,
    g: { gw: number; gh: number; gScale: number; text: string; dim: string }
  ): void {
    const { gw, gh, gScale, text, dim } = g;

    const waveTop = gh * 0.55;
    const waveBot = gh * 0.92;
    const waveH = waveBot - waveTop;
    const waveMid = waveTop + waveH / 2;

    gc.fillStyle = text;
    gc.font = `${Math.max(9, 11 * gScale)}px sans-serif`;
    gc.textAlign = 'left';
    gc.fillText('P 点处两束反射光的叠加', 8 * gScale, waveTop + 12 * gScale);

    const legendY = waveTop + 12 * gScale;
    gc.strokeStyle = '#38bdf8';
    gc.lineWidth = 2 * gScale;
    gc.beginPath();
    gc.moveTo(gw * 0.52, legendY - 3 * gScale);
    gc.lineTo(gw * 0.62, legendY - 3 * gScale);
    gc.stroke();
    gc.fillStyle = '#38bdf8';
    gc.font = `${Math.max(8, 10 * gScale)}px sans-serif`;
    gc.fillText('上表面', gw * 0.64, legendY);

    gc.strokeStyle = '#fb7185';
    gc.beginPath();
    gc.moveTo(gw * 0.74, legendY - 3 * gScale);
    gc.lineTo(gw * 0.84, legendY - 3 * gScale);
    gc.stroke();
    gc.fillStyle = '#fb7185';
    gc.fillText('下表面', gw * 0.86, legendY);

    gc.strokeStyle = dim;
    gc.lineWidth = 1 * gScale;
    gc.beginPath();
    gc.moveTo(40 * gScale, waveBot);
    gc.lineTo(gw - 10 * gScale, waveBot);
    gc.stroke();
    gc.beginPath();
    gc.moveTo(50 * gScale, waveTop + 16 * gScale);
    gc.lineTo(50 * gScale, waveBot);
    gc.stroke();

    const plotLeft = 52 * gScale;
    const plotRight = gw - 15 * gScale;
    const plotW = plotRight - plotLeft;
    const amp = waveH * 0.3;
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
    const barX = gw - 28 * gScale;
    const barTop = waveTop + 22 * gScale;
    const barBot = waveBot - 5 * gScale;
    const barH = barBot - barTop;

    gc.fillStyle = dim;
    gc.globalAlpha = 0.3;
    gc.fillRect(barX, barTop, 10 * gScale, barH);
    gc.globalAlpha = 1;

    const fillH = intensity * barH;
    gc.fillStyle = `rgba(251, 191, 36, ${0.4 + intensity * 0.6})`;
    gc.fillRect(barX, barBot - fillH, 10 * gScale, fillH);

    gc.fillStyle = text;
    gc.font = `${Math.max(8, 10 * gScale)}px sans-serif`;
    gc.textAlign = 'center';
    gc.fillText('R', barX + 5 * gScale, barTop - 4 * gScale);

    gc.font = `${Math.max(9, 11 * gScale)}px sans-serif`;
    gc.textAlign = 'left';
    const deg = ((((delta * 180) / Math.PI) % 360) + 360) % 360;
    gc.fillText(`δ = ${deg.toFixed(0)}°`, plotLeft, waveBot + 14 * gScale);
    gc.fillText(
      `R = ${(intensity * 100).toFixed(0)}%`,
      plotLeft + 70 * gScale,
      waveBot + 14 * gScale
    );
    gc.fillText(
      state.isConstructive ? '相长' : '相消',
      plotLeft + 140 * gScale,
      waveBot + 14 * gScale
    );
  }

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
      resizeCanvas();
      resizeGraphCanvas();
      drawScene(next);
    },
    resize(): void {
      resizeCanvas();
      resizeGraphCanvas();
    },
    setTheme(t: TeachingTheme): void {
      theme = t;
      _offKey = ''; // 主题改变背景色，需重绘
    },
    setMode(next: TeachingMode, hints?: DemoRenderHints): void {
      mode = next;
      demoHints = hints;
    },
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      graphCanvas = canvas;
      resizeGraphCanvas();
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
