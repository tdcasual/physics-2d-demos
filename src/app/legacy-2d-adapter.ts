import type { ReadoutItem } from './teaching-demo-shell';
import {
  buildLegacyIframeSourcePath,
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
  embedQuery?: Record<string, string>;
  onReadout: (items: ReadoutItem[]) => void;
  onStatus: (text: string) => void;
};

export function createLegacy2DAdapter(options: CreateLegacy2DAdapterOptions) {
  const targetOrigin = resolveLegacyTargetOrigin(options.sourcePath, window.location.origin);
  const pendingMessages: Array<{ type: string; [key: string]: unknown }> = [];
  let loaded = false;

  const iframe = document.createElement('iframe');
  iframe.className = 'legacy-iframe';
  iframe.setAttribute('title', `${options.sceneId}-legacy-2d`);
  iframe.setAttribute('loading', 'eager');
  iframe.setAttribute('allowfullscreen', 'true');
  iframe.src = buildLegacyIframeSourcePath(options.sourcePath, options.embedQuery);

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
    loaded = true;
    if (iframe.contentWindow) {
      for (const message of pendingMessages.splice(0)) {
        iframe.contentWindow.postMessage(message, targetOrigin);
      }
    }
    options.onStatus('2D 页面已加载');
  };

  window.addEventListener('message', onMessage);
  iframe.addEventListener('load', onLoad);

  function postToIframe(data: { type: string; [key: string]: unknown }): void {
    if (!iframe.contentWindow || !loaded) {
      pendingMessages.push(data);
      if (!iframe.contentWindow) {
        options.onStatus('页面尚未完成加载');
      }
      return;
    }
    iframe.contentWindow.postMessage(data, targetOrigin);
  }

  function sendControl(action: Legacy2DControlAction): void {
    postToIframe({
      type: 'legacy:control',
      sceneId: options.sceneId,
      action
    });
  }

  function sendControlExt(command: string, payload?: unknown): void {
    postToIframe({
      type: 'legacy:control-ext',
      sceneId: options.sceneId,
      command,
      payload
    });
  }

  return {
    iframe,
    sendControl,
    sendControlExt,
    dispose(): void {
      window.removeEventListener('message', onMessage);
      iframe.removeEventListener('load', onLoad);
      iframe.remove();
    }
  };
}
