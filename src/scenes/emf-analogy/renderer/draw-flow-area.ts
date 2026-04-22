import { getTeachingStandards } from '../../../platform/standards';
import type { TeachingMode, TeachingTheme } from '../../../platform/standards';
import { drawRoundedRect } from './draw-rounded-rect';
import type { EmfAnalogySnapshot } from '../scene.sim';

type Particle = {
  x: number;
  y: number;
  speedOffset: number;
  size: number;
};

type Readability = {
  primaryFontPx: number;
  secondaryFontPx: number;
  majorStrokePx: number;
  minorStrokePx: number;
  markerRadiusPx: number;
  visualScale: number;
};

const LEGACY_READABILITY_PRESET: Record<TeachingMode, Readability> = {
  normal: {
    primaryFontPx: 36,
    secondaryFontPx: 30,
    majorStrokePx: 6,
    minorStrokePx: 5,
    markerRadiusPx: 12,
    visualScale: 1.3
  },
  presentation: {
    primaryFontPx: 56,
    secondaryFontPx: 46,
    majorStrokePx: 11,
    minorStrokePx: 9,
    markerRadiusPx: 20,
    visualScale: 2.4
  }
};

export function buildParticles(): Particle[] {
  const particles: Particle[] = [];
  const particleCount = 160;
  for (let i = 0; i < particleCount; i += 1) {
    particles.push({
      x: Math.random() * 1400,
      y: (Math.random() - 0.5) * 26,
      speedOffset: 0.8 + Math.random() * 0.4,
      size: 2 + Math.random() * 2
    });
  }
  return particles;
}

