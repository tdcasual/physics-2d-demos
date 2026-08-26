/**
 * 步骤指示器（底部进度条）
 */

export function drawStepIndicator(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  currentStep: number,
  totalSteps: number,
  labels: string[],
  isDark: boolean,
  responsiveScale: number
): void {
  const s = responsiveScale;
  const barW = Math.min(400 * s, width * 0.7);
  const barH = Math.max(3, 4 * s);
  const startX = (width - barW) * 0.5;
  const startY = height - Math.max(40, 55 * s);
  const stepW = barW / (totalSteps - 1);

  ctx.save();

  // 背景线
  ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.2)' : 'rgba(71,85,105,0.15)';
  ctx.lineWidth = barH;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(startX + barW, startY);
  ctx.stroke();

  // 已完成线段
  const progressX = startX + currentStep * stepW;
  ctx.strokeStyle = isDark ? 'rgba(56,189,248,0.7)' : 'rgba(14,165,233,0.6)';
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(progressX, startY);
  ctx.stroke();

  // 步骤圆点
  const dotR = Math.max(5, 7 * s);
  for (let i = 0; i < totalSteps; i++) {
    const cx = startX + i * stepW;
    const isDone = i <= currentStep;
    const isCurrent = i === currentStep;

    // 外圈
    ctx.beginPath();
    ctx.arc(cx, startY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = isDone
      ? isDark
        ? '#38bdf8'
        : '#0ea5e9'
      : isDark
        ? 'rgba(30,41,59,0.9)'
        : 'rgba(241,245,249,0.9)';
    ctx.fill();

    ctx.strokeStyle = isDone
      ? isDark
        ? '#38bdf8'
        : '#0ea5e9'
      : isDark
        ? 'rgba(148,163,184,0.4)'
        : 'rgba(71,85,105,0.3)';
    ctx.lineWidth = isCurrent ? 2 : 1;
    ctx.stroke();

    // 当前步骤发光效果
    if (isCurrent) {
      ctx.beginPath();
      ctx.arc(cx, startY, dotR + 3, 0, Math.PI * 2);
      ctx.strokeStyle = isDark
        ? 'rgba(56,189,248,0.3)'
        : 'rgba(14,165,233,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 标签
    if (labels[i]) {
      ctx.fillStyle = isDone
        ? isDark
          ? '#e2e8f0'
          : '#1e293b'
        : isDark
          ? 'rgba(226,232,240,0.5)'
          : 'rgba(71,85,105,0.5)';
      ctx.font = `${Math.max(9, Math.round(11 * s))}px "Noto Sans SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(labels[i], cx, startY + dotR + 6);
    }
  }

  ctx.restore();
}
