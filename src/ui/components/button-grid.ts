export function createButtonGrid(
  buttons: Array<{
    label: string;
    value: string;
    variant?: 'default' | 'primary' | 'secondary';
    onClick?: () => void;
  }>,
  options?: {
    columns?: number;
    onSelect?: (value: string) => void;
  }
): { element: HTMLElement; setActive: (value: string) => void; dispose: () => void } {
  const grid = document.createElement('div');
  grid.className = 'ctrl-btn-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = `repeat(${options?.columns ?? 2}, 1fr)`;
  grid.style.gap = '6px';

  const buttonElements = new Map<string, HTMLButtonElement>();
  const clickHandlers = new Map<string, () => void>();

  buttons.forEach((btn) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `ctrl-btn ${btn.variant || 'default'}`;
    button.textContent = btn.label;
    button.dataset.value = btn.value;
    button.style.cssText =
      'padding: 6px; font-size: 11px; border-radius: 6px; cursor: pointer;';

    const handler = () => {
      setActive(btn.value);
      btn.onClick?.();
      options?.onSelect?.(btn.value);
    };
    button.addEventListener('click', handler);
    clickHandlers.set(btn.value, handler);

    buttonElements.set(btn.value, button);
    grid.appendChild(button);
  });

  function setActive(value: string): void {
    buttonElements.forEach((btn, key) => {
      btn.classList.toggle('active', key === value);
    });
  }

  return {
    element: grid,
    setActive,
    dispose() {
      buttonElements.forEach((btn, value) => {
        const handler = clickHandlers.get(value);
        if (handler) btn.removeEventListener('click', handler);
      });
      buttonElements.clear();
      clickHandlers.clear();
    }
  };
}
