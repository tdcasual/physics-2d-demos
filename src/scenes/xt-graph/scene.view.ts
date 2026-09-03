/**
 * 位置—时间图像视图
 *
 * 单画布复合渲染：上部为 x–t 图像区（图线随时间逐点绘出），
 * 下部为位置轴区（小车与图线同帧严格同步）。
 * 所有元素尺寸由 responsiveScale × 演示模式 contentScale 推导。
 */

import { sizeCanvasToFill, scaledSize } from '../../core/canvas-sizing';
import { getThemeColors } from '../../core/colors';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import {
  getXtPreset,
  XT_T_MAX,
  XT_X_MIN,
  XT_X_MAX,
  type XtGraphState
} from './scene.sim';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** 字体助手：按 scale 缩放字号并钳制最小可读值 */
function font(base: number, scale: number, weight = 'bold'): string {
  return `${weight} ${scaledSize(base, scale, 9)}px ${MONO}`;
}

/** 语义色：图线=蓝（速度），动点/小车=红（位置），按主题切换亮度 */
function semanticColors(theme: TeachingTheme) {
  const isDark = theme === 'dark';
  return {
    curve: isDark ? '#60a5fa' : '#1d4ed8',
    curveGhost: isDark ? 'rgba(96,165,250,0.35)' : 'rgba(29,78,216,0.38)',
    mover: isDark ? '#f87171' : '#dc2626',
    moverDim: isDark ? 'rgba(248,113,113,0.55)' : 'rgba(220,38,38,0.6)',
    moverGlow: isDark ? 'rgba(248,113,113,0.18)' : 'rgba(220,38,38,0.16)',
    labelBg: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)',
    gridStrong: isDark ? 'rgba(148,163,184,0.3)' : 'rgba(93,109,126,0.35)'
  };
}

export type CreateXtGraphViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

