import type { TeachingMode } from '../../platform/standards';
import { getTeachingStandards } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import { Colors, alpha } from '../../core/colors';
import type { VtIntegralSnapshot } from './scene.sim';

export type CreateVtIntegralViewOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
};

export function createVtIntegralView(
  options: CreateVtIntegralViewOptions = {}
) {
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  let mode: TeachingMode = options.mode ?? 'normal';
  let theme: TeachingTheme = options.theme ?? 'dark';
  let snapshot: VtIntegralSnapshot | null = null;
  let canvasWidth = 800;
  let canvasHeight = 600;

  function resizeCanvas(): void {
    if (!canvas) return;
    const newCtx = sizeCanvasToFill(canvas);
    ctx = newCtx;
    canvasWidth = canvas.clientWidth;
    canvasHeight = canvas.clientHeight;
  }

  function getThemeColor(light: string, dark: string): string {
    return theme === 'light' ? light : dark;
  }

  function drawMetricBox(
    x: number,
    y: number,
    lines: string[],
    fontSize: number,
    boxWidth = 330
  ): void {
    if (!ctx) return;
    const width = boxWidth;
    const lineHeight = Math.max(20, fontSize * 1.2);
    const height = 16 + lines.length * lineHeight;

    ctx.fillStyle = getThemeColor(
      alpha(Colors.white, 0.8),
      alpha(Colors.darkCard, 0.72)
    );
    ctx.strokeStyle = getThemeColor(
      alpha(Colors.gray, 0.45),
      alpha(Colors.grayLight, 0.35)
    );
    ctx.lineWidth = 1.5;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);

    if (!ctx) return;
    ctx.fillStyle = getThemeColor(Colors.dark, Colors.darkText);
    ctx.font = `600 ${fontSize}px "Noto Sans SC", "PingFang SC", sans-serif`;
    ctx.textAlign = 'left';
    lines.forEach((line, index) => {
      ctx?.fillText(line, x + 12, y + 22 + index * lineHeight);
    });
  }

  function drawCurveDemo(next: VtIntegralSnapshot): void {
    if (!ctx) return;
    const width = canvasWidth;
    const height = canvasHeight;
    const visuals = getTeachingStandards(mode).rightStage;
    const baseY = height * 0.75;
    const left = 70;
    const right = width - 60;
    const axisWidth = right - left;

    // X轴
    ctx.strokeStyle = getThemeColor(Colors.gray, Colors.grayLight);
    ctx.lineWidth = Math.max(2, visuals.minorStrokePx * 0.4);
    ctx.beginPath();
    ctx.moveTo(left, baseY);
    ctx.lineTo(right, baseY);
    ctx.stroke();

    // 曲线
    ctx.strokeStyle = Colors.mint;
    ctx.lineWidth = Math.max(2.4, visuals.majorStrokePx * 0.38);
    ctx.beginPath();
    for (let i = 0; i <= 500; i += 1) {
      const t = i / 500;
      const x = left + t * axisWidth;
      const y = baseY - (1 + 0.8 * (t * next.params.time)) * (height * 0.045);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 矩形填充（scene1）
    if (next.params.scene === 'scene1') {
      const n = next.params.rects;
      const dt = next.params.time / n;
      ctx.fillStyle = alpha(Colors.mint, 0.22);
      for (let i = 0; i < n; i += 1) {
        const t0 = i * dt;
        const t1 = (i + 1) * dt;
        const x0 = left + (t0 / next.params.time) * axisWidth;
        const x1 = left + (t1 / next.params.time) * axisWidth;
        const hVal = 1 + 0.8 * (t0 + t1) * 0.5;
        const hPix = hVal * (height * 0.045);
        ctx.fillRect(x0, baseY - hPix, Math.max(1, x1 - x0), hPix);
      }
    }
  }

  function drawSceneSpecific(next: VtIntegralSnapshot): void {
    if (!ctx) return;
    const width = canvasWidth;
    const height = canvasHeight;
    const visuals = getTeachingStandards(mode).rightStage;
    const scene = next.params.scene;

    // Scene3: 圆内接多边形
    if (scene === 'scene3') {
      const cx = width * 0.28;
      const cy = height * 0.42;
      const r = Math.min(width, height) * 0.2;

      ctx.strokeStyle = getThemeColor(Colors.grayLight, Colors.gray);
      ctx.lineWidth = Math.max(2, visuals.minorStrokePx * 0.35);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = Colors.mint;
      ctx.lineWidth = Math.max(2.2, visuals.majorStrokePx * 0.35);
      ctx.beginPath();
      for (let i = 0; i <= next.params.circleN; i += 1) {
        const theta = (i / next.params.circleN) * Math.PI * 2;
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      return;
    }

    // Scene4/5: 柱状图对比
    if (scene === 'scene4' || scene === 'scene5') {
      const baseX = width * 0.22;
      const baseY = height * 0.68;
      const barW = 48;
      const scale = height * 0.2;
      const trueV =
        scene === 'scene4' ? next.metrics.surfaceTrue : next.metrics.sphereTrue;
      const approxV =
        scene === 'scene4'
          ? next.metrics.surfaceApprox
          : next.metrics.sphereApprox;

      // 真实值（灰色）
      ctx.fillStyle = getThemeColor(Colors.grayLight, Colors.gray);
      ctx.fillRect(
        baseX,
        baseY - trueV * scale * 0.12,
        barW,
        trueV * scale * 0.12
      );

      // 近似值（薄荷色）
      ctx.fillStyle = Colors.mint;
      ctx.fillRect(
        baseX + 70,
        baseY - approxV * scale * 0.12,
        barW,
        approxV * scale * 0.12
      );
    }
  }

  function draw(next: VtIntegralSnapshot): void {
    if (!ctx) return;
    const width = canvasWidth;
    const height = canvasHeight;
    const visuals = getTeachingStandards(mode).rightStage;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 渐变背景
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, theme === 'light' ? '#eef2ff' : Colors.darkBg);
    gradient.addColorStop(
      1,
      theme === 'light' ? '#e0e7ff' : alpha(Colors.darkCard, 0.8)
    );
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    drawCurveDemo(next);
    drawSceneSpecific(next);

    // 数据面板内容
    const lines: string[] = [];
    if (next.params.scene === 'scene1') {
      lines.push(`矩形总面积: ${next.metrics.rectArea.toFixed(3)}`);
      lines.push(`积分面积: ${next.metrics.trueArea.toFixed(3)}`);
      lines.push(`绝对误差: ${next.metrics.absErr.toFixed(3)}`);
      lines.push(`相对误差: ${(next.metrics.relErr * 100).toFixed(2)}%`);
    } else if (next.params.scene === 'scene2') {
      lines.push(`曲线振幅: ${next.params.curveAmplitude.toFixed(2)}`);
      lines.push(`曲线长度: ${next.metrics.curveLength.toFixed(3)}`);
      lines.push(`直线距离: ${next.metrics.lineDistance.toFixed(3)}`);
    } else if (next.params.scene === 'scene3') {
      lines.push(`多边形 n: ${next.params.circleN}`);
      lines.push(`周长差: ${next.metrics.circumferenceDiff.toFixed(4)}`);
    } else if (next.params.scene === 'scene4') {
      lines.push(`真实体积: ${next.metrics.surfaceTrue.toFixed(4)}`);
      lines.push(`近似体积: ${next.metrics.surfaceApprox.toFixed(4)}`);
      lines.push(`相对误差: ${(next.metrics.surfaceRelErr * 100).toFixed(2)}%`);
    } else {
      lines.push(`真实体积: ${next.metrics.sphereTrue.toFixed(4)}`);
      lines.push(`近似体积: ${next.metrics.sphereApprox.toFixed(4)}`);
      lines.push(`相对误差: ${(next.metrics.sphereRelErr * 100).toFixed(2)}%`);
    }

    const boxWidth = Math.min(330, Math.max(180, width - 60));
    drawMetricBox(
      Math.max(16, width - boxWidth - 30),
      16,
      [`场景：${next.params.scene}`, ...lines],
      Math.max(12, visuals.secondaryFontPx * 0.34),
      boxWidth
    );
  }

  return {
    render(next: VtIntegralSnapshot): void {
      snapshot = next;
      draw(next);
    },
    resize(): void {
      resizeCanvas();
      if (snapshot) draw(snapshot);
    },
    setMode(nextMode: TeachingMode): void {
      mode = nextMode;
      if (snapshot) draw(snapshot);
    },
    setTheme(nextTheme: TeachingTheme): void {
      theme = nextTheme;
      if (snapshot) draw(snapshot);
    },
    dispose(): void {
      snapshot = null;
      canvas = null;
      ctx = null;
    }
  };
}
