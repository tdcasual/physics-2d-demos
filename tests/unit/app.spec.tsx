import { describe, expect, it, beforeAll } from 'vitest';
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

  it('should render experiments section', () => {
    const { container, cleanup } = render(<App />);
    expect(container.querySelector('#experiments')).toBeTruthy();
    cleanup();
  });

  it('should render theme toggle button', () => {
    const { container, cleanup } = render(<App />);
    const toggle = container.querySelector('.theme-toggle');
    expect(toggle).toBeTruthy();
    cleanup();
  });
});
