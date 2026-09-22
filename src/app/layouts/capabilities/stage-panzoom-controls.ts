import { STAGE_CHROME_ATTR } from '../../../platform/stage-chrome';

export function buildStagePanzoomControls(options: {
  signal: AbortSignal;
  onZoomIn(): void;
  onZoomOut(): void;
  onReset(): void;
}): HTMLDivElement {
  const host = document.createElement('div');
  host.className = 'stage-panzoom-controls';
  host.setAttribute(STAGE_CHROME_ATTR, '');
  host.dataset.panzoomIgnore = '';
  host.setAttribute('role', 'group');
  host.setAttribute('aria-label', '舞台缩放');

  const makeButton = (
    label: string,
    text: string,
    onClick: () => void
  ): HTMLButtonElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'stage-panzoom-btn';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.textContent = text;
    button.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      },
      { signal: options.signal }
    );
    return button;
  };

  host.append(
    makeButton('放大', '➕', options.onZoomIn),
    makeButton('缩小', '➖', options.onZoomOut),
    makeButton('复位视图', '复位', options.onReset)
  );
  return host;
}
