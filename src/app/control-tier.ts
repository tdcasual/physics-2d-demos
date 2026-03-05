export type ControlTierHandle = {
  dispose: () => void;
};

export type MountControlTierOptions = {
  collapsedLabel?: string;
  expandedLabel?: string;
  defaultExpanded?: boolean;
};

export function mountControlTier(
  container: HTMLElement,
  options: MountControlTierOptions = {}
): ControlTierHandle {
  const advancedBlocks = Array.from(container.querySelectorAll<HTMLElement>('.scene-advanced'));
  if (advancedBlocks.length === 0) {
    return {
      dispose() {
        // no-op
      }
    };
  }

  const collapsedLabel = options.collapsedLabel ?? '显示高级参数';
  const expandedLabel = options.expandedLabel ?? '收起高级参数';
  let expanded = options.defaultExpanded ?? false;

  const panel = container.querySelector('.scene-control-panel');
  if (!(panel instanceof HTMLElement)) {
    return {
      dispose() {
        // no-op
      }
    };
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'control-tier-toggle scene-chip-btn scene-wide-btn';

  const sync = (): void => {
    container.dataset.controlTier = expanded ? 'advanced' : 'classroom';
    for (const block of advancedBlocks) {
      block.hidden = !expanded;
      block.setAttribute('aria-hidden', String(!expanded));
    }
    toggle.textContent = expanded ? expandedLabel : collapsedLabel;
    toggle.setAttribute('aria-expanded', String(expanded));
  };

  const onToggle = (): void => {
    expanded = !expanded;
    sync();
  };

  panel.insertBefore(toggle, panel.firstChild);
  toggle.addEventListener('click', onToggle);
  sync();

  return {
    dispose() {
      toggle.removeEventListener('click', onToggle);
      toggle.remove();
      for (const block of advancedBlocks) {
        block.hidden = false;
        block.removeAttribute('aria-hidden');
      }
      delete container.dataset.controlTier;
    }
  };
}
