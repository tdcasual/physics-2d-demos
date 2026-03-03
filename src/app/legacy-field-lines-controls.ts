export type FieldLinesScene = 'single' | 'like' | 'unlike' | 'custom';

export type CreateLegacyFieldLinesControlsOptions = {
  container: HTMLElement;
  onCommand: (command: string, payload?: unknown) => void;
  onStatus?: (text: string) => void;
};

type ControlState = {
  scene: FieldLinesScene;
  density: number;
  q1: number;
  q2: number;
};

function clampDensity(value: number): number {
  return Math.min(100, Math.max(1, Math.round(value)));
}

function clampCharge(value: number): number {
  const rounded = Math.round(value * 2) / 2;
  return Math.min(5, Math.max(-5, rounded));
}

function formatChargeValue(value: number): string {
  if (value > 0) return `+${value.toFixed(1)}`;
  if (value < 0) return value.toFixed(1);
  return '0.0';
}

export function createLegacyFieldLinesControls(options: CreateLegacyFieldLinesControlsOptions) {
  const state: ControlState = {
    scene: 'single',
    density: 10,
    q1: 1,
    q2: -1
  };

  options.container.innerHTML = `
    <div class="legacy-field-controls">
      <div class="legacy-field-scenes" data-role="scene-group">
        <button type="button" class="legacy-scene-btn" data-scene="single">单个电荷</button>
        <button type="button" class="legacy-scene-btn" data-scene="like">同种电荷</button>
        <button type="button" class="legacy-scene-btn" data-scene="unlike">异种电荷</button>
        <button type="button" class="legacy-scene-btn" data-scene="custom">自定义双电荷</button>
      </div>
      <div class="legacy-field-row">
        <span class="legacy-field-label">密度</span>
        <input type="range" min="1" max="100" step="1" value="10" data-role="density-slider">
        <span class="legacy-field-value" data-role="density-value">10</span>
      </div>
      <div class="legacy-custom-wrap is-hidden" data-role="custom-wrap">
        <label class="legacy-field-row legacy-charge-row">
          <span class="legacy-field-label">电荷1</span>
          <input type="range" min="-5" max="5" step="0.5" value="1" data-role="q1-slider">
          <span class="legacy-field-value" data-role="q1-value">+1.0</span>
        </label>
        <label class="legacy-field-row legacy-charge-row">
          <span class="legacy-field-label">电荷2</span>
          <input type="range" min="-5" max="5" step="0.5" value="-1" data-role="q2-slider">
          <span class="legacy-field-value" data-role="q2-value">-1.0</span>
        </label>
      </div>
      <button type="button" class="legacy-reset-btn" data-role="reset">重置场景</button>
    </div>
  `;

  const sceneGroup = options.container.querySelector('[data-role="scene-group"]');
  const densitySlider = options.container.querySelector('[data-role="density-slider"]');
  const densityValue = options.container.querySelector('[data-role="density-value"]');
  const customWrap = options.container.querySelector('[data-role="custom-wrap"]');
  const q1Slider = options.container.querySelector('[data-role="q1-slider"]');
  const q2Slider = options.container.querySelector('[data-role="q2-slider"]');
  const q1Value = options.container.querySelector('[data-role="q1-value"]');
  const q2Value = options.container.querySelector('[data-role="q2-value"]');
  const resetButton = options.container.querySelector('[data-role="reset"]');

  if (
    !(sceneGroup instanceof HTMLElement) ||
    !(densitySlider instanceof HTMLInputElement) ||
    !(densityValue instanceof HTMLElement) ||
    !(customWrap instanceof HTMLElement) ||
    !(q1Slider instanceof HTMLInputElement) ||
    !(q2Slider instanceof HTMLInputElement) ||
    !(q1Value instanceof HTMLElement) ||
    !(q2Value instanceof HTMLElement) ||
    !(resetButton instanceof HTMLButtonElement)
  ) {
    throw new Error('Failed to mount field-lines controls');
  }

  const sceneButtons = Array.from(sceneGroup.querySelectorAll('.legacy-scene-btn')).filter(
    (node): node is HTMLButtonElement => node instanceof HTMLButtonElement
  );

  function markSceneActive(scene: FieldLinesScene): void {
    for (const button of sceneButtons) {
      const buttonScene = button.dataset.scene as FieldLinesScene | undefined;
      const active = buttonScene === scene;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    customWrap.classList.toggle('is-hidden', scene !== 'custom');
  }

  function syncDensityLabel(): void {
    densityValue.textContent = String(state.density);
  }

  function syncChargeLabels(): void {
    q1Value.textContent = formatChargeValue(state.q1);
    q2Value.textContent = formatChargeValue(state.q2);
  }

  function pushScene(): void {
    options.onCommand('set-scene', { scene: state.scene });
  }

  function pushDensity(): void {
    options.onCommand('set-density', { density: state.density });
  }

  function pushCustomCharges(): void {
    options.onCommand('set-custom-charges', { q1: state.q1, q2: state.q2 });
  }

  const onSceneClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const scene = target.dataset.scene as FieldLinesScene | undefined;
    if (!scene) return;
    state.scene = scene;
    markSceneActive(state.scene);
    pushScene();
    if (state.scene === 'custom') {
      pushCustomCharges();
    }
    options.onStatus?.(`已切换场景：${target.textContent ?? scene}`);
  };

  const onDensityInput = () => {
    state.density = clampDensity(Number(densitySlider.value));
    densitySlider.value = String(state.density);
    syncDensityLabel();
    pushDensity();
  };

  const onChargeInput = () => {
    state.q1 = clampCharge(Number(q1Slider.value));
    state.q2 = clampCharge(Number(q2Slider.value));
    q1Slider.value = String(state.q1);
    q2Slider.value = String(state.q2);
    syncChargeLabels();
    pushCustomCharges();
  };

  const onResetClick = () => {
    state.scene = 'single';
    state.density = 10;
    state.q1 = 1;
    state.q2 = -1;
    densitySlider.value = String(state.density);
    q1Slider.value = String(state.q1);
    q2Slider.value = String(state.q2);
    markSceneActive(state.scene);
    syncDensityLabel();
    syncChargeLabels();
    options.onCommand('reset');
    options.onStatus?.('已重置场景与参数');
  };

  sceneGroup.addEventListener('click', onSceneClick);
  densitySlider.addEventListener('input', onDensityInput);
  q1Slider.addEventListener('input', onChargeInput);
  q2Slider.addEventListener('input', onChargeInput);
  resetButton.addEventListener('click', onResetClick);

  markSceneActive(state.scene);
  syncDensityLabel();
  syncChargeLabels();

  return {
    dispose(): void {
      sceneGroup.removeEventListener('click', onSceneClick);
      densitySlider.removeEventListener('input', onDensityInput);
      q1Slider.removeEventListener('input', onChargeInput);
      q2Slider.removeEventListener('input', onChargeInput);
      resetButton.removeEventListener('click', onResetClick);
      options.container.innerHTML = '';
    }
  };
}
