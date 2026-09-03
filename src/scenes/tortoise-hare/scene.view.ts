/**
 * 龟兔赛跑视图
 *
 * 单画布复合渲染：上部为 x–t 图像区（乌龟/兔子两条图线同图对比，
 * 随时间逐点绘出），下部为赛道区（两只动物与图线同帧严格同步）。
 * 图线交点 = 相遇；兔子中途停下时画 Zzz；赛道右端为终点旗。
 * 所有元素尺寸由 responsiveScale × 演示模式 contentScale 推导。
 */

import { sizeCanvasToFill, scaledSize } from '../../core/canvas-sizing';
import { getThemeColors } from '../../core/colors';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import {
  getRacePreset,
  RACE_T_MAX,
  RACE_X_MIN,
  RACE_X_MAX,
  type RaceMover,
  type RaceState
} from './scene.sim';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** 字体助手：按 scale 缩放字号并钳制最小可读值 */
function font(base: number, scale: number, weight = 'bold'): string {
  return `${weight} ${scaledSize(base, scale, 9)}px ${MONO}`;
}

/** 语义色：乌龟=青绿，兔子=橙；相遇/终点=金黄 */
function semanticColors(theme: TeachingTheme) {
  const isDark = theme === 'dark';
  return {
    tortoise: isDark ? '#2dd4bf' : '#0d9488',
    tortoiseGhost: isDark ? 'rgba(45,212,191,0.35)' : 'rgba(13,148,136,0.38)',
    hare: isDark ? '#fb923c' : '#ea580c',
    hareGhost: isDark ? 'rgba(251,146,60,0.35)' : 'rgba(234,88,12,0.38)',
    meet: '#eab308',
    labelBg: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)',
    gridStrong: isDark ? 'rgba(148,163,184,0.3)' : 'rgba(93,109,126,0.35)'
  };
}

