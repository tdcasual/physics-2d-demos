import { getTeachingStandards, type TeachingMode } from './teaching-standards';

export type ReadoutItem = {
  label: string;
  value: string;
};

export type TeachingDemoShell = {
  root: HTMLElement;
  controlSlot: HTMLElement;
  readoutSlot: HTMLElement;
  stageSlot: HTMLElement;
  stageCanvas: HTMLCanvasElement;
  modeButton: HTMLButtonElement;
  setStatus: (text: string) => void;
  setReadout: (items: ReadoutItem[]) => void;
  setMode: (mode: TeachingMode) => void;
  getMode: () => TeachingMode;
};

export type CreateTeachingDemoShellOptions = {
  mount: HTMLElement;
  title: string;
  subtitle: string;
  defaultMode?: TeachingMode;
};

function modeToggleLabel(mode: TeachingMode): string {
  return mode === 'presentation' ? '切换到标准模式' : '切换到演示模式';
}

function applyModeTokens(root: HTMLElement, mode: TeachingMode): void {
  const standards = getTeachingStandards(mode);
  root.dataset.mode = mode;
  root.style.setProperty('--body-font-px', `${standards.bodyFontPx}px`);
  root.style.setProperty('--control-font-px', `${standards.controlFontPx}px`);
  root.style.setProperty('--heading-font-px', `${standards.headingFontPx}px`);
  root.style.setProperty('--stroke-px', `${standards.strokePx}px`);
  root.style.setProperty('--point-radius-px', `${standards.pointRadiusPx}px`);
}

export function createTeachingDemoShell(options: CreateTeachingDemoShellOptions): TeachingDemoShell {
  const modeState: { value: TeachingMode } = {
    value: options.defaultMode ?? 'normal'
  };

  options.mount.innerHTML = `
    <section class="teaching-demo" data-mode="${modeState.value}">
      <aside class="teaching-sidebar">
        <header class="teaching-header">
          <h1 class="teaching-title">${options.title}</h1>
          <p class="teaching-subtitle">${options.subtitle}</p>
        </header>
        <section class="teaching-card">
          <h2 class="teaching-card-title">显示模式</h2>
          <button type="button" class="mode-toggle">${modeToggleLabel(modeState.value)}</button>
          <p class="mode-hint">演示模式按 1080P 教室场景放大字体与线条。</p>
        </section>
        <section class="teaching-card">
          <h2 class="teaching-card-title">控制区</h2>
          <div class="control-slot"></div>
        </section>
        <section class="teaching-card">
          <h2 class="teaching-card-title">数据区</h2>
          <ul class="readout-slot"></ul>
        </section>
        <section class="teaching-card status-card">
          <h2 class="teaching-card-title">状态</h2>
          <p class="status-text">就绪</p>
        </section>
      </aside>
      <section class="teaching-stage-panel">
        <div class="stage-frame">
          <div class="stage-slot">
            <canvas class="stage-canvas" aria-label="2D 物理动画演示区域"></canvas>
          </div>
        </div>
      </section>
    </section>
  `;

  const root = options.mount.querySelector('.teaching-demo');
  const controlSlot = options.mount.querySelector('.control-slot');
  const readoutSlot = options.mount.querySelector('.readout-slot');
  const statusText = options.mount.querySelector('.status-text');
  const stageSlot = options.mount.querySelector('.stage-slot');
  const stageCanvas = options.mount.querySelector('.stage-canvas');
  const modeButton = options.mount.querySelector('.mode-toggle');

  if (
    !(root instanceof HTMLElement) ||
    !(controlSlot instanceof HTMLElement) ||
    !(readoutSlot instanceof HTMLElement) ||
    !(statusText instanceof HTMLElement) ||
    !(stageSlot instanceof HTMLElement) ||
    !(stageCanvas instanceof HTMLCanvasElement) ||
    !(modeButton instanceof HTMLButtonElement)
  ) {
    throw new Error('Failed to mount teaching demo shell');
  }

  const setMode = (mode: TeachingMode): void => {
    modeState.value = mode;
    applyModeTokens(root, modeState.value);
    modeButton.textContent = modeToggleLabel(modeState.value);
    modeButton.setAttribute('aria-pressed', String(modeState.value === 'presentation'));
  };

  applyModeTokens(root, modeState.value);
  modeButton.setAttribute('aria-pressed', String(modeState.value === 'presentation'));

  return {
    root,
    controlSlot,
    readoutSlot,
    stageSlot,
    stageCanvas,
    modeButton,
    setStatus(text: string) {
      statusText.textContent = text;
    },
    setReadout(items: ReadoutItem[]) {
      readoutSlot.innerHTML = '';
      for (const item of items) {
        const line = document.createElement('li');
        line.className = 'readout-item';
        line.innerHTML = `<span class="readout-label">${item.label}</span><strong class="readout-value">${item.value}</strong>`;
        readoutSlot.appendChild(line);
      }
    },
    setMode,
    getMode() {
      return modeState.value;
    }
  };
}
