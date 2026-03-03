import type { ReadoutItem } from './teaching-demo-shell';

export type Legacy2DControlAction = 'play' | 'pause' | 'reset' | 'step';

export type CreateLegacy2DAdapterOptions = {
  stageSlot: HTMLElement;
  sceneId: string;
  sourcePath: string;
  onReadout: (items: ReadoutItem[]) => void;
  onStatus: (text: string) => void;
};

type LegacyReadoutMessage = {
  type: 'legacy:readout';
  items: ReadoutItem[];
};

type LegacyStatusMessage = {
  type: 'legacy:status';
  text: string;
};

function isReadoutItems(value: unknown): value is ReadoutItem[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (typeof item !== 'object' || item === null) return false;
    const row = item as Record<string, unknown>;
    return typeof row.label === 'string' && typeof row.value === 'string';
  });
}

export function createLegacy2DAdapter(options: CreateLegacy2DAdapterOptions) {
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
    const payload = event.data as LegacyReadoutMessage | LegacyStatusMessage | unknown;
    if (!payload || typeof payload !== 'object') return;
    const record = payload as Record<string, unknown>;

    if (record.type === 'legacy:readout' && isReadoutItems(record.items)) {
      options.onReadout(record.items);
    }

    if (record.type === 'legacy:status' && typeof record.text === 'string') {
      options.onStatus(record.text);
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
      '*'
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
