import { render as tlRender } from '@testing-library/react';

export function render(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const result = tlRender(ui, { container });
  return {
    ...result,
    cleanup: () => {
      result.unmount();
      container.remove();
    }
  };
}
