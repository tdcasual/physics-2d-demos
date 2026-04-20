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
): { element: HTMLElement; setActive: (value: string) => void } {
  const grid = document.createElement('div');
  grid.className = 'ctrl-btn-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = `repeat(${options?.columns ?? 2}, 1fr)`;
  grid.style.gap = '6px';

  const buttonElements = new Map<string, HTMLButtonElement>();

  buttons.forEach((btn) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `ctrl-btn ${btn.variant || 'default'}`;
    button.textContent = btn.label;
    button.dataset.value = btn.value;
    button.style.cssText =
      'padding: 6px; font-size: 11px; border-radius: 6px; cursor: pointer;';

    button.addEventListener('click', () => {
      setActive(btn.value);
      btn.onClick?.();
      options?.onSelect?.(btn.value);
    });

    buttonElements.set(btn.value, button);
    grid.appendChild(button);
  });

  function setActive(value: string): void {
    buttonElements.forEach((btn, key) => {
      btn.classList.toggle('active', key === value);
    });
  }

  return { element: grid, setActive };
}
