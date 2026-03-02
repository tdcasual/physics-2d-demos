export type ControlPanelActions = {
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStep: () => void;
};

export function createControlPanel(container: HTMLElement, actions: ControlPanelActions): void {
  const panel = document.createElement('div');
  panel.className = 'transport-controls';

  const buttons: Array<{ label: string; onClick: () => void }> = [
    { label: '播放', onClick: actions.onPlay },
    { label: '暂停', onClick: actions.onPause },
    { label: '重置', onClick: actions.onReset },
    { label: '单步', onClick: actions.onStep }
  ];

  for (const entry of buttons) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = entry.label;
    btn.addEventListener('click', entry.onClick);
    panel.appendChild(btn);
  }

  container.appendChild(panel);
}
