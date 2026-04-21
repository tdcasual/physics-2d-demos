import type { EmfAnalogySnapshot } from '../scene.sim';

export type LegacyOverlay = {
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

export function createLegacyOverlay(
  canvas: HTMLCanvasElement | null,
  legacyFlowDark: boolean
): LegacyOverlay | null {
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
  const titleDiv = document.createElement('div');
  titleDiv.style.cssText =
    'font-size:14px; color:#64748b; font-weight:600; line-height:1.2; margin-bottom:6px;';
  titleDiv.textContent = '颜色代表水压 (电势)';
  const barDiv = document.createElement('div');
  barDiv.style.cssText =
    'height:8px; border-radius:999px; background: linear-gradient(90deg, #2563eb, #dbeafe);';
  const labelsDiv = document.createElement('div');
  labelsDiv.style.cssText =
    'display:flex; justify-content:space-between; margin-top:4px; font-size:13px; color:#94a3b8;';
  const highSpan = document.createElement('span');
  highSpan.textContent = '高';
  const lowSpan = document.createElement('span');
  lowSpan.textContent = '低';
  labelsDiv.append(highSpan, lowSpan);
  legend.append(titleDiv, barDiv, labelsDiv);

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

export function updateLegacyOverlay(
  overlay: LegacyOverlay,
  next: EmfAnalogySnapshot,
  headerX: number,
  headerY: number,
  headerW: number,
  headerH: number,
  flowX: number,
  flowY: number,
  flowW: number,
  flowH: number
): void {
  overlay.topbar.style.left = `${headerX}px`;
  overlay.topbar.style.top = `${headerY}px`;
  overlay.topbar.style.width = `${headerW}px`;
  overlay.topbar.style.height = `${headerH}px`;

  overlay.legend.style.left = `${flowX + 12}px`;
  overlay.legend.style.top = `${flowY + 12}px`;

  const formulaW = Math.min(420, flowW * 0.46);
  const formulaH = 46;
  const formulaX = flowX + (flowW - formulaW) * 0.5;
  const formulaY = flowY + flowH - formulaH - 12;
  overlay.formula.style.left = `${formulaX}px`;
  overlay.formula.style.top = `${formulaY}px`;
  overlay.formula.style.width = `${formulaW}px`;
  overlay.formula.style.height = `${formulaH}px`;
  overlay.formula.style.display = 'flex';
  overlay.formula.style.alignItems = 'center';
  overlay.formula.style.justifyContent = 'center';
  overlay.formula.style.fontSize = `${Math.max(24, Math.round(formulaH * 0.42))}px`;

  overlay.stateValue.textContent = next.state.isSystemOn ? '通路' : '断路';
  overlay.stateValue.style.color = next.state.isSystemOn
    ? '#1d4ed8'
    : '#334155';
  overlay.openingValue.textContent = `${Math.round(next.state.tapOpening * 100)}%`;
  overlay.openingValue.style.color = '#1f2937';
  overlay.currentValue.textContent = `${next.state.currentI.toFixed(2)} A`;
  overlay.currentValue.style.color = '#1d4ed8';
  overlay.dropValue.textContent = `${next.state.internalDrop.toFixed(2)} V`;
  overlay.dropValue.style.color = '#dc2626';
  overlay.terminalValue.textContent = `${next.state.terminalVoltage.toFixed(2)} V`;

  overlay.formulaPrefix.textContent = `U = E - Ir = 1.50 - ${next.state.internalDrop.toFixed(2)} = `;
  overlay.formulaValue.textContent = `${next.state.terminalVoltage.toFixed(2)} V`;
}
