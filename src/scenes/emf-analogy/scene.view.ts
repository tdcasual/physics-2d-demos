import {
  getTeachingStandards,
  type TeachingMode
} from '../../app/teaching-standards';
import type { TeachingTheme } from '../../app/teaching-standards';
import {
  applyHiDpiCanvasMetrics,
  computeHiDpiCanvasMetrics
} from '../../core/high-dpi-canvas';
import type { EmfAnalogySnapshot } from './scene.sim';

export type CreateEmfAnalogyViewOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
  legacyFlowDark?: boolean;
};

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

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function buildParticles(): Particle[] {
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

function drawCards(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  snapshot: EmfAnalogySnapshot,
  theme: TeachingTheme
): void {
  const isDark = theme === 'dark';
  const baseCardBg = isDark ? '#111b2d' : '#ffffff';
  const baseCardBorder = isDark ? '#334155' : '#e2e8f0';
  const baseTitleColor = isDark ? '#94a3b8' : '#64748b';

  const gap = Math.max(6, width * 0.01);
  const cardWidth = (width - gap * 4) / 5;
  const cardHeight = height;

  const cards = [
    {
      title: '系统状态',
      value: snapshot.state.isSystemOn ? '通路' : '断路',
      valueColor: snapshot.state.isSystemOn
        ? isDark
          ? '#60a5fa'
          : '#1d4ed8'
        : isDark
          ? '#cbd5e1'
          : '#334155',
      bg: baseCardBg,
      border: baseCardBorder,
      titleColor: baseTitleColor
    },
    {
      title: '开度',
      value: `${Math.round(snapshot.state.tapOpening * 100)}%`,
      valueColor: isDark ? '#e2e8f0' : '#1f2937',
      bg: baseCardBg,
      border: baseCardBorder,
      titleColor: baseTitleColor
    },
    {
      title: '电流 I',
      value: `${snapshot.state.currentI.toFixed(2)} A`,
      valueColor: isDark ? '#60a5fa' : '#1d4ed8',
      bg: baseCardBg,
      border: baseCardBorder,
      titleColor: baseTitleColor
    },
    {
      title: '内阻压降 Ir',
      value: `${snapshot.state.internalDrop.toFixed(2)} V`,
      valueColor: isDark ? '#f87171' : '#dc2626',
      bg: baseCardBg,
      border: baseCardBorder,
      titleColor: baseTitleColor
    },
    {
      title: '路端电压 U',
      value: `${snapshot.state.terminalVoltage.toFixed(2)} V`,
      valueColor: '#4ade80',
      bg: '#0f172a',
      border: '#1e293b',
      titleColor: '#94a3b8'
    }
  ] as const;

  const titleFont = 14;
  const valueFont = 24;

  cards.forEach((card, index) => {
    const left = x + index * (cardWidth + gap);
    drawRoundedRect(
      ctx,
      left,
      y,
      cardWidth,
      cardHeight,
      Math.max(7, cardHeight * 0.12)
    );
    ctx.fillStyle = card.bg;
    ctx.fill();
    ctx.strokeStyle = card.border;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    if (card.title) {
      ctx.fillStyle = card.titleColor;
      ctx.font = `500 ${titleFont}px sans-serif`;
      ctx.fillText(card.title, left + cardWidth * 0.08, y + cardHeight * 0.14);
    }

    ctx.fillStyle = card.valueColor;
    ctx.font = `700 ${valueFont}px sans-serif`;
    ctx.fillText(
      card.value,
      left + cardWidth * 0.08,
      y + cardHeight * (card.title ? 0.46 : 0.32)
    );
  });
}

function drawLegendAndFormula(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  snapshot: EmfAnalogySnapshot
): void {
  const panelX = x + 12;
  const panelY = y + 12;
  const panelW = 144;
  const panelH = 58;

  drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 10);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = `600 ${Math.max(9, Math.round(panelH * 0.18))}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('颜色代表水压 (电势)', panelX + 10, panelY + 9);

  const gradX = panelX + 10;
  const gradY = panelY + panelH * 0.52;
  const gradW = panelW - 24;
  const gradH = Math.max(7, panelH * 0.11);
  const gradient = ctx.createLinearGradient(gradX, gradY, gradX + gradW, gradY);
  gradient.addColorStop(0, '#2563eb');
  gradient.addColorStop(1, '#dbeafe');
  drawRoundedRect(ctx, gradX, gradY, gradW, gradH, gradH * 0.5);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 ${Math.max(8, Math.round(panelH * 0.15))}px sans-serif`;
  ctx.fillText('高', panelX + 10, panelY + panelH - 16);
  ctx.textAlign = 'right';
  ctx.fillText('低', panelX + panelW - 10, panelY + panelH - 16);

  const formulaW = Math.min(width * 0.35, 300);
  const formulaH = Math.max(24, Math.min(34, height * 0.05));
  const formulaX = x + (width - formulaW) * 0.5;
  const formulaY = y + height - formulaH - Math.max(10, height * 0.03);

  drawRoundedRect(ctx, formulaX, formulaY, formulaW, formulaH, 10);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.stroke();

  const prefix = `U = E - Ir = 1.50 - ${snapshot.state.internalDrop.toFixed(2)} = `;
  const value = `${snapshot.state.terminalVoltage.toFixed(2)} V`;
  let fontPx = Math.max(13, Math.round(formulaH * 0.53));

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let prefixFont = `500 ${fontPx}px monospace`;
  let valueFont = `700 ${fontPx}px monospace`;
  let prefixWidth = 0;
  let valueWidth = 0;
  do {
    prefixFont = `500 ${fontPx}px monospace`;
    valueFont = `700 ${fontPx}px monospace`;
    ctx.font = prefixFont;
    prefixWidth = ctx.measureText(prefix).width;
    ctx.font = valueFont;
    valueWidth = ctx.measureText(value).width;
    if (prefixWidth + valueWidth <= formulaW - 24 || fontPx <= 9) {
      break;
    }
    fontPx -= 1;
  } while (fontPx >= 9);

  const textX = formulaX + (formulaW - prefixWidth - valueWidth) * 0.5;
  const textY = formulaY + formulaH * 0.56;

  ctx.fillStyle = '#e2e8f0';
  ctx.font = prefixFont;
  ctx.fillText(prefix, textX, textY);
  ctx.fillStyle = '#4ade80';
  ctx.font = valueFont;
  ctx.fillText(value, textX + prefixWidth, textY);
}