export function createXtGraphView(options: CreateXtGraphViewOptions = {}) {
  const canvas = options.canvas ?? document.createElement('canvas');
  let theme: TeachingTheme = options.theme ?? 'light';
  let mode: TeachingMode = options.mode ?? 'normal';
  let hints: DemoRenderHints | undefined = options.demoHints;
  let ctx: CanvasRenderingContext2D | null = null;
  let width = 0;
  let height = 0;
  let responsiveScale = 1;

  function resize(): void {
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    responsiveScale = parseFloat(canvas.dataset.responsiveScale || '1');
  }

  /** 演示模式内容放大系数 */
  function contentScale(): number {
    return mode === 'presentation' ? (hints?.contentScale ?? 1.5) : 1;
  }

  /* ────────────────────── x–t 图像区 ────────────────────── */

  function drawGraph(
    state: XtGraphState,
    scale: number,
    regionH: number
  ): void {
    if (!ctx) return;
    const c = getThemeColors(theme);
    const sem = semanticColors(theme);

    const padL = 56 * scale;
    const padR = 28 * scale;
    const padT = 34 * scale;
    const padB = 34 * scale;
    const gx = (t: number) => padL + (t / XT_T_MAX) * (width - padL - padR);
    const gy = (x: number) =>
      padT +
      (1 - (x - XT_X_MIN) / (XT_X_MAX - XT_X_MIN)) * (regionH - padT - padB);

    /* 网格 */
    ctx.lineWidth = 1;
    for (let t = 0; t <= XT_T_MAX; t += 1) {
      ctx.strokeStyle = t % 5 === 0 ? sem.gridStrong : c.canvasGrid;
      ctx.beginPath();
      ctx.moveTo(gx(t), padT);
      ctx.lineTo(gx(t), regionH - padB);
      ctx.stroke();
    }
    for (let x = XT_X_MIN; x <= XT_X_MAX; x += 2) {
      ctx.strokeStyle = x % 10 === 0 ? sem.gridStrong : c.canvasGrid;
      ctx.beginPath();
      ctx.moveTo(padL, gy(x));
      ctx.lineTo(width - padR, gy(x));
      ctx.stroke();
    }

    /* 坐标轴：纵轴在左，时间轴位于 x = 0 高度（标准物理画法） */
    const axisY0 = gy(0);
    ctx.strokeStyle = c.canvasText;
    ctx.lineWidth = 2.5 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(padL, padT - 8 * scale);
    ctx.lineTo(padL, regionH - padB + 6 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padL, axisY0);
    ctx.lineTo(width - padR + 8 * scale, axisY0);
    ctx.stroke();
    /* 箭头 */
    ctx.fillStyle = c.canvasText;
    ctx.beginPath();
    ctx.moveTo(padL, padT - 14 * scale);
    ctx.lineTo(padL - 6 * scale, padT - 4 * scale);
    ctx.lineTo(padL + 6 * scale, padT - 4 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(width - padR + 14 * scale, axisY0);
    ctx.lineTo(width - padR + 4 * scale, axisY0 - 6 * scale);
    ctx.lineTo(width - padR + 4 * scale, axisY0 + 6 * scale);
    ctx.closePath();
    ctx.fill();

    /* 刻度标签 */
    ctx.fillStyle = c.textSecondary;
    ctx.font = font(12, scale);
    ctx.textAlign = 'center';
    for (let t = 1; t <= XT_T_MAX; t += 1) {
      ctx.fillText(String(t), gx(t), axisY0 + 20 * scale);
    }
    ctx.textAlign = 'right';
    for (let x = XT_X_MIN; x <= XT_X_MAX; x += 4) {
      if (x !== 0) {
        ctx.fillText(x > 0 ? `+${x}` : String(x), padL - 10 * scale, gy(x) + 4);
      }
    }
    ctx.fillText('O', padL - 10 * scale, axisY0 + 18 * scale);
    ctx.textAlign = 'left';
    ctx.fillStyle = c.canvasText;
    ctx.font = font(14, scale);
    ctx.fillText('x/m', padL + 10 * scale, padT + 14 * scale);
    ctx.fillText('t/s', width - padR - 8 * scale, axisY0 - 10 * scale);

    const preset = getXtPreset(state.preset);

    /* 预设完整图线（虚线预览） */
    ctx.strokeStyle = sem.curveGhost;
    ctx.lineWidth = 2.5 * scale;
    ctx.setLineDash([6 * scale, 6 * scale]);
    ctx.beginPath();
    const PREVIEW_SAMPLES = 300;
    for (let i = 0; i <= PREVIEW_SAMPLES; i += 1) {
      const t = (i / PREVIEW_SAMPLES) * XT_T_MAX;
      const px = gx(t);
      const py = gy(preset.x(t));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    /* 已走过的图线（实线） */
    if (state.t > 0) {
      ctx.strokeStyle = sem.curve;
      ctx.lineWidth = 4 * scale;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      const steps = Math.max(2, Math.round((state.t / XT_T_MAX) * 300));
      for (let i = 0; i <= steps; i += 1) {
        const t = (i / steps) * state.t;
        const px = gx(t);
        const py = gy(preset.x(t));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    /* 实时坐标点 + 投影虚线 */
    if (state.t > 0) {
      const px = gx(state.t);
      const py = gy(state.x);
      ctx.strokeStyle = sem.moverDim;
      ctx.lineWidth = 1.6 * scale;
      ctx.setLineDash([5 * scale, 5 * scale]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, axisY0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(padL, py);
      ctx.stroke();
      ctx.setLineDash([]);

      /* 投影坐标值 */
      ctx.fillStyle = sem.mover;
      ctx.font = font(13, scale);
      ctx.textAlign = 'center';
      ctx.fillText(
        state.t.toFixed(1),
        px,
        axisY0 + (py < axisY0 ? -12 * scale : 36 * scale)
      );
      ctx.textAlign = 'right';
      ctx.fillText(
        `${state.x >= 0 ? '+' : ''}${state.x.toFixed(1)}`,
        padL - 10 * scale,
        py - 8 * scale
      );

      /* 光点（双层光晕） */
      ctx.beginPath();
      ctx.arc(px, py, 13 * scale, 0, Math.PI * 2);
      ctx.fillStyle = sem.moverGlow;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, 7 * scale, 0, Math.PI * 2);
      ctx.fillStyle = sem.mover;
      ctx.strokeStyle = theme === 'dark' ? '#0f172a' : '#ffffff';
      ctx.lineWidth = 2 * scale;
      ctx.fill();
      ctx.stroke();

      /* 坐标标注牌 */
      const label = `( ${state.t.toFixed(2)} s , ${state.x >= 0 ? '+' : ''}${state.x.toFixed(2)} m )`;
      ctx.font = font(13, scale);
      const tw = ctx.measureText(label).width;
      let lx = px + 14 * scale;
      let ly = py - 14 * scale;
      if (lx + tw + 14 * scale > width - padR) lx = px - tw - 22 * scale;
      /* 顶部预留更大空间，避开悬浮 transport bar 的覆盖区 */
      if (ly - 16 * scale < padT + 24 * scale) ly = py + 26 * scale;
      ctx.fillStyle = sem.labelBg;
      ctx.strokeStyle = sem.mover;
      ctx.lineWidth = 1.6 * scale;
      ctx.beginPath();
      ctx.roundRect(
        lx - 8 * scale,
        ly - 16 * scale,
        tw + 16 * scale,
        24 * scale,
        6 * scale
      );
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = sem.mover;
      ctx.textAlign = 'left';
      ctx.fillText(label, lx, ly);
    }
  }

  /* ────────────────────── 位置轴区 ────────────────────── */

  function drawTrack(
    state: XtGraphState,
    scale: number,
    regionTop: number,
    regionH: number
  ): void {
    if (!ctx) return;
    const c = getThemeColors(theme);
    const sem = semanticColors(theme);

    const padX = 40 * scale;
    const axisY = regionTop + regionH * 0.55;
    const tx = (x: number) =>
      padX + ((x - XT_X_MIN) / (XT_X_MAX - XT_X_MIN)) * (width - 2 * padX);

    /* 区域标题 */
    ctx.fillStyle = c.textSecondary;
    ctx.font = font(12, scale);
    ctx.textAlign = 'left';
    ctx.fillText('位置轴', 10 * scale, regionTop + 14 * scale);

    /* 轴 + 箭头 */
    ctx.strokeStyle = c.canvasText;
    ctx.lineWidth = 2.5 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(padX, axisY);
    ctx.lineTo(width - padX, axisY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width - padX + 12 * scale, axisY);
    ctx.lineTo(width - padX, axisY - 6 * scale);
    ctx.lineTo(width - padX, axisY + 6 * scale);
    ctx.closePath();
    ctx.fillStyle = c.canvasText;
    ctx.fill();
    ctx.font = font(14, scale);
    ctx.textAlign = 'left';
    ctx.fillText('x/m', width - padX + 2 * scale, axisY - 12 * scale);

    /* 刻度（每 2m 一标，与原演示一致；窄屏字号由 scaledSize 钳制下限） */
    ctx.font = font(11, scale);
    for (let x = XT_X_MIN; x <= XT_X_MAX; x += 2) {
      const px = tx(x);
      ctx.strokeStyle = c.textSecondary;
      ctx.lineWidth = 1.4 * scale;
      ctx.beginPath();
      ctx.moveTo(px, axisY);
      ctx.lineTo(px, axisY - (x % 10 === 0 ? 14 : 9) * scale);
      ctx.stroke();
      ctx.fillStyle = c.textSecondary;
      ctx.textAlign = 'center';
      ctx.fillText(x > 0 ? `+${x}` : String(x), px, axisY + 18 * scale);
    }
    ctx.fillStyle = c.canvasText;
    ctx.textAlign = 'center';
    ctx.font = font(11, scale);
    ctx.fillText('原点 O', tx(0), axisY + 34 * scale);

    const cx = tx(state.x);
    const cy = axisY - 24 * scale;
    const dir = state.v < -1e-6 ? -1 : 1;

    /* 小车投影虚线（与图像区呼应） */
    ctx.strokeStyle = sem.moverDim;
    ctx.setLineDash([4 * scale, 4 * scale]);
    ctx.lineWidth = 1.4 * scale;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 24 * scale);
    ctx.lineTo(cx, axisY - 2 * scale);
    ctx.stroke();
    ctx.setLineDash([]);

    /* 小车（路径在单位坐标系下绘制，整体按 scale 缩放并朝运动方向镜像） */
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(dir * scale, scale);
    /* 车身阴影 */
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath();
    ctx.ellipse(0, 25, 40, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    /* 车身 */
    const body = ctx.createLinearGradient(0, -14, 0, 16);
    if (theme === 'dark') {
      body.addColorStop(0, '#fca5a5');
      body.addColorStop(0.5, '#f87171');
      body.addColorStop(1, '#b91c1c');
    } else {
      body.addColorStop(0, '#f87171');
      body.addColorStop(0.5, '#dc2626');
      body.addColorStop(1, '#991b1b');
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-38, 12);
    ctx.lineTo(-38, -4);
    ctx.quadraticCurveTo(-38, -10, -30, -10);
    ctx.lineTo(-23, -10);
    ctx.lineTo(-15, -20);
    ctx.quadraticCurveTo(-12, -23, -7, -23);
    ctx.lineTo(13, -23);
    ctx.quadraticCurveTo(19, -23, 23, -18);
    ctx.lineTo(29, -10);
    ctx.lineTo(36, -8);
    ctx.quadraticCurveTo(40, -6, 40, 0);
    ctx.lineTo(40, 12);
    ctx.quadraticCurveTo(40, 16, 36, 16);
    ctx.lineTo(-34, 16);
    ctx.quadraticCurveTo(-38, 16, -38, 12);
    ctx.closePath();
    ctx.fill();
    /* 车窗 */
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(-12, -19);
    ctx.lineTo(-7, -19);
    ctx.lineTo(-7, -11);
    ctx.lineTo(-19, -11);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-3, -19);
    ctx.lineTo(11, -19);
    ctx.quadraticCurveTo(15, -19, 18, -15);
    ctx.lineTo(23, -11);
    ctx.lineTo(-3, -11);
    ctx.closePath();
    ctx.fill();
    /* 车灯光束（朝前） */
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(38, 2, 3, 0, Math.PI * 2);
    ctx.fill();
    const noseX = 40;
    const beamEndX = noseX + 34;
    const beam = ctx.createLinearGradient(noseX, 0, beamEndX, 0);
    beam.addColorStop(0, 'rgba(253,230,138,0.5)');
    beam.addColorStop(1, 'rgba(253,230,138,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(noseX, -2);
    ctx.lineTo(beamEndX, -9);
    ctx.lineTo(beamEndX, 13);
    ctx.lineTo(noseX, 6);
    ctx.closePath();
    ctx.fill();
    /* 车轮（轮辐按滚动约束 x = r·θ 转动，位移确定则转角确定） */
    for (const wx of [-20, 20]) {
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(wx, 16, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d6d3cb';
      ctx.beginPath();
      ctx.arc(wx, 16, 3.5, 0, Math.PI * 2);
      ctx.fill();
      const rot = state.x / 9;
      ctx.strokeStyle = '#8a877e';
      ctx.lineWidth = 1.4;
      for (let s = 0; s < 3; s += 1) {
        const a = rot + (s * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(wx - Math.cos(a) * 7.5, 16 - Math.sin(a) * 7.5);
        ctx.lineTo(wx + Math.cos(a) * 7.5, 16 + Math.sin(a) * 7.5);
        ctx.stroke();
      }
    }
    ctx.restore();

    /* 速度矢量箭头 */
    if (Math.abs(state.v) > 1e-6 && state.t > 0) {
      const maxLen = 44 * scale;
      const len =
        Math.min(maxLen, (30 + Math.abs(state.v) * 14) * scale) *
        Math.sign(state.v);
      const ay = cy - 40 * scale;
      ctx.strokeStyle = sem.curve;
      ctx.lineWidth = 3 * scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, ay);
      ctx.lineTo(cx + len, ay);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + len + Math.sign(state.v) * 10 * scale, ay);
      ctx.lineTo(cx + len, ay - 6 * scale);
      ctx.lineTo(cx + len, ay + 6 * scale);
      ctx.closePath();
      ctx.fillStyle = sem.curve;
      ctx.fill();
      ctx.font = font(13, scale);
      ctx.textAlign = 'center';
      ctx.fillText(
        `v = ${state.v >= 0 ? '+' : ''}${state.v.toFixed(2)} m/s`,
        cx + len / 2,
        ay - 10 * scale
      );
    }

    /* 当前位置读数 */
    ctx.fillStyle = sem.mover;
    ctx.font = font(14, scale);
    ctx.textAlign = 'center';
    ctx.fillText(
      `x = ${state.x >= 0 ? '+' : ''}${state.x.toFixed(2)} m`,
      cx,
      axisY + 48 * scale
    );
  }

  function render(state: XtGraphState): void {
    if (!ctx || width === 0 || height === 0) {
      resize();
      if (!ctx) return;
    }
    const scale = responsiveScale * contentScale();
    const c = getThemeColors(theme);

    ctx.fillStyle = c.canvasBg;
    ctx.fillRect(0, 0, width, height);

    /* 上 67% 为图像区，下 33% 为位置轴区（与原演示 470:230 的比例一致） */
    const graphH = height * 0.67;
    drawGraph(state, scale, graphH);
    drawTrack(state, scale, graphH, height - graphH);
  }

  resize();

  return {
    render,
    resize,
    reset(): void {},
    setTheme(t: TeachingTheme): void {
      theme = t;
    },
    setMode(m: TeachingMode, h?: DemoRenderHints): void {
      mode = m;
      hints = h;
    },
    dispose(): void {
      ctx = null;
    }
  };
}