/** 由主色推导半透明光晕/投影色 */
function ghostDim(color: string): string {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.55)`;
}

export type CreateTortoiseHareViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

export function createTortoiseHareView(
  options: CreateTortoiseHareViewOptions = {}
) {
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

  function contentScale(): number {
    return mode === 'presentation' ? (hints?.contentScale ?? 1.5) : 1;
  }

  /* ────────────────────── x–t 图像区 ────────────────────── */

  function drawGraph(state: RaceState, scale: number, regionH: number): void {
    if (!ctx) return;
    const c = getThemeColors(theme);
    const sem = semanticColors(theme);

    const padL = 46 * scale;
    const padR = 28 * scale;
    const padT = 30 * scale;
    const padB = 34 * scale;
    const gx = (t: number) => padL + (t / RACE_T_MAX) * (width - padL - padR);
    const gy = (x: number) =>
      padT +
      (1 - (x - RACE_X_MIN) / (RACE_X_MAX - RACE_X_MIN)) *
        (regionH - padT - padB);

    /* 网格 */
    ctx.lineWidth = 1;
    for (let t = 0; t <= RACE_T_MAX; t += 1) {
      ctx.strokeStyle = t % 5 === 0 ? sem.gridStrong : c.canvasGrid;
      ctx.beginPath();
      ctx.moveTo(gx(t), padT);
      ctx.lineTo(gx(t), regionH - padB);
      ctx.stroke();
    }
    for (let x = RACE_X_MIN; x <= RACE_X_MAX; x += 2) {
      ctx.strokeStyle = x % 8 === 0 ? sem.gridStrong : c.canvasGrid;
      ctx.beginPath();
      ctx.moveTo(padL, gy(x));
      ctx.lineTo(width - padR, gy(x));
      ctx.stroke();
    }

    /* 坐标轴：纵轴在左，时间轴在底部（x = 0） */
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
    for (let t = 1; t <= RACE_T_MAX; t += 1) {
      ctx.fillText(String(t), gx(t), axisY0 + 20 * scale);
    }
    ctx.textAlign = 'right';
    for (let x = RACE_X_MIN; x <= RACE_X_MAX; x += 4) {
      ctx.fillText(String(x), padL - 10 * scale, gy(x) + 4);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = c.canvasText;
    ctx.font = font(14, scale);
    ctx.fillText('x/m', padL + 10 * scale, padT + 14 * scale);
    ctx.fillText('t/s', width - padR - 8 * scale, axisY0 - 10 * scale);

    /* 终点线（水平虚线 + 标签） */
    ctx.strokeStyle = sem.meet;
    ctx.lineWidth = 2 * scale;
    ctx.setLineDash([8 * scale, 6 * scale]);
    ctx.beginPath();
    ctx.moveTo(padL, gy(RACE_X_MAX));
    ctx.lineTo(width - padR, gy(RACE_X_MAX));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = sem.meet;
    ctx.font = font(12, scale);
    ctx.textAlign = 'left';
    ctx.fillText('终点', padL + 6 * scale, gy(RACE_X_MAX) + 16 * scale);

    /* 图线末端标签（沿曲线标注名字，t=0 无动点时也可辨识） */
    const preset = getRacePreset(state.preset);
    const clampX = (x: number) => Math.min(RACE_X_MAX, Math.max(RACE_X_MIN, x));
    ctx.font = font(12, scale);
    ctx.textAlign = 'right';
    const endLabel = (
      mover: RaceMover,
      color: string,
      name: string,
      above: boolean
    ): void => {
      if (!ctx) return;
      const ex = gx(RACE_T_MAX) - 6 * scale;
      const ey = gy(clampX(mover.x(RACE_T_MAX))) + (above ? -10 : 18) * scale;
      ctx.fillStyle = color;
      ctx.fillText(name, ex, ey);
    };
    endLabel(preset.a, sem.tortoise, '乌龟', true);
    endLabel(preset.b, sem.hare, '兔子', false);

    /* 图线绘制（虚线预览 + 已走过实线） */
    const SAMPLES = 300;
    const drawCurve = (
      mover: RaceMover,
      ghostColor: string,
      solidColor: string
    ): void => {
      if (!ctx) return;
      ctx.strokeStyle = ghostColor;
      ctx.lineWidth = 2.5 * scale;
      ctx.setLineDash([6 * scale, 6 * scale]);
      ctx.beginPath();
      for (let i = 0; i <= SAMPLES; i += 1) {
        const t = (i / SAMPLES) * RACE_T_MAX;
        const px = gx(t);
        const py = gy(clampX(mover.x(t)));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      if (state.t > 0) {
        ctx.strokeStyle = solidColor;
        ctx.lineWidth = 4 * scale;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        const steps = Math.max(2, Math.round((state.t / RACE_T_MAX) * SAMPLES));
        for (let i = 0; i <= steps; i += 1) {
          const t = (i / steps) * state.t;
          const px = gx(t);
          const py = gy(clampX(mover.x(t)));
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    };
    drawCurve(preset.a, sem.tortoiseGhost, sem.tortoise);
    drawCurve(preset.b, sem.hareGhost, sem.hare);

    /* 实时动点 + 名字标签 */
    if (state.t > 0) {
      const drawDot = (
        x: number,
        color: string,
        name: string,
        above: boolean
      ): void => {
        if (!ctx) return;
        const px = gx(state.t);
        const py = gy(x);
        /* 投影虚线 */
        ctx.strokeStyle = ghostDim(color);
        ctx.lineWidth = 1.4 * scale;
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
        /* 光点 */
        ctx.beginPath();
        ctx.arc(px, py, 12 * scale, 0, Math.PI * 2);
        ctx.fillStyle = ghostDim(color);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, 6.5 * scale, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.strokeStyle = theme === 'dark' ? '#0f172a' : '#ffffff';
        ctx.lineWidth = 2 * scale;
        ctx.fill();
        ctx.stroke();
        /* 名字标签 */
        ctx.font = font(13, scale);
        const label = `${name} ${x.toFixed(1)}`;
        const tw = ctx.measureText(label).width;
        let lx = px + 12 * scale;
        let ly = py + (above ? -14 * scale : 24 * scale);
        if (lx + tw + 10 * scale > width - padR) lx = px - tw - 18 * scale;
        if (ly - 16 * scale < padT + 22 * scale) ly = py + 24 * scale;
        ctx.fillStyle = sem.labelBg;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4 * scale;
        ctx.beginPath();
        ctx.roundRect(
          lx - 7 * scale,
          ly - 15 * scale,
          tw + 14 * scale,
          22 * scale,
          6 * scale
        );
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.fillText(label, lx, ly);
      };
      /* 上下错开：乌龟标签在上方，兔子在下方 */
      drawDot(state.xa, sem.tortoise, '龟', true);
      drawDot(state.xb, sem.hare, '兔', false);

      /* 相遇标记 */
      if (Math.abs(state.xa - state.xb) < 0.2) {
        const px = gx(state.t);
        const py = gy(state.xa);
        ctx.fillStyle = sem.meet;
        ctx.font = font(14, scale);
        ctx.textAlign = 'center';
        ctx.fillText('★ 相遇', px, py - 26 * scale);
      }
    }
  }

  /* ────────────────────── 赛道区 ────────────────────── */

  /** 乌龟：单位坐标系内绘制，朝向 +x，整体由调用方 scale/镜像 */
  function drawTortoise(): void {
    if (!ctx) return;
    const shellDark = theme === 'dark' ? '#0f766e' : '#115e59';
    const shell = theme === 'dark' ? '#2dd4bf' : '#14b8a6';
    const skin = theme === 'dark' ? '#99f6e4' : '#5eead4';
    /* 腿 */
    ctx.fillStyle = shellDark;
    for (const lx of [-14, -5, 5, 14]) {
      ctx.beginPath();
      ctx.arc(lx, 10, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    /* 尾巴 */
    ctx.beginPath();
    ctx.moveTo(-22, 4);
    ctx.lineTo(-28, 8);
    ctx.lineTo(-21, 9);
    ctx.closePath();
    ctx.fill();
    /* 壳（半球 + 花纹） */
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.ellipse(0, 4, 24, 15, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shellDark;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 4, 24, 15, 0, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 4, 8, Math.PI, 0);
    ctx.stroke();
    /* 头 */
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(27, -2, 6.5, 0, Math.PI * 2);
    ctx.fill();
    /* 眼睛 */
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(29.5, -3.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    /* 腹甲 */
    ctx.fillStyle = shellDark;
    ctx.fillRect(-22, 3, 44, 4);
  }

  /** 兔子：单位坐标系内绘制（含字号），朝向 +x；sleeping 时垂耳、闭眼、画 Zzz */
  function drawHare(sleeping: boolean): void {
    if (!ctx) return;
    const fur = theme === 'dark' ? '#fb923c' : '#f97316';
    const furDark = theme === 'dark' ? '#c2410c' : '#9a3412';
    /* 腿 */
    ctx.fillStyle = furDark;
    ctx.beginPath();
    ctx.ellipse(-12, 10, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(10, 11, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    /* 尾巴 */
    ctx.fillStyle = '#fff7ed';
    ctx.beginPath();
    ctx.arc(-20, 2, 5, 0, Math.PI * 2);
    ctx.fill();
    /* 身体 */
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(-2, 2, 19, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    /* 头 */
    ctx.beginPath();
    ctx.arc(16, -7, 9, 0, Math.PI * 2);
    ctx.fill();
    /* 耳朵（睡觉时下趴） */
    ctx.save();
    ctx.translate(13, -14);
    ctx.rotate(sleeping ? -1.2 : -0.35);
    ctx.beginPath();
    ctx.ellipse(0, -8, 3.5, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(19, -14);
    ctx.rotate(sleeping ? -0.7 : 0.15);
    ctx.beginPath();
    ctx.ellipse(0, -8, 3.5, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    /* 鼻子 */
    ctx.fillStyle = furDark;
    ctx.beginPath();
    ctx.arc(24.5, -5.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    /* 眼睛：跑动为点，睡觉为闭合线 + Zzz */
    if (sleeping) {
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(16, -9);
      ctx.lineTo(20, -7);
      ctx.stroke();
      /* Zzz（字号为常量：外层 ctx 已按 scale 缩放，不能再乘） */
      ctx.fillStyle = furDark;
      ctx.textAlign = 'left';
      ctx.font = `bold 11px ${MONO}`;
      ctx.fillText('Z', 4, -22);
      ctx.font = `bold 9px ${MONO}`;
      ctx.fillText('z', 12, -28);
      ctx.font = `bold 7px ${MONO}`;
      ctx.fillText('z', 18, -33);
    } else {
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(18.5, -9, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTrack(
    state: RaceState,
    scale: number,
    regionTop: number,
    regionH: number
  ): void {
    if (!ctx) return;
    const c = getThemeColors(theme);
    const sem = semanticColors(theme);

    const padX = 40 * scale;
    const axisY = regionTop + regionH * 0.58;
    const tx = (x: number) =>
      padX +
      ((x - RACE_X_MIN) / (RACE_X_MAX - RACE_X_MIN)) * (width - 2 * padX);

    /* 区域标题 */
    ctx.fillStyle = c.textSecondary;
    ctx.font = font(12, scale);
    ctx.textAlign = 'left';
    ctx.fillText('赛道', 10 * scale, regionTop + 14 * scale);

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

    /* 刻度（每 2m） */
    ctx.font = font(11, scale);
    for (let x = RACE_X_MIN; x <= RACE_X_MAX; x += 2) {
      const px = tx(x);
      ctx.strokeStyle = c.textSecondary;
      ctx.lineWidth = 1.4 * scale;
      ctx.beginPath();
      ctx.moveTo(px, axisY);
      ctx.lineTo(px, axisY - (x % 8 === 0 ? 14 : 9) * scale);
      ctx.stroke();
      ctx.fillStyle = c.textSecondary;
      ctx.textAlign = 'center';
      ctx.fillText(String(x), px, axisY + 18 * scale);
    }

    /* 起点 / 终点旗 */
    ctx.fillStyle = c.canvasText;
    ctx.textAlign = 'center';
    ctx.font = font(11, scale);
    ctx.fillText('起点', tx(0), axisY + 34 * scale);
    const flagX = tx(RACE_X_MAX);
    ctx.strokeStyle = sem.meet;
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(flagX, axisY);
    ctx.lineTo(flagX, axisY - 40 * scale);
    ctx.stroke();
    ctx.fillStyle = sem.meet;
    ctx.beginPath();
    ctx.moveTo(flagX, axisY - 40 * scale);
    ctx.lineTo(flagX - 16 * scale, axisY - 34 * scale);
    ctx.lineTo(flagX, axisY - 28 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.canvasText;
    ctx.font = font(11, scale);
    ctx.fillText('终点', flagX, axisY + 34 * scale);

    /* 两只动物（上下错开两个车道避免重叠） */
    const met = Math.abs(state.xa - state.xb) < 0.2 && state.t > 0;
    const drawAnimal = (
      x: number,
      v: number,
      lane: number,
      draw: () => void
    ): void => {
      if (!ctx) return;
      const cx = tx(x);
      const cy = axisY - (lane === 0 ? 20 : 44) * scale;
      const dir = v < -1e-6 ? -1 : 1;
      ctx.strokeStyle = 'rgba(128,128,128,0.5)';
      ctx.setLineDash([4 * scale, 4 * scale]);
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 14 * scale);
      ctx.lineTo(cx, axisY - 2 * scale);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(dir * scale, scale);
      draw();
      ctx.restore();
    };
    const hareSleeping =
      Math.abs(state.vb) < 1e-6 &&
      state.xb > RACE_X_MIN + 1e-6 &&
      state.xb < RACE_X_MAX - 1e-6 &&
      state.t > 0;
    drawAnimal(state.xa, state.va, 0, drawTortoise);
    drawAnimal(state.xb, state.vb, 1, () => drawHare(hareSleeping));

    /* 相遇提示 */
    if (met) {
      ctx.fillStyle = sem.meet;
      ctx.font = font(15, scale);
      ctx.textAlign = 'center';
      ctx.fillText('★ 相遇！', tx(state.xa), axisY - 78 * scale);
    }

    /* 间距读数 */
    ctx.fillStyle = c.textSecondary;
    ctx.font = font(13, scale);
    ctx.textAlign = 'center';
    ctx.fillText(
      `间距 Δx = ${Math.abs(state.xa - state.xb).toFixed(2)} m`,
      width / 2,
      regionTop + regionH - 8 * scale
    );
  }

  function render(state: RaceState): void {
    if (!ctx || width === 0 || height === 0) {
      resize();
      if (!ctx) return;
    }
    const scale = responsiveScale * contentScale();
    const c = getThemeColors(theme);

    ctx.fillStyle = c.canvasBg;
    ctx.fillRect(0, 0, width, height);

    /* 上 67% 为图像区，下 33% 为赛道区 */
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
