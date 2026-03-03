export type ElectrificationScene = 'friction' | 'induction' | 'contact';

export type CreateLegacyElectrificationControlsOptions = {
  container: HTMLElement;
  onCommand: (command: string, payload?: unknown) => void;
  onStatus?: (text: string) => void;
};

type ElectrificationControlState = {
  scene: ElectrificationScene;
};

const sceneLabels: Record<ElectrificationScene, string> = {
  friction: '摩擦起电',
  induction: '感应起电',
  contact: '接触起电'
};

export function createLegacyElectrificationControls(options: CreateLegacyElectrificationControlsOptions) {
  const state: ElectrificationControlState = {
    scene: 'friction'
  };

  options.container.innerHTML = `
    <div class="legacy-field-controls">
      <div class="legacy-field-scenes" data-role="scene-group">
        <button type="button" class="legacy-scene-btn" data-scene="friction">摩擦起电</button>
        <button type="button" class="legacy-scene-btn" data-scene="induction">感应起电</button>
        <button type="button" class="legacy-scene-btn" data-scene="contact">接触起电</button>
      </div>
      <div class="legacy-action-grid">
        <button type="button" class="legacy-chip-btn legacy-wide-btn" data-role="run-step">执行下一步</button>
        <button type="button" class="legacy-reset-btn" data-role="reset">重置场景</button>
      </div>
    </div>
  `;

  const sceneGroup = options.container.querySelector('[data-role="scene-group"]');
  const runStepButton = options.container.querySelector('[data-role="run-step"]');
  const resetButton = options.container.querySelector('[data-role="reset"]');

  if (
    !(sceneGroup instanceof HTMLElement) ||
    !(runStepButton instanceof HTMLButtonElement) ||
    !(resetButton instanceof HTMLButtonElement)
  ) {
    throw new Error('Failed to mount electrification controls');
  }

  const sceneButtons = Array.from(sceneGroup.querySelectorAll('.legacy-scene-btn')).filter(
    (node): node is HTMLButtonElement => node instanceof HTMLButtonElement
  );

  function syncSceneButtons(): void {
    for (const button of sceneButtons) {
      const scene = button.dataset.scene as ElectrificationScene | undefined;
      const active = scene === state.scene;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  function pushScene(): void {
    options.onCommand('set-scene', { scene: state.scene });
  }

  const onSceneClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const scene = target.dataset.scene as ElectrificationScene | undefined;
    if (!scene) return;
    state.scene = scene;
    syncSceneButtons();
    pushScene();
    options.onStatus?.(`已切换场景：${sceneLabels[state.scene]}`);
  };

  const onRunStepClick = () => {
    options.onCommand('run-scene-action');
    options.onStatus?.('已请求执行下一步动作');
  };

  const onResetClick = () => {
    state.scene = 'friction';
    syncSceneButtons();
    options.onCommand('reset');
    options.onStatus?.('已重置场景');
  };

  sceneGroup.addEventListener('click', onSceneClick);
  runStepButton.addEventListener('click', onRunStepClick);
  resetButton.addEventListener('click', onResetClick);

  syncSceneButtons();

  return {
    dispose(): void {
      sceneGroup.removeEventListener('click', onSceneClick);
      runStepButton.removeEventListener('click', onRunStepClick);
      resetButton.removeEventListener('click', onResetClick);
      options.container.innerHTML = '';
    }
  };
}
