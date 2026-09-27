import { describe, expect, it, beforeAll } from 'vitest';
import { waitFor } from '@testing-library/react';
import { render } from '../utils/render';
import App from '../../src/app/App';

describe('App', () => {
  beforeAll(() => {
    // Ensure meta theme-color exists for App useEffect
    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
  });

  it('should render header with logo', () => {
    const { container, cleanup } = render(<App />);
    expect(container.textContent).toContain('物理实验室');
    cleanup();
  });

  it('should render experiments section', async () => {
    const { container, cleanup } = render(<App />);
    await waitFor(
      () => {
        expect(container.querySelector('#experiments')).toBeTruthy();
      },
      { timeout: 5000 }
    );
    cleanup();
  });

  it('should render theme toggle button', () => {
    const { container, cleanup } = render(<App />);
    const toggle = container.querySelector('.theme-toggle');
    expect(toggle).toBeTruthy();
    cleanup();
  });

  it('should not inject page-scoped style tags at runtime', async () => {
    const { cleanup } = render(<App />);
    await waitFor(
      () => {
        expect(document.querySelector('#experiments')).toBeTruthy();
      },
      { timeout: 5000 }
    );
    expect(document.querySelectorAll('style')).toHaveLength(0);
    cleanup();
  });
});
