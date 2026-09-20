/**
 * Shared floating stage toolbar host.
 *
 * Transport-bar already mounts `.teaching-stage-floating-controls`.
 * Other stage actions (data-workspace) reuse that host when present, or
 * create the same chrome when hideTransport left the stage empty.
 */

const FLOATING_SELECTOR =
  '.teaching-stage-floating-controls, .stage-floating-controls';

export type StageToolbarHost = HTMLElement & {
  dataset: DOMStringMap & { stageToolbarOwner?: string };
};

export function findStageToolbar(root: ParentNode): HTMLElement | null {
  return root.querySelector<HTMLElement>(FLOATING_SELECTOR);
}

export function ensureStageToolbar(options: {
  animation: HTMLElement | null;
  container: HTMLElement;
  owner: string;
}): { host: HTMLElement; created: boolean } {
  const { animation, container, owner } = options;
  const existing =
    findStageToolbar(container) ??
    (animation ? findStageToolbar(animation) : null);
  if (existing) {
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
      mobileBar.appendChild(group);
      return { host: group, created: true };
    }
    return { host: group, created: false };
  }

  const labToolbar = container.querySelector<HTMLElement>(
    '.lab-stage-toolbar, .stage-toolbar'
  );
  if (labToolbar) {
    return { host: labToolbar, created: false };
  }

  const host = document.createElement('div') as StageToolbarHost;
  host.className = 'teaching-stage-floating-controls stage-floating-controls';
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
