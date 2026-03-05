export type EmfAnalogyControlsOptions = {
  container: HTMLElement;
  onSetSystemOn: (on: boolean) => void;
  onSetTapOpening: (opening: number) => void;
  onReset: () => void;
  onStatus?: (text: string) => void;
};

type EmfControlState = {
  isSystemOn: boolean;
  opening: number;
};

function clampOpening(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function formatOpening(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function createEmfAnalogyControls(options: EmfAnalogyControlsOptions) {
  const state: EmfControlState = {
    isSystemOn: false,
    opening: 0.5
  };

  options.container.innerHTML = `
    <div class="scene-control-panel">
      <div class="scene-control-row">
        <span class="scene-control-label">系统开关</span>
        <button type="button" class="scene-chip-btn" data-role="system-toggle">已关闭</button>
      </div>
      <label class="scene-control-row">
        <span class="scene-control-label">水龙头开度</span>
        <input type="range" min="0" max="1" step="0.01" value="${state.opening}" data-role="opening-slider">
        <span class="scene-control-value" data-role="opening-value">${formatOpening(state.opening)}</span>
      </label>
      <button type="button" class="scene-reset-btn" data-role="reset">重置场景</button>
    </div>
  `;

  const toggleButton = options.container.querySelector('[data-role="system-toggle"]');
  const openingSlider = options.container.querySelector('[data-role="opening-slider"]');
  const openingValue = options.container.querySelector('[data-role="opening-value"]');
  const resetButton = options.container.querySelector('[data-role="reset"]');

  if (
    !(toggleButton instanceof HTMLButtonElement) ||
    !(openingSlider instanceof HTMLInputElement) ||
    !(openingValue instanceof HTMLElement) ||
    !(resetButton instanceof HTMLButtonElement)
  ) {
    throw new Error('Failed to mount emf-analogy controls');
  }

  const toggleControl: HTMLButtonElement = toggleButton;
  const openingControl: HTMLInputElement = openingSlider;
  const openingValueLabel: HTMLElement = openingValue;
  const resetControl: HTMLButtonElement = resetButton;

  function syncToggleButton(): void {
    toggleControl.textContent = state.isSystemOn ? '已打开' : '已关闭';
    toggleControl.setAttribute('aria-pressed', String(state.isSystemOn));
  }

  function syncOpeningValue(): void {
    openingValueLabel.textContent = formatOpening(state.opening);
  }

  const onToggleClick = () => {
    state.isSystemOn = !state.isSystemOn;
    syncToggleButton();
    options.onSetSystemOn(state.isSystemOn);
    options.onStatus?.(state.isSystemOn ? '已打开通路' : '已关闭通路');
  };

  const onOpeningInput = () => {
    state.opening = clampOpening(Number(openingControl.value));
    openingControl.value = String(state.opening);
    syncOpeningValue();
    if (state.opening > 0 && !state.isSystemOn) {
      state.isSystemOn = true;
      syncToggleButton();
      options.onSetSystemOn(true);
    }
    options.onSetTapOpening(state.opening);
  };

  const onResetClick = () => {
    state.isSystemOn = false;
    state.opening = 0.5;
    openingControl.value = String(state.opening);
    syncToggleButton();
    syncOpeningValue();
    options.onReset();
    options.onStatus?.('已重置场景');
  };

  toggleControl.addEventListener('click', onToggleClick);
  openingControl.addEventListener('input', onOpeningInput);
  resetControl.addEventListener('click', onResetClick);

  syncToggleButton();
  syncOpeningValue();

  return {
    dispose(): void {
      toggleControl.removeEventListener('click', onToggleClick);
      openingControl.removeEventListener('input', onOpeningInput);
      resetControl.removeEventListener('click', onResetClick);
      options.container.innerHTML = '';
    }
  };
}