function drawFlowArea(
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
  const visualScale = readability.visualScale;
  const centerY = y + height * 0.56;
  const pipeHeight = Math.max(110 * visualScale, height * 0.24);
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

export function createEmfAnalogyView(
  options: CreateEmfAnalogyViewOptions = {}
) {
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  let mode: TeachingMode = options.mode ?? 'normal';
  let theme: TeachingTheme = options.theme ?? 'dark';
  const legacyFlowDark = options.legacyFlowDark ?? false;
  let snapshot: EmfAnalogySnapshot | null = null;
  let surface = computeHiDpiCanvasMetrics({
    cssWidth: 1280,
    cssHeight: 720,
    devicePixelRatio: 1
  });

  const particles = buildParticles();
  let impellerAngle = 0;
  let rafId: number | null = null;

  type LegacyOverlay = {
    root: HTMLDivElement;
    topbar: HTMLDivElement;
    stateValue: HTMLDivElement;
    openingValue: HTMLDivElement;
    currentValue: HTMLDivElement;
    dropValue: HTMLDivElement;
    terminalValue: HTMLDivElement;
    legend: HTMLDivElement;
    formula: HTMLDivElement;
    formulaPrefix: HTMLSpanElement;
    formulaValue: HTMLSpanElement;
  };

  function createLegacyOverlay(): LegacyOverlay | null {
    if (
      !legacyFlowDark ||
      !canvas ||
      !(canvas.parentElement instanceof HTMLElement)
    ) {
      return null;
    }
    const host = canvas.parentElement;
    if (
      typeof window !== 'undefined' &&
      window.getComputedStyle(host).position === 'static'
    ) {
      host.style.position = 'relative';
    }

    const root = document.createElement('div');
    root.style.position = 'absolute';
    root.style.inset = '0';
    root.style.pointerEvents = 'none';
    root.style.zIndex = '2';
    root.style.fontFamily = 'sans-serif';

    const topbar = document.createElement('div');
    topbar.style.position = 'absolute';
    topbar.style.display = 'grid';
    topbar.style.gridTemplateColumns = 'repeat(5, minmax(0, 1fr))';
    topbar.style.gap = '8px';
    topbar.style.padding = '10px 12px';
    topbar.style.borderBottom = '1px solid #e2e8f0';
    topbar.style.background = 'linear-gradient(90deg, #f8fafc, #eff6ff)';
    topbar.style.borderRadius = '10px';
    topbar.style.boxSizing = 'border-box';

    const createCard = (
      title: string,
      dark = false
    ): { card: HTMLDivElement; value: HTMLDivElement } => {
      const card = document.createElement('div');
      card.style.border = '1px solid #cbd5e1';
      card.style.borderRadius = '10px';
      card.style.padding = '6px 10px';
      card.style.background = dark ? '#0f172a' : '#ffffff';
      card.style.display = 'grid';
      card.style.alignContent = 'start';
      card.style.boxSizing = 'border-box';

      const titleEl = document.createElement('div');
      titleEl.textContent = title;
      titleEl.style.fontSize = '14px';
      titleEl.style.lineHeight = '1.2';
      titleEl.style.color = dark ? '#94a3b8' : '#64748b';
      card.appendChild(titleEl);

      const valueEl = document.createElement('div');
      valueEl.style.marginTop = '4px';
      valueEl.style.fontSize = '24px';
      valueEl.style.fontWeight = '700';
      valueEl.style.lineHeight = '1.05';
      valueEl.style.color = dark ? '#4ade80' : '#1f2937';
      card.appendChild(valueEl);
      return { card, value: valueEl };
    };

    const state = createCard('系统状态');
    const opening = createCard('开度');
    const current = createCard('电流 I');
    const drop = createCard('内阻压降 Ir');
    const terminal = createCard('路端电压 U', true);

    topbar.append(
      state.card,
      opening.card,
      current.card,
      drop.card,
      terminal.card
    );

    const legend = document.createElement('div');
    legend.style.position = 'absolute';
    legend.style.width = '160px';
    legend.style.padding = '9px 12px';
    legend.style.border = '1px solid #e2e8f0';
    legend.style.borderRadius = '10px';
    legend.style.background = 'rgba(255, 255, 255, 0.9)';
    legend.style.boxSizing = 'border-box';
    legend.innerHTML = `
      <div style="font-size:14px; color:#64748b; font-weight:600; line-height:1.2; margin-bottom:6px;">颜色代表水压 (电势)</div>
      <div style="height:8px; border-radius:999px; background: linear-gradient(90deg, #2563eb, #dbeafe);"></div>
      <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:13px; color:#94a3b8;"><span>高</span><span>低</span></div>
    `;

    const formula = document.createElement('div');
    formula.style.position = 'absolute';
    formula.style.padding = '8px 12px';
    formula.style.border = '1px solid #334155';
    formula.style.borderRadius = '10px';
    formula.style.background = 'rgba(15, 23, 42, 0.95)';
    formula.style.fontFamily = 'monospace';
    formula.style.fontSize = '34px';
    formula.style.lineHeight = '1.1';
    formula.style.color = '#e2e8f0';
    formula.style.whiteSpace = 'nowrap';
    formula.style.boxSizing = 'border-box';
    const formulaPrefix = document.createElement('span');
    const formulaValue = document.createElement('span');
    formulaValue.style.color = '#4ade80';
    formulaValue.style.fontWeight = '700';
    formula.append(formulaPrefix, formulaValue);

    root.append(topbar, legend, formula);
    host.appendChild(root);

    return {
      root,
      topbar,
      stateValue: state.value,
      openingValue: opening.value,
      currentValue: current.value,
      dropValue: drop.value,
      terminalValue: terminal.value,
      legend,
      formula,
      formulaPrefix,
      formulaValue
    };
  }

  const legacyOverlay = createLegacyOverlay();

  function resizeCanvas(): void {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(480, Math.floor(rect.width || 1280));
    const cssHeight = Math.max(280, Math.floor(rect.height || 720));
    const dpr =
      typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    surface = computeHiDpiCanvasMetrics({
      cssWidth,
      cssHeight,
      devicePixelRatio: dpr
    });
    applyHiDpiCanvasMetrics(canvas, ctx, surface);
  }

  function draw(next: EmfAnalogySnapshot): void {
    if (!ctx) return;
    const isDark = theme === 'dark';
    const width = surface.cssWidth;
    const height = surface.cssHeight;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = isDark ? '#0b1220' : '#f1f5f9';
    ctx.fillRect(0, 0, width, height);

    const outerPad = Math.max(8, Math.min(width, height) * 0.012);
    const cardX = outerPad;
    const cardY = outerPad;
    const cardW = width - outerPad * 2;
    const cardH = height - outerPad * 2;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 12);
    ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = isDark ? '#334155' : '#dce5f2';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const headerX = cardX + 12;
    const headerY = cardY + 12;
    const headerW = cardW - 24;
    const headerH = legacyOverlay
      ? Math.max(92, Math.min(104, cardH * 0.17))
      : Math.max(72, Math.min(112, cardH * 0.19));

    const flowX = cardX + 8;
    const flowY = legacyOverlay ? headerY + headerH - 6 : headerY + headerH + 8;
    const flowW = cardW - 16;
    const flowH = cardH - (flowY - cardY) - (legacyOverlay ? 0 : 8);

    if (!legacyOverlay) {
      drawRoundedRect(ctx, headerX, headerY, headerW, headerH, 10);
      const headerGradient = ctx.createLinearGradient(
        headerX,
        headerY,
        headerX + headerW,
        headerY
      );
      if (isDark) {
        headerGradient.addColorStop(0, '#111b2d');
        headerGradient.addColorStop(1, '#0b1220');
      } else {
        headerGradient.addColorStop(0, '#f8fafc');
        headerGradient.addColorStop(1, '#eff6ff');
      }
      ctx.fillStyle = headerGradient;
      ctx.fill();
      ctx.strokeStyle = isDark ? '#334155' : '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.stroke();

      drawCards(
        ctx,
        headerX + 8,
        headerY + 8,
        headerW - 16,
        headerH - 16,
        next,
        theme
      );
    }

    const flowTheme: TeachingTheme =
      legacyFlowDark && theme === 'light' ? 'dark' : theme;

    impellerAngle = drawFlowArea(
      ctx,
      flowX,
      flowY,
      flowW,
      flowH,
      next,
      mode,
      flowTheme,
      particles,
      impellerAngle
    );

    if (legacyOverlay) {
      legacyOverlay.topbar.style.left = `${headerX}px`;
      legacyOverlay.topbar.style.top = `${headerY}px`;
      legacyOverlay.topbar.style.width = `${headerW}px`;
      legacyOverlay.topbar.style.height = `${headerH}px`;

      legacyOverlay.legend.style.left = `${flowX + 12}px`;
      legacyOverlay.legend.style.top = `${flowY + 12}px`;

      const formulaW = Math.min(420, flowW * 0.46);
      const formulaH = 46;
      const formulaX = flowX + (flowW - formulaW) * 0.5;
      const formulaY = flowY + flowH - formulaH - 12;
      legacyOverlay.formula.style.left = `${formulaX}px`;
      legacyOverlay.formula.style.top = `${formulaY}px`;
      legacyOverlay.formula.style.width = `${formulaW}px`;
      legacyOverlay.formula.style.height = `${formulaH}px`;
      legacyOverlay.formula.style.display = 'flex';
      legacyOverlay.formula.style.alignItems = 'center';
      legacyOverlay.formula.style.justifyContent = 'center';
      legacyOverlay.formula.style.fontSize = `${Math.max(24, Math.round(formulaH * 0.42))}px`;

      legacyOverlay.stateValue.textContent = next.state.isSystemOn
        ? '通路'
        : '断路';
      legacyOverlay.stateValue.style.color = next.state.isSystemOn
        ? '#1d4ed8'
        : '#334155';
      legacyOverlay.openingValue.textContent = `${Math.round(next.state.tapOpening * 100)}%`;
      legacyOverlay.openingValue.style.color = '#1f2937';
      legacyOverlay.currentValue.textContent = `${next.state.currentI.toFixed(2)} A`;
      legacyOverlay.currentValue.style.color = '#1d4ed8';
      legacyOverlay.dropValue.textContent = `${next.state.internalDrop.toFixed(2)} V`;
      legacyOverlay.dropValue.style.color = '#dc2626';
      legacyOverlay.terminalValue.textContent = `${next.state.terminalVoltage.toFixed(2)} V`;

      legacyOverlay.formulaPrefix.textContent = `U = E - Ir = 1.50 - ${next.state.internalDrop.toFixed(2)} = `;
      legacyOverlay.formulaValue.textContent = `${next.state.terminalVoltage.toFixed(2)} V`;
    } else {
      drawLegendAndFormula(ctx, flowX, flowY, flowW, flowH, next);
    }
  }

  let isRunning = false;

  const tick = () => {
    if (!isRunning) return;
    if (snapshot) {
      draw(snapshot);
    }
    if (typeof window !== 'undefined') {
      rafId = window.requestAnimationFrame(tick);
    }
  };

  return {
    render(next: EmfAnalogySnapshot): void {
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
    start() {
      if (isRunning) return;
      isRunning = true;
      tick();
    },
    stop() {
      isRunning = false;
      if (rafId !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    dispose(): void {
      isRunning = false;
      if (rafId !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(rafId);
      }
      legacyOverlay?.root.remove();
      snapshot = null;
      canvas = null;
      ctx = null;
    }
  };
}
