import type { Legacy2DControlAction } from './legacy-2d-adapter';

export type CreateLegacyChaseMeetControlsOptions = {
  container: HTMLElement;
  onControl: (action: Legacy2DControlAction) => void;
  onCommand: (command: string, payload?: unknown) => void;
  onStatus?: (text: string) => void;
};

type ChaseState = {
  theme: 'dark' | 'light';
  totalTime: number;
  dt: number;
  x0A: number;
  x0B: number;
  vExprA: string;
  vExprB: string;
};

function clampTotalTime(value: number): number {
  return Math.max(1, Math.min(120, value));
}

function clampDt(value: number): number {
  return Math.max(0.005, Math.min(1, value));
}

export function createLegacyChaseMeetControls(options: CreateLegacyChaseMeetControlsOptions) {
  const state: ChaseState = {
    theme: 'dark',
    totalTime: 10,
    dt: 0.02,
    x0A: 0,
    x0B: 10,
    vExprA: '2',
    vExprB: '0.5'
  };

  options.container.innerHTML = `
    <div class="legacy-field-controls">
      <div class="legacy-field-row">
        <span class="legacy-field-label">主题</span>
        <button type="button" class="legacy-chip-btn" data-role="theme-toggle">夜间</button>
      </div>
      <div class="legacy-form-grid">
        <label class="legacy-form-row">
          <span class="legacy-field-label">总时间 T</span>
          <input type="number" min="1" max="120" step="0.5" value="${state.totalTime}" data-role="total-time">
        </label>
        <label class="legacy-form-row">
          <span class="legacy-field-label">步长 Δt</span>
          <input type="number" min="0.005" max="1" step="0.005" value="${state.dt}" data-role="dt">
        </label>
        <label class="legacy-form-row">
          <span class="legacy-field-label">x₀A</span>
          <input type="number" step="0.5" value="${state.x0A}" data-role="x0a">
        </label>
        <label class="legacy-form-row">
          <span class="legacy-field-label">x₀B</span>
          <input type="number" step="0.5" value="${state.x0B}" data-role="x0b">
        </label>
        <label class="legacy-form-row">
          <span class="legacy-field-label">vA(t)</span>
          <input type="text" value="${state.vExprA}" data-role="vexpr-a">
        </label>
        <label class="legacy-form-row">
          <span class="legacy-field-label">vB(t)</span>
          <input type="text" value="${state.vExprB}" data-role="vexpr-b">
        </label>
      </div>
      <button type="button" class="legacy-chip-btn legacy-wide-btn" data-role="apply-settings">应用参数</button>
      <div class="legacy-transport-grid">
        <button type="button" class="legacy-scene-btn" data-role="play">播放</button>
        <button type="button" class="legacy-scene-btn" data-role="pause">暂停</button>
        <button type="button" class="legacy-scene-btn" data-role="step">单步</button>
        <button type="button" class="legacy-reset-btn" data-role="reset">重置</button>
      </div>
    </div>
  `;

  const themeToggle = options.container.querySelector('[data-role="theme-toggle"]');
  const totalTimeInput = options.container.querySelector('[data-role="total-time"]');
  const dtInput = options.container.querySelector('[data-role="dt"]');
  const x0aInput = options.container.querySelector('[data-role="x0a"]');
  const x0bInput = options.container.querySelector('[data-role="x0b"]');
  const vExprAInput = options.container.querySelector('[data-role="vexpr-a"]');
  const vExprBInput = options.container.querySelector('[data-role="vexpr-b"]');
  const applySettingsButton = options.container.querySelector('[data-role="apply-settings"]');
  const playButton = options.container.querySelector('[data-role="play"]');
  const pauseButton = options.container.querySelector('[data-role="pause"]');
  const stepButton = options.container.querySelector('[data-role="step"]');
  const resetButton = options.container.querySelector('[data-role="reset"]');

  if (
    !(themeToggle instanceof HTMLButtonElement) ||
    !(totalTimeInput instanceof HTMLInputElement) ||
    !(dtInput instanceof HTMLInputElement) ||
    !(x0aInput instanceof HTMLInputElement) ||
    !(x0bInput instanceof HTMLInputElement) ||
    !(vExprAInput instanceof HTMLInputElement) ||
    !(vExprBInput instanceof HTMLInputElement) ||
    !(applySettingsButton instanceof HTMLButtonElement) ||
    !(playButton instanceof HTMLButtonElement) ||
    !(pauseButton instanceof HTMLButtonElement) ||
    !(stepButton instanceof HTMLButtonElement) ||
    !(resetButton instanceof HTMLButtonElement)
  ) {
    throw new Error('Failed to mount chase-meet controls');
  }

  function syncThemeButton(): void {
    themeToggle.textContent = state.theme === 'dark' ? '夜间' : '白天';
    themeToggle.setAttribute('aria-pressed', String(state.theme === 'light'));
  }

  function readStateFromInputs(): void {
    state.totalTime = clampTotalTime(Number(totalTimeInput.value));
    state.dt = clampDt(Number(dtInput.value));
    state.x0A = Number.isFinite(Number(x0aInput.value)) ? Number(x0aInput.value) : 0;
    state.x0B = Number.isFinite(Number(x0bInput.value)) ? Number(x0bInput.value) : 10;
    state.vExprA = vExprAInput.value.trim() || '0';
    state.vExprB = vExprBInput.value.trim() || '0';

    totalTimeInput.value = String(state.totalTime);
    dtInput.value = String(state.dt);
    x0aInput.value = String(state.x0A);
    x0bInput.value = String(state.x0B);
    vExprAInput.value = state.vExprA;
    vExprBInput.value = state.vExprB;
  }

  function pushSettings(): void {
    options.onCommand('set-settings', {
      totalTime: state.totalTime,
      dt: state.dt,
      x0A: state.x0A,
      x0B: state.x0B,
      vExprA: state.vExprA,
      vExprB: state.vExprB
    });
  }

  const onThemeClick = () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    syncThemeButton();
    options.onCommand('set-theme', { theme: state.theme });
    options.onStatus?.(state.theme === 'dark' ? '已切换到夜间主题' : '已切换到白天主题');
  };

  const onApplySettingsClick = () => {
    readStateFromInputs();
    pushSettings();
    options.onStatus?.('已应用追及相遇参数');
  };

  const onPlayClick = () => {
    options.onControl('play');
    options.onStatus?.('动画已开始');
  };

  const onPauseClick = () => {
    options.onControl('pause');
    options.onStatus?.('动画已暂停');
  };

  const onStepClick = () => {
    options.onControl('step');
    options.onStatus?.('已单步推进');
  };

  const onResetClick = () => {
    options.onControl('reset');
    options.onStatus?.('动画已重置');
  };

  themeToggle.addEventListener('click', onThemeClick);
  applySettingsButton.addEventListener('click', onApplySettingsClick);
  playButton.addEventListener('click', onPlayClick);
  pauseButton.addEventListener('click', onPauseClick);
  stepButton.addEventListener('click', onStepClick);
  resetButton.addEventListener('click', onResetClick);

  syncThemeButton();

  return {
    dispose(): void {
      themeToggle.removeEventListener('click', onThemeClick);
      applySettingsButton.removeEventListener('click', onApplySettingsClick);
      playButton.removeEventListener('click', onPlayClick);
      pauseButton.removeEventListener('click', onPauseClick);
      stepButton.removeEventListener('click', onStepClick);
      resetButton.removeEventListener('click', onResetClick);
      options.container.innerHTML = '';
    }
  };
}
