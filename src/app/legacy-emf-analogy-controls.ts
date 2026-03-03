export type CreateLegacyEmfAnalogyControlsOptions = {
  container: HTMLElement;
  onCommand: (command: string, payload?: unknown) => void;
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

export function createLegacyEmfAnalogyControls(options: CreateLegacyEmfAnalogyControlsOptions) {
  const state: EmfControlState = {
    isSystemOn: false,
    opening: 0.5
  };

  options.container.innerHTML = `
    <div class="legacy-field-controls">
      <div class="legacy-field-row">
        <span class="legacy-field-label">系统开关</span>
        <button type="button" class="legacy-chip-btn" data-role="system-toggle">已关闭</button>
      </div>
      <label class="legacy-field-row">
        <span class="legacy-field-label">水龙头开度</span>
        <input type="range" min="0" max="1" step="0.01" value="${state.opening}" data-role="opening-slider">
        <span class="legacy-field-value" data-role="opening-value">${formatOpening(state.opening)}</span>
      </label>
      <button type="button" class="legacy-reset-btn" data-role="reset">重置场景</button>
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

  function syncToggleButton(): void {
    toggleButton.textContent = state.isSystemOn ? '已打开' : '已关闭';
    toggleButton.setAttribute('aria-pressed', String(state.isSystemOn));
  }

  function syncOpeningValue(): void {
    openingValue.textContent = formatOpening(state.opening);
  }

  function pushSystemState(): void {
    options.onCommand('set-system-on', { on: state.isSystemOn });
  }

  function pushOpening(): void {
    options.onCommand('set-tap-opening', { opening: state.opening });
  }

  const onToggleClick = () => {
    state.isSystemOn = !state.isSystemOn;
    syncToggleButton();
    pushSystemState();
    options.onStatus?.(state.isSystemOn ? '已打开通路' : '已关闭通路');
  };

  const onOpeningInput = () => {
    state.opening = clampOpening(Number(openingSlider.value));
    openingSlider.value = String(state.opening);
    syncOpeningValue();
    if (state.opening > 0 && !state.isSystemOn) {
      state.isSystemOn = true;
      syncToggleButton();
      pushSystemState();
    }
    pushOpening();
  };

  const onResetClick = () => {
    state.isSystemOn = false;
    state.opening = 0.5;
    openingSlider.value = String(state.opening);
    syncToggleButton();
    syncOpeningValue();
    options.onCommand('reset');
    options.onStatus?.('已重置场景');
  };

  toggleButton.addEventListener('click', onToggleClick);
  openingSlider.addEventListener('input', onOpeningInput);
  resetButton.addEventListener('click', onResetClick);

  syncToggleButton();
  syncOpeningValue();

  return {
    dispose(): void {
      toggleButton.removeEventListener('click', onToggleClick);
      openingSlider.removeEventListener('input', onOpeningInput);
      resetButton.removeEventListener('click', onResetClick);
      options.container.innerHTML = '';
    }
  };
}
