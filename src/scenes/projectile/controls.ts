import type { ProjectileParams, ResolvedProjectileParams } from './scene.sim';

type ProjectilePresetKey = 'earth' | 'moon' | 'mars' | 'crosswind';

const PRESETS: Record<ProjectilePresetKey, Required<Pick<ProjectileParams, 'speed' | 'angleDeg' | 'gravity' | 'initialHeight' | 'windAccel' | 'drag'>>> = {
  earth: { speed: 18, angleDeg: 45, gravity: 9.8, initialHeight: 0, windAccel: 0, drag: 0.02 },
  moon: { speed: 14, angleDeg: 50, gravity: 1.62, initialHeight: 0, windAccel: 0, drag: 0 },
  mars: { speed: 16, angleDeg: 45, gravity: 3.71, initialHeight: 0, windAccel: 0, drag: 0.01 },
  crosswind: { speed: 20, angleDeg: 42, gravity: 9.8, initialHeight: 1.5, windAccel: 4, drag: 0.04 }
};

export type ProjectileControlsOptions = {
  container: HTMLElement;
  initialParams: ResolvedProjectileParams;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStep: () => void;
  onApplyParams: (next: Partial<ProjectileParams>) => void;
  onStatus?: (text: string) => void;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatValue(role: string, value: number): string {
  if (role === 'speed') return `${value.toFixed(1)} m/s`;
  if (role === 'angle') return `${value.toFixed(1)} deg`;
  if (role === 'gravity') return `${value.toFixed(2)} m/s^2`;
  if (role === 'height') return `${value.toFixed(1)} m`;
  if (role === 'wind') return `${value.toFixed(1)} m/s^2`;
  if (role === 'drag') return value.toFixed(3);
  return value.toFixed(2);
}

export function createProjectileControls(options: ProjectileControlsOptions): { dispose(): void } {
  const panel = document.createElement('div');
  panel.className = 'legacy-field-controls projectile-control-panel';
  panel.innerHTML = `
    <div class="legacy-field-row">
      <span class="legacy-field-label">初速度 v0</span>
      <input type="range" min="0" max="80" step="0.5" data-role="speed">
      <span class="legacy-field-value" data-role="speed-value"></span>
    </div>
    <div class="legacy-field-row">
      <span class="legacy-field-label">发射角 θ</span>
      <input type="range" min="0" max="85" step="0.5" data-role="angle">
      <span class="legacy-field-value" data-role="angle-value"></span>
    </div>
    <div class="legacy-field-row">
      <span class="legacy-field-label">重力 g</span>
      <input type="range" min="0" max="30" step="0.1" data-role="gravity">
      <span class="legacy-field-value" data-role="gravity-value"></span>
    </div>
    <div class="legacy-field-row">
      <span class="legacy-field-label">初始高度 h0</span>
      <input type="range" min="0" max="20" step="0.1" data-role="height">
      <span class="legacy-field-value" data-role="height-value"></span>
    </div>
    <div class="legacy-field-row">
      <span class="legacy-field-label">水平风加速度</span>
      <input type="range" min="-12" max="12" step="0.1" data-role="wind">
      <span class="legacy-field-value" data-role="wind-value"></span>
    </div>
    <div class="legacy-field-row">
      <span class="legacy-field-label">阻力系数</span>
      <input type="range" min="0" max="0.2" step="0.005" data-role="drag">
      <span class="legacy-field-value" data-role="drag-value"></span>
    </div>

    <div class="legacy-field-scenes">
      <button type="button" class="legacy-scene-btn" data-role="preset-earth">地球</button>
      <button type="button" class="legacy-scene-btn" data-role="preset-moon">月球</button>
      <button type="button" class="legacy-scene-btn" data-role="preset-mars">火星</button>
      <button type="button" class="legacy-scene-btn" data-role="preset-crosswind">侧风课堂</button>
    </div>

    <div class="legacy-action-grid">
      <button type="button" class="legacy-reset-btn legacy-wide-btn" data-role="apply">应用并重置</button>
      <button type="button" class="legacy-reset-btn legacy-wide-btn" data-role="random">随机案例</button>
    </div>

    <div class="transport-controls">
      <button type="button" data-role="play">播放</button>
      <button type="button" data-role="pause">暂停</button>
      <button type="button" data-role="reset">重置</button>
      <button type="button" data-role="step">单步</button>
    </div>
  `;

  options.container.innerHTML = '';
  options.container.appendChild(panel);

  const speedInput = panel.querySelector('[data-role="speed"]');
  const angleInput = panel.querySelector('[data-role="angle"]');
  const gravityInput = panel.querySelector('[data-role="gravity"]');
  const heightInput = panel.querySelector('[data-role="height"]');
  const windInput = panel.querySelector('[data-role="wind"]');
  const dragInput = panel.querySelector('[data-role="drag"]');

  const speedValue = panel.querySelector('[data-role="speed-value"]');
  const angleValue = panel.querySelector('[data-role="angle-value"]');
  const gravityValue = panel.querySelector('[data-role="gravity-value"]');
  const heightValue = panel.querySelector('[data-role="height-value"]');
  const windValue = panel.querySelector('[data-role="wind-value"]');
  const dragValue = panel.querySelector('[data-role="drag-value"]');

  const playBtn = panel.querySelector('[data-role="play"]');
  const pauseBtn = panel.querySelector('[data-role="pause"]');
  const resetBtn = panel.querySelector('[data-role="reset"]');
  const stepBtn = panel.querySelector('[data-role="step"]');
  const applyBtn = panel.querySelector('[data-role="apply"]');
  const randomBtn = panel.querySelector('[data-role="random"]');

  const presetEarth = panel.querySelector('[data-role="preset-earth"]');
  const presetMoon = panel.querySelector('[data-role="preset-moon"]');
  const presetMars = panel.querySelector('[data-role="preset-mars"]');
  const presetCrosswind = panel.querySelector('[data-role="preset-crosswind"]');

  if (
    !(speedInput instanceof HTMLInputElement) ||
    !(angleInput instanceof HTMLInputElement) ||
    !(gravityInput instanceof HTMLInputElement) ||
    !(heightInput instanceof HTMLInputElement) ||
    !(windInput instanceof HTMLInputElement) ||
    !(dragInput instanceof HTMLInputElement) ||
    !(speedValue instanceof HTMLElement) ||
    !(angleValue instanceof HTMLElement) ||
    !(gravityValue instanceof HTMLElement) ||
    !(heightValue instanceof HTMLElement) ||
    !(windValue instanceof HTMLElement) ||
    !(dragValue instanceof HTMLElement) ||
    !(playBtn instanceof HTMLButtonElement) ||
    !(pauseBtn instanceof HTMLButtonElement) ||
    !(resetBtn instanceof HTMLButtonElement) ||
    !(stepBtn instanceof HTMLButtonElement) ||
    !(applyBtn instanceof HTMLButtonElement) ||
    !(randomBtn instanceof HTMLButtonElement) ||
    !(presetEarth instanceof HTMLButtonElement) ||
    !(presetMoon instanceof HTMLButtonElement) ||
    !(presetMars instanceof HTMLButtonElement) ||
    !(presetCrosswind instanceof HTMLButtonElement)
  ) {
    throw new Error('Failed to mount projectile controls');
  }

  const valueMap = new Map<string, HTMLElement>([
    ['speed', speedValue],
    ['angle', angleValue],
    ['gravity', gravityValue],
    ['height', heightValue],
    ['wind', windValue],
    ['drag', dragValue]
  ]);

  const inputMap = new Map<string, HTMLInputElement>([
    ['speed', speedInput],
    ['angle', angleInput],
    ['gravity', gravityInput],
    ['height', heightInput],
    ['wind', windInput],
    ['drag', dragInput]
  ]);

  function setInputValue(role: string, value: number): void {
    const input = inputMap.get(role);
    if (!input) return;
    input.value = String(value);
  }

  function updateValueLabels(): void {
    for (const [role, input] of inputMap.entries()) {
      const target = valueMap.get(role);
      if (!target) continue;
      target.textContent = formatValue(role, Number(input.value));
    }
  }

  function readParams(): Required<Pick<ProjectileParams, 'speed' | 'angleDeg' | 'gravity' | 'initialHeight' | 'windAccel' | 'drag'>> {
    return {
      speed: clamp(Number(speedInput.value), 0, 80),
      angleDeg: clamp(Number(angleInput.value), 0, 85),
      gravity: clamp(Number(gravityInput.value), 0, 30),
      initialHeight: clamp(Number(heightInput.value), 0, 20),
      windAccel: clamp(Number(windInput.value), -12, 12),
      drag: clamp(Number(dragInput.value), 0, 0.2)
    };
  }

  function applyCurrentParams(status = '已应用抛体参数并重置'): void {
    const next = readParams();
    options.onApplyParams(next);
    options.onStatus?.(status);
    updateValueLabels();
  }

  function setPreset(key: ProjectilePresetKey): void {
    const preset = PRESETS[key];
    setInputValue('speed', preset.speed);
    setInputValue('angle', preset.angleDeg);
    setInputValue('gravity', preset.gravity);
    setInputValue('height', preset.initialHeight);
    setInputValue('wind', preset.windAccel);
    setInputValue('drag', preset.drag);
    applyCurrentParams(`已切换预设：${key === 'crosswind' ? '侧风课堂' : key === 'earth' ? '地球' : key === 'moon' ? '月球' : '火星'}`);
  }

  function applyRandomPreset(): void {
    setInputValue('speed', Math.round((8 + Math.random() * 42) * 10) / 10);
    setInputValue('angle', Math.round((15 + Math.random() * 60) * 10) / 10);
    setInputValue('gravity', Math.round((1 + Math.random() * 18) * 10) / 10);
    setInputValue('height', Math.round(Math.random() * 8 * 10) / 10);
    setInputValue('wind', Math.round((-8 + Math.random() * 16) * 10) / 10);
    setInputValue('drag', Math.round(Math.random() * 120) / 1000);
    applyCurrentParams('已生成随机抛体案例');
  }

  setInputValue('speed', options.initialParams.speed);
  setInputValue('angle', options.initialParams.angleDeg);
  setInputValue('gravity', options.initialParams.gravity);
  setInputValue('height', options.initialParams.initialHeight);
  setInputValue('wind', options.initialParams.windAccel);
  setInputValue('drag', options.initialParams.drag);
  updateValueLabels();

  const onAnyInput = () => updateValueLabels();
  const onPlay = () => options.onPlay();
  const onPause = () => options.onPause();
  const onReset = () => options.onReset();
  const onStep = () => options.onStep();
  const onApply = () => applyCurrentParams();
  const onRandom = () => applyRandomPreset();
  const onPresetEarth = () => setPreset('earth');
  const onPresetMoon = () => setPreset('moon');
  const onPresetMars = () => setPreset('mars');
  const onPresetCrosswind = () => setPreset('crosswind');

  for (const input of inputMap.values()) {
    input.addEventListener('input', onAnyInput);
  }
  playBtn.addEventListener('click', onPlay);
  pauseBtn.addEventListener('click', onPause);
  resetBtn.addEventListener('click', onReset);
  stepBtn.addEventListener('click', onStep);
  applyBtn.addEventListener('click', onApply);
  randomBtn.addEventListener('click', onRandom);
  presetEarth.addEventListener('click', onPresetEarth);
  presetMoon.addEventListener('click', onPresetMoon);
  presetMars.addEventListener('click', onPresetMars);
  presetCrosswind.addEventListener('click', onPresetCrosswind);

  return {
    dispose(): void {
      for (const input of inputMap.values()) {
        input.removeEventListener('input', onAnyInput);
      }
      playBtn.removeEventListener('click', onPlay);
      pauseBtn.removeEventListener('click', onPause);
      resetBtn.removeEventListener('click', onReset);
      stepBtn.removeEventListener('click', onStep);
      applyBtn.removeEventListener('click', onApply);
      randomBtn.removeEventListener('click', onRandom);
      presetEarth.removeEventListener('click', onPresetEarth);
      presetMoon.removeEventListener('click', onPresetMoon);
      presetMars.removeEventListener('click', onPresetMars);
      presetCrosswind.removeEventListener('click', onPresetCrosswind);
    }
  };
}
