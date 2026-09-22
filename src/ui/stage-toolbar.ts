/**
 * Shared floating stage toolbar host.
 *
 * Transport-bar already mounts `.teaching-stage-floating-controls`.
 * Other stage actions (data-workspace) reuse that host when present, or
 * create the same chrome when hideTransport left the stage empty.
 */

import {
  STAGE_CHROME_ATTR,
  STAGE_TOOLBAR_HOST_ATTR
} from '../platform/stage-chrome';

const FLOATING_SELECTOR =
  '.teaching-stage-floating-controls, .stage-floating-controls';

export type StageToolbarHost = HTMLElement & {
  dataset: DOMStringMap & { stageToolbarOwner?: string };
};

/**
 * 工具条骨架共享：建容器 + 按声明建按钮位。
 *
 * class 是认领键——theme-toggle/mode-toggle/layout-switch 能力按
 * `.theme-toggle-btn`/`.mode-toggle-btn`/`.layout-switch-btn`
 * find-or-create（scene-adapter 快捷键链也点它们），皮肤 class
 * （`lab-mode-toggle`、`mobile-toggle-btn` 等）由调用方保留。
 */
export interface StageToolbarButtonSpec {
  key: string;
  className: string;
  ariaLabel: string;
  text?: string;
}

export function buildStageToolbar(options: {
  className: string;
  buttons: StageToolbarButtonSpec[];
  /** 挂在工具条根部、actions 分组之前的按钮（split 的侧栏开关） */
  leadingButtons?: StageToolbarButtonSpec[];
  /** actions 分组容器 class；给出时 buttons 挂进分组而非根部 */
  actionsClassName?: string;
  /** mobile 形态：mount 即存在的宿主节点，创建点打 data-stage-toolbar-host */
  toolbarHost?: boolean;
}): { toolbar: HTMLElement; buttons: Record<string, HTMLButtonElement> } {
  const toolbar = document.createElement('div');
  toolbar.className = options.className;
  if (options.toolbarHost) toolbar.setAttribute(STAGE_TOOLBAR_HOST_ATTR, '');

  const buttons: Record<string, HTMLButtonElement> = {};
  const makeBtn = (spec: StageToolbarButtonSpec): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = spec.className;
    btn.setAttribute('aria-label', spec.ariaLabel);
    if (spec.text !== undefined) btn.textContent = spec.text;
    buttons[spec.key] = btn;
    return btn;
  };

  for (const spec of options.leadingButtons ?? []) {
    toolbar.appendChild(makeBtn(spec));
  }

  let actionsParent: HTMLElement = toolbar;
  if (options.actionsClassName) {
    actionsParent = document.createElement('div');
    actionsParent.className = options.actionsClassName;
    toolbar.appendChild(actionsParent);
  }
  for (const spec of options.buttons) {
    actionsParent.appendChild(makeBtn(spec));
  }

  return { toolbar, buttons };
}

export function findStageToolbar(root: ParentNode): HTMLElement | null {
  return root.querySelector<HTMLElement>(FLOATING_SELECTOR);
}

export function ensureStageToolbar(options: {
  animation: HTMLElement | null;
  container: HTMLElement;
  owner: string;
}): { host: HTMLElement; created: boolean } {
  const { animation, container, owner } = options;

  // 单一宿主语义：属性优先（createFloatingControls / mobile mount 打标），
  // class fallback 命中与自建都对最终返回节点补标。
  const marked = container.querySelector<HTMLElement>(
    `[${STAGE_TOOLBAR_HOST_ATTR}]`
  );
  if (marked) {
    return { host: marked, created: false };
  }

  const existing =
    findStageToolbar(container) ??
    (animation ? findStageToolbar(animation) : null);
  if (existing) {
    existing.setAttribute(STAGE_TOOLBAR_HOST_ATTR, '');
    return { host: existing, created: false };
  }

  const mobileBar = container.querySelector<HTMLElement>('.mobile-control-bar');
  if (mobileBar) {
    let group = mobileBar.querySelector<HTMLElement>(
      '.mobile-transport-toggles'
    );
    if (!group) {
      group = document.createElement('div');
      group.className = 'mobile-transport-toggles';
      group.dataset.stageToolbarOwner = owner;
      group.setAttribute(STAGE_TOOLBAR_HOST_ATTR, '');
      mobileBar.appendChild(group);
      return { host: group, created: true };
    }
    group.setAttribute(STAGE_TOOLBAR_HOST_ATTR, '');
    return { host: group, created: false };
  }

  const labToolbar = container.querySelector<HTMLElement>(
    '.lab-stage-toolbar, .stage-toolbar'
  );
  if (labToolbar) {
    labToolbar.setAttribute(STAGE_TOOLBAR_HOST_ATTR, '');
    return { host: labToolbar, created: false };
  }

  const host = document.createElement('div') as StageToolbarHost;
  host.className = 'teaching-stage-floating-controls stage-floating-controls';
  host.setAttribute(STAGE_CHROME_ATTR, '');
  host.setAttribute(STAGE_TOOLBAR_HOST_ATTR, '');
  host.dataset.stageToolbarOwner = owner;
  host.setAttribute('role', 'toolbar');
  host.setAttribute('aria-label', '舞台工具');
  const mount = animation ?? container;
  mount.appendChild(host);
  return { host, created: true };
}

export function releaseStageToolbar(host: HTMLElement, created: boolean): void {
  if (!created) return;
  if (host.childElementCount === 0 && host.parentElement) {
    host.parentElement.removeChild(host);
  }
}