export function drawFlowArea(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  next: EmfAnalogySnapshot,
  mode: TeachingMode,
  theme: TeachingTheme,
  particles: Particle[],
  impellerAngle: number
): number {
  const visuals = getTeachingStandards(mode).rightStage;
  const readability = LEGACY_READABILITY_PRESET[mode];
  const shortEdge = Math.min(width, height);
  const responsiveScale = Math.max(0.3, Math.min(1.0, shortEdge / 400));
  const visualScale = readability.visualScale * responsiveScale;
  const centerY = y + height * 0.56;
  const pipeHeight = Math.max(110 * visualScale, height * 0.22);
  const pipeY = centerY - pipeHeight * 0.5;
  const geometryScale = visualScale * 1.2;
  const majorStroke = Math.max(
    readability.majorStrokePx,
    visuals.majorStrokePx * 0.9,
    2 * geometryScale
  );
  const minorStroke = Math.max(
    readability.minorStrokePx,
    visuals.minorStrokePx * 0.9,
    1.2 * geometryScale
  );
  const primaryFont = Math.max(
    readability.primaryFontPx,
    visuals.primaryFontPx * 0.8,
    Math.round(12 * geometryScale)
  );
  const secondaryFont = Math.max(
    readability.secondaryFontPx,
    visuals.secondaryFontPx * 0.8,
    Math.round(10 * geometryScale)
  );
  const isLight = theme === 'light';
  const palette = isLight
    ? {
        pipeStart: '#dbeafe',
        pipeEnd: '#eff6ff',
        pipeBorder: '#cbd5e1',
        particleMain: '#2563eb',
        pumpBody: '#ffffff',
        pumpBorder: '#e2e8f0',
        pumpBlade: '#94a3b8',
        pumpCore: '#475569',
        labelMain: '#475569',
        resBody: '#fff7ed',
        resBorder: '#fdba74',
        resMesh: '#9a3412',
        resRust: 'rgba(124, 45, 18, 0.4)',
        resLabel: '#7c2d12',
        tapMain: '#d97706',
        tapDark: '#b45309',
        gaugeGuide: '#94a3b8',
        gaugeFace: '#ffffff',
        gaugeBorder: '#cbd5e1',
        gaugeNeedle: '#2563eb',
        gaugeText: '#334155',
        gaugeLabel: '#94a3b8'
      }
    : {
        pipeStart: '#1e3a8a',
        pipeEnd: '#0b1e3d',
        pipeBorder: '#4c6ea0',
        particleMain: '#60a5fa',
        pumpBody: '#0f172a',
        pumpBorder: '#475569',
        pumpBlade: '#64748b',
        pumpCore: '#cbd5e1',
        labelMain: '#cbd5e1',
        resBody: '#2b2117',
        resBorder: '#c97a36',
        resMesh: '#f59e0b',
        resRust: 'rgba(217, 119, 6, 0.45)',
        resLabel: '#fdba74',
        tapMain: '#f59e0b',
        tapDark: '#d97706',
        gaugeGuide: '#64748b',
        gaugeFace: '#0f172a',
        gaugeBorder: '#475569',
        gaugeNeedle: '#60a5fa',
        gaugeText: '#e2e8f0',
        gaugeLabel: '#94a3b8'
      };

  drawRoundedRect(ctx, x, y, width, height, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
  gradient.addColorStop(0, palette.pipeStart);
  gradient.addColorStop(1, palette.pipeEnd);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, pipeY, width, pipeHeight);

  ctx.strokeStyle = palette.pipeBorder;
  ctx.lineWidth = Math.max(majorStroke, readability.majorStrokePx * 1.15);
  ctx.beginPath();
  ctx.moveTo(x, pipeY);
  ctx.lineTo(x + width, pipeY);
  ctx.moveTo(x, pipeY + pipeHeight);
  ctx.lineTo(x + width, pipeY + pipeHeight);
  ctx.stroke();

  const pumpX = x + width * 0.16;
  const resX = x + width * 0.42;
  const tapX = x + width * 0.72;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, pipeY, width, pipeHeight);
  ctx.clip();

  const flowSpeed = next.state.currentI * 15;
  const idleVisibleCutoff = width * 0.36;
  for (const particle of particles) {
    if (next.state.isSystemOn) {
      particle.x += flowSpeed * particle.speedOffset;
    } else {
      particle.x += Math.sin(Date.now() / 500) * 0.2;
      if (particle.x > width * 0.55) {
        particle.x = -10 + Math.random() * 18;
      }
    }
    if (particle.x > width) {
      particle.x = -10;
    }
    if (!next.state.isSystemOn && particle.x > idleVisibleCutoff) {
      continue;
    }

    let color = palette.particleMain;
    if (particle.x > resX - x) {
      const dropRatio = next.state.internalDrop / 0.5;
      const opacity = 1.0 - dropRatio * 0.8;
      const base = isLight ? '37, 99, 235' : '96, 165, 250';
      color = `rgba(${base}, ${Math.max(0.2, opacity)})`;
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(
      x + particle.x,
      centerY + particle.y * visualScale,
      particle.size * visualScale,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(pumpX, centerY);
  ctx.beginPath();
  ctx.arc(0, 0, 45 * geometryScale, 0, Math.PI * 2);
  ctx.fillStyle = palette.pumpBody;
  ctx.fill();
  ctx.lineWidth = Math.max(majorStroke, readability.majorStrokePx * 1.15);
  ctx.strokeStyle = palette.pumpBorder;
  ctx.stroke();
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = 10 * geometryScale;
  ctx.rotate(impellerAngle);
  ctx.fillStyle = palette.pumpBlade;
  for (let i = 0; i < 6; i += 1) {
    ctx.beginPath();
    ctx.ellipse(
      0,
      -20 * geometryScale,
      8 * geometryScale,
      20 * geometryScale,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.rotate(Math.PI / 3);
  }
  ctx.beginPath();
  ctx.arc(0, 0, 10 * geometryScale, 0, Math.PI * 2);
  ctx.fillStyle = palette.pumpCore;
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = palette.labelMain;
  ctx.font = `700 ${Math.round(primaryFont)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('泵 (E)', pumpX, centerY + 65 * geometryScale);

  ctx.save();
  ctx.translate(resX, centerY);
  ctx.beginPath();
  ctx.arc(0, 0, 40 * geometryScale, 0, Math.PI * 2);
  ctx.fillStyle = palette.resBody;
  ctx.fill();
  ctx.lineWidth = Math.max(majorStroke, readability.majorStrokePx * 1.15);
  ctx.strokeStyle = palette.resBorder;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 35 * geometryScale, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = palette.resMesh;
  ctx.lineWidth = Math.max(minorStroke, readability.minorStrokePx * 1.15);
  const rustyStep = 8 * geometryScale;
  for (let i = -40 * geometryScale; i < 40 * geometryScale; i += rustyStep) {
    ctx.beginPath();
    ctx.moveTo(i, -40 * geometryScale);
    ctx.lineTo(i, 40 * geometryScale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-40 * geometryScale, i);
    ctx.lineTo(40 * geometryScale, i);
    ctx.stroke();
  }
  ctx.fillStyle = palette.resRust;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.arc(
      (Math.random() - 0.5) * 40 * geometryScale,
      (Math.random() - 0.5) * 40 * geometryScale,
      Math.random() * 8 * geometryScale,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = palette.resLabel;
  ctx.font = `700 ${Math.round(primaryFont)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('内阻 (r)', resX, centerY + 65 * geometryScale);

  ctx.save();
  ctx.translate(tapX, centerY - 20 * geometryScale);
  ctx.fillStyle = palette.tapMain;
  ctx.fillRect(-10 * geometryScale, 0, 20 * geometryScale, 30 * geometryScale);
  ctx.beginPath();
  ctx.moveTo(-10 * geometryScale, 0);
  ctx.quadraticCurveTo(
    -10 * geometryScale,
    -20 * geometryScale,
    20 * geometryScale,
    -25 * geometryScale
  );
  ctx.lineTo(30 * geometryScale, -20 * geometryScale);
  ctx.lineTo(30 * geometryScale, -10 * geometryScale);
  ctx.lineTo(20 * geometryScale, -15 * geometryScale);
  ctx.quadraticCurveTo(
    10 * geometryScale,
    -10 * geometryScale,
    10 * geometryScale,
    0
  );
  ctx.fill();
  ctx.fillStyle = palette.tapDark;
  ctx.save();
  ctx.translate(0, -25 * geometryScale);
  ctx.beginPath();
  ctx.moveTo(-15 * geometryScale, -5 * geometryScale);
  ctx.lineTo(15 * geometryScale, -5 * geometryScale);
  ctx.lineTo(15 * geometryScale, 5 * geometryScale);
  ctx.lineTo(-15 * geometryScale, 5 * geometryScale);
  ctx.fill();
  ctx.fillRect(-5 * geometryScale, 0, 10 * geometryScale, 15 * geometryScale);
  ctx.restore();
  ctx.restore();

  ctx.fillStyle = palette.labelMain;
  ctx.font = `700 ${Math.round(primaryFont)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('用户水管', tapX, centerY + 65 * geometryScale);

  const drawGauge = (gaugeX: number, value: number, label: string) => {
    const gy = Math.max(y + 24 * visualScale, pipeY - 78 * geometryScale);
    ctx.strokeStyle = palette.gaugeGuide;
    ctx.setLineDash([4 * geometryScale, 4 * geometryScale]);
    ctx.lineWidth = Math.max(minorStroke, readability.minorStrokePx * 1.15);
    ctx.beginPath();
    ctx.moveTo(gaugeX, gy + 20 * geometryScale);
    ctx.lineTo(gaugeX, centerY - 20 * geometryScale);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(gaugeX, gy, 22 * geometryScale, 0, Math.PI * 2);
    ctx.fillStyle = palette.gaugeFace;
    ctx.fill();
    ctx.strokeStyle = palette.gaugeBorder;
    ctx.lineWidth = Math.max(majorStroke, readability.majorStrokePx * 1.15);
    ctx.stroke();

    const angle = Math.PI * (0.8 + value / 2);
    const nx = gaugeX + Math.cos(angle) * 16 * geometryScale;
    const ny = gy + Math.sin(angle) * 16 * geometryScale;
    ctx.strokeStyle = palette.gaugeNeedle;
    ctx.lineWidth = Math.max(majorStroke, readability.majorStrokePx * 1.15);
    ctx.beginPath();
    ctx.moveTo(gaugeX, gy);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    ctx.fillStyle = palette.gaugeText;
    ctx.font = `${Math.round(secondaryFont)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(value.toFixed(2), gaugeX, gy - 28 * geometryScale);

    ctx.fillStyle = palette.gaugeLabel;
    ctx.font = `${Math.round(secondaryFont)}px sans-serif`;
    ctx.fillText(label, gaugeX, gy + 35 * geometryScale);
  };

  drawGauge(resX - 60 * visualScale, 1.5, '内部压力');
  drawGauge(resX + 60 * visualScale, next.state.terminalVoltage, '输出压力');

  return impellerAngle + (next.state.isSystemOn ? 0.15 : 0.02);
}
