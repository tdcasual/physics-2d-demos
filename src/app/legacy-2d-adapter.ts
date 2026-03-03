import type { ReadoutItem } from './teaching-demo-shell';
import {
  isLegacyReadoutMessage,
  isLegacyStatusMessage,
  isTrustedLegacyOrigin,
  resolveLegacyTargetOrigin
} from './legacy-2d-protocol';

export type Legacy2DControlAction = 'play' | 'pause' | 'reset' | 'step';

export type CreateLegacy2DAdapterOptions = {
  stageSlot: HTMLElement;
  sceneId: string;
  sourcePath: string;
  onReadout: (items: ReadoutItem[]) => void;
  onStatus: (text: string) => void;
};

export function createLegacy2DAdapter(options: CreateLegacy2DAdapterOptions) {
  const targetOrigin = resolveLegacyTargetOrigin(options.sourcePath, window.location.origin);

  const iframe = document.createElement('iframe');
  iframe.className = 'legacy-iframe';
  iframe.setAttribute('title', `${options.sceneId}-legacy-2d`);
  iframe.setAttribute('loading', 'eager');
  iframe.setAttribute('allowfullscreen', 'true');
  iframe.src = encodeURI(options.sourcePath);

  options.stageSlot.innerHTML = '';
  options.stageSlot.appendChild(iframe);

  const onMessage = (event: MessageEvent): void => {
    if (event.source !== iframe.contentWindow) return;
    if (!isTrustedLegacyOrigin(event.origin, targetOrigin)) return;

    if (isLegacyReadoutMessage(event.data)) {
      options.onReadout(event.data.items);
      return;
    }

    if (isLegacyStatusMessage(event.data)) {
      options.onStatus(event.data.text);
    }
  };

  const onLoad = (): void => {
    options.onStatus('2D 页面已加载');
  };

  window.addEventListener('message', onMessage);
  iframe.addEventListener('load', onLoad);

  function sendControl(action: Legacy2DControlAction): void {
    if (!iframe.contentWindow) {
      options.onStatus('页面尚未完成加载');
      return;
    }
    iframe.contentWindow.postMessage(
      {
        type: 'legacy:control',
        sceneId: options.sceneId,
        action
      },
      targetOrigin
    );
  }

  return {
    iframe,
    sendControl,
    dispose(): void {
      window.removeEventListener('message', onMessage);
      iframe.removeEventListener('load', onLoad);
      iframe.remove();
    }
  };
}
