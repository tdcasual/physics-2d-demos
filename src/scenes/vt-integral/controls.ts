import type { VtMethod, VtScene } from './scene.sim';

export type VtIntegralControlsOptions = {
  container: HTMLElement;
  onSetScene: (scene: VtScene) => void;
  onSetRects: (value: number) => void;
  onSetTime: (value: number) => void;
  onSetMethod: (value: VtMethod) => void;
  onSetCurveAmplitude: (value: number) => void;
  onSetCircleN: (value: number) => void;
  onSetSurfaceN: (value: number) => void;
  onSetDivision: (value: number) => void;
  onReset: () => void;
  onStatus?: (text: string) => void;
};

function clampRects(value: number): number {
  return Math.min(40, Math.max(2, Math.round(value)));
}

function clampTime(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value * 2) / 2));
}

function clampCurveAmplitude(value: number): number {
  return Math.min(0.45, Math.max(0.05, Math.round(value * 100) / 100));
}

function clampCircleN(value: number): number {
  return Math.min(200, Math.max(3, Math.round(value)));
}

function clampSurfaceN(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value)));
}

function clampDivision(value: number): number {
  return Math.min(100, Math.max(16, Math.round(value)));
}

export function createVtIntegralControls(options: VtIntegralControlsOptions) {
  const state = {
    scene: 'scene1' as VtScene,
    rects: 10,
    time: 5,
    method: 'mid' as VtMethod,
    curveAmplitude: 0.25,
    circleN: 8,
    surfaceN: 1,
    division: 16
  };

  options.container.innerHTML = `
    <div class="legacy-field-controls">
      <div class="legacy-field-scenes" data-role="scene-group">
        <button type="button" class="legacy-scene-btn" data-scene="scene1">场景一</button>
        <button type="button" class="legacy-scene-btn" data-scene="scene2">场景二</button>
        <button type="button" class="legacy-scene-btn" data-scene="scene3">场景三</button>
        <button type="button" class="legacy-scene-btn" data-scene="scene4">场景四</button>
        <button type="button" class="legacy-scene-btn" data-scene="scene5">场景五</button>
      </div>

      <div class="legacy-custom-wrap" data-role="scene1-panel">
        <label class="legacy-field-row">
          <span class="legacy-field-label">矩形数 n</span>
          <input type="range" min="2" max="40" step="1" value="${state.rects}" data-role="rects-slider">
          <span class="legacy-field-value" data-role="rects-value">${state.rects}</span>
        </label>
        <label class="legacy-field-row">
          <span class="legacy-field-label">时间 T</span>
          <input type="range" min="1" max="10" step="0.5" value="${state.time}" data-role="time-slider">
          <span class="legacy-field-value" data-role="time-value">${state.time.toFixed(1)}</span>
        </label>
        <label class="legacy-form-row">
          <span class="legacy-field-label">方法</span>
          <select data-role="method-select">
            <option value="left">左端</option>
            <option value="mid" selected>中点</option>
            <option value="right">右端</option>
            <option value="trap">梯形</option>
          </select>
        </label>
      </div>

      <div class="legacy-custom-wrap is-hidden" data-role="scene2-panel">
        <label class="legacy-field-row">
          <span class="legacy-field-label">曲线振幅 A</span>
          <input type="range" min="0.05" max="0.45" step="0.01" value="${state.curveAmplitude}" data-role="curve-amp-slider">
          <span class="legacy-field-value" data-role="curve-amp-value">${state.curveAmplitude.toFixed(2)}</span>
        </label>
      </div>

      <div class="legacy-custom-wrap is-hidden" data-role="scene3-panel">
        <label class="legacy-field-row">
          <span class="legacy-field-label">多边形 n</span>
          <input type="range" min="3" max="200" step="1" value="${state.circleN}" data-role="circle-slider">
          <span class="legacy-field-value" data-role="circle-value">${state.circleN}</span>
        </label>
      </div>

      <div class="legacy-custom-wrap is-hidden" data-role="scene4-panel">
        <label class="legacy-field-row">
          <span class="legacy-field-label">四棱锥 n</span>
          <input type="range" min="1" max="10" step="1" value="${state.surfaceN}" data-role="surface-slider">
          <span class="legacy-field-value" data-role="surface-value">${state.surfaceN}</span>
        </label>
      </div>

      <div class="legacy-custom-wrap is-hidden" data-role="scene5-panel">
        <label class="legacy-field-row">
          <span class="legacy-field-label">细分等级</span>
          <input type="range" min="16" max="100" step="1" value="${state.division}" data-role="division-slider">
          <span class="legacy-field-value" data-role="division-value">${state.division}</span>
        </label>
      </div>

      <button type="button" class="legacy-reset-btn" data-role="reset">重置场景</button>
    </div>
  `;

  const sceneGroup = options.container.querySelector('[data-role="scene-group"]');
  const scene1Panel = options.container.querySelector('[data-role="scene1-panel"]');
  const scene2Panel = options.container.querySelector('[data-role="scene2-panel"]');
  const scene3Panel = options.container.querySelector('[data-role="scene3-panel"]');
  const scene4Panel = options.container.querySelector('[data-role="scene4-panel"]');
  const scene5Panel = options.container.querySelector('[data-role="scene5-panel"]');
  const rectsSlider = options.container.querySelector('[data-role="rects-slider"]');
  const rectsValue = options.container.querySelector('[data-role="rects-value"]');
  const timeSlider = options.container.querySelector('[data-role="time-slider"]');
  const timeValue = options.container.querySelector('[data-role="time-value"]');
  const methodSelect = options.container.querySelector('[data-role="method-select"]');
  const curveAmpSlider = options.container.querySelector('[data-role="curve-amp-slider"]');
  const curveAmpValue = options.container.querySelector('[data-role="curve-amp-value"]');
  const circleSlider = options.container.querySelector('[data-role="circle-slider"]');
  const circleValue = options.container.querySelector('[data-role="circle-value"]');
  const surfaceSlider = options.container.querySelector('[data-role="surface-slider"]');
  const surfaceValue = options.container.querySelector('[data-role="surface-value"]');
  const divisionSlider = options.container.querySelector('[data-role="division-slider"]');
  const divisionValue = options.container.querySelector('[data-role="division-value"]');
  const resetButton = options.container.querySelector('[data-role="reset"]');

  if (
    !(sceneGroup instanceof HTMLElement) ||
    !(scene1Panel instanceof HTMLElement) ||
    !(scene2Panel instanceof HTMLElement) ||
    !(scene3Panel instanceof HTMLElement) ||
    !(scene4Panel instanceof HTMLElement) ||
    !(scene5Panel instanceof HTMLElement) ||
    !(rectsSlider instanceof HTMLInputElement) ||
    !(rectsValue instanceof HTMLElement) ||
    !(timeSlider instanceof HTMLInputElement) ||
    !(timeValue instanceof HTMLElement) ||
    !(methodSelect instanceof HTMLSelectElement) ||
    !(curveAmpSlider instanceof HTMLInputElement) ||
    !(curveAmpValue instanceof HTMLElement) ||
    !(circleSlider instanceof HTMLInputElement) ||
    !(circleValue instanceof HTMLElement) ||
    !(surfaceSlider instanceof HTMLInputElement) ||
    !(surfaceValue instanceof HTMLElement) ||
    !(divisionSlider instanceof HTMLInputElement) ||
    !(divisionValue instanceof HTMLElement) ||
    !(resetButton instanceof HTMLButtonElement)
  ) {
    throw new Error('Failed to mount vt-integral controls');
  }

  const sceneButtons = Array.from(sceneGroup.querySelectorAll('.legacy-scene-btn')).filter(
    (node): node is HTMLButtonElement => node instanceof HTMLButtonElement
  );

  function syncPanels(): void {
    for (const button of sceneButtons) {
      const scene = button.dataset.scene as VtScene | undefined;
      const active = scene === state.scene;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    scene1Panel.classList.toggle('is-hidden', state.scene !== 'scene1');
    scene2Panel.classList.toggle('is-hidden', state.scene !== 'scene2');
    scene3Panel.classList.toggle('is-hidden', state.scene !== 'scene3');
    scene4Panel.classList.toggle('is-hidden', state.scene !== 'scene4');
    scene5Panel.classList.toggle('is-hidden', state.scene !== 'scene5');
  }

  function syncValues(): void {
    rectsValue.textContent = String(state.rects);
    timeValue.textContent = state.time.toFixed(1);
    curveAmpValue.textContent = state.curveAmplitude.toFixed(2);
    circleValue.textContent = String(state.circleN);
    surfaceValue.textContent = String(state.surfaceN);
    divisionValue.textContent = String(state.division);
    methodSelect.value = state.method;
  }

  const onSceneClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const scene = target.dataset.scene as VtScene | undefined;
    if (!scene) return;
    state.scene = scene;
    syncPanels();
    options.onSetScene(scene);
    options.onStatus?.(`已切换到${target.textContent ?? scene}`);
  };

  const onRectsInput = () => {
    state.rects = clampRects(Number(rectsSlider.value));
    rectsSlider.value = String(state.rects);
    syncValues();
    options.onSetRects(state.rects);
  };

  const onTimeInput = () => {
    state.time = clampTime(Number(timeSlider.value));
    timeSlider.value = String(state.time);
    syncValues();
    options.onSetTime(state.time);
  };

  const onMethodChange = () => {
    state.method = methodSelect.value as VtMethod;
    syncValues();
    options.onSetMethod(state.method);
  };

  const onCurveAmpInput = () => {
    state.curveAmplitude = clampCurveAmplitude(Number(curveAmpSlider.value));
    curveAmpSlider.value = String(state.curveAmplitude);
    syncValues();
    options.onSetCurveAmplitude(state.curveAmplitude);
  };

  const onCircleInput = () => {
    state.circleN = clampCircleN(Number(circleSlider.value));
    circleSlider.value = String(state.circleN);
    syncValues();
    options.onSetCircleN(state.circleN);
  };

  const onSurfaceInput = () => {
    state.surfaceN = clampSurfaceN(Number(surfaceSlider.value));
    surfaceSlider.value = String(state.surfaceN);
    syncValues();
    options.onSetSurfaceN(state.surfaceN);
  };

  const onDivisionInput = () => {
    state.division = clampDivision(Number(divisionSlider.value));
    divisionSlider.value = String(state.division);
    syncValues();
    options.onSetDivision(state.division);
  };

  const onResetClick = () => {
    state.scene = 'scene1';
    state.rects = 10;
    state.time = 5;
    state.method = 'mid';
    state.curveAmplitude = 0.25;
    state.circleN = 8;
    state.surfaceN = 1;
    state.division = 16;
    rectsSlider.value = String(state.rects);
    timeSlider.value = String(state.time);
    curveAmpSlider.value = String(state.curveAmplitude);
    circleSlider.value = String(state.circleN);
    surfaceSlider.value = String(state.surfaceN);
    divisionSlider.value = String(state.division);
    syncPanels();
    syncValues();
    options.onReset();
    options.onStatus?.('已重置微元法场景');
  };

  sceneGroup.addEventListener('click', onSceneClick);
  rectsSlider.addEventListener('input', onRectsInput);
  timeSlider.addEventListener('input', onTimeInput);
  methodSelect.addEventListener('change', onMethodChange);
  curveAmpSlider.addEventListener('input', onCurveAmpInput);
  circleSlider.addEventListener('input', onCircleInput);
  surfaceSlider.addEventListener('input', onSurfaceInput);
  divisionSlider.addEventListener('input', onDivisionInput);
  resetButton.addEventListener('click', onResetClick);

  syncPanels();
  syncValues();

  return {
    dispose(): void {
      sceneGroup.removeEventListener('click', onSceneClick);
      rectsSlider.removeEventListener('input', onRectsInput);
      timeSlider.removeEventListener('input', onTimeInput);
      methodSelect.removeEventListener('change', onMethodChange);
      curveAmpSlider.removeEventListener('input', onCurveAmpInput);
      circleSlider.removeEventListener('input', onCircleInput);
      surfaceSlider.removeEventListener('input', onSurfaceInput);
      divisionSlider.removeEventListener('input', onDivisionInput);
      resetButton.removeEventListener('click', onResetClick);
      options.container.innerHTML = '';
    }
  };
}
