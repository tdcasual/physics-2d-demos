export function createTransportControls(options: {
  onPlay?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  onStep?: () => void;
}): { element: HTMLElement; setPlaying: (playing: boolean) => void } {
  const container = document.createElement('div');
  container.className = 'ctrl-transport';
  container.style.cssText = `
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 4px;
  `;

  const buttons = [
    { icon: '▶', label: '播放', action: options.onPlay },
    { icon: '⏸', label: '暂停', action: options.onPause },
    { icon: '⏹', label: '重置', action: options.onReset },
    { icon: '⏵', label: '单步', action: options.onStep }
  ];

  const buttonElements: HTMLButtonElement[] = [];

  buttons.forEach((btn) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ctrl-transport-btn';
    button.innerHTML = `<span style="font-size: 14px;">${btn.icon}</span>`;
    button.title = btn.label;
    button.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 8px 4px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: var(--text-secondary);
      font-size: 10px;
      cursor: pointer;
    `;

    if (btn.action) {
      button.addEventListener('click', btn.action);
    }

    buttonElements.push(button);
    container.appendChild(button);
  });

  function setPlaying(playing: boolean): void {
    buttonElements[0].classList.toggle('active', playing);
    buttonElements[1].classList.toggle('active', !playing);
  }

  return { element: container, setPlaying };
}
