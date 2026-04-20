import { describe, expect, it } from 'vitest';
import { SplitRightLayout } from '../../src/app/layouts/masters/split-right/split-right';

describe('SplitRightLayout', () => {
  function createLayout(
    config?: ConstructorParameters<typeof SplitRightLayout>[1]
  ) {
    const container = document.createElement('div');
    container.style.width = '1200px';
    container.style.height = '800px';
    const layout = new SplitRightLayout(container, config);
    return { container, layout };
  }

  it('should render left and right panels', () => {
    const { container, layout } = createLayout();
    const slots = layout.render(container);

    expect(container.querySelector('.teaching-left-panel')).toBeTruthy();
    expect(container.querySelector('.teaching-right-panel')).toBeTruthy();
    expect(slots.control).toBeTruthy();
    expect(slots.animation).toBeTruthy();
  });

  it('should render readout panel with initial collapsed state', () => {
    const { container, layout } = createLayout({ readoutCollapsed: true });
    layout.render(container);

    const readout = container.querySelector('.readout-panel');
    expect(readout).toBeTruthy();
    expect(readout?.classList.contains('is-collapsed')).toBe(true);
  });

  it('should render readout panel expanded when configured', () => {
    const { container, layout } = createLayout({ readoutCollapsed: false });
    layout.render(container);

    const readout = container.querySelector('.readout-panel');
    expect(readout?.classList.contains('is-collapsed')).toBe(false);
  });

  it('should toggle sidebar and update grid columns', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    const toggle = container.querySelector(
      '.sidebar-toggle'
    ) as HTMLButtonElement;
    expect(toggle).toBeTruthy();

    // Initial state
    expect(container.style.gridTemplateColumns).not.toBe('0px 8px 1fr');

    toggle.click();
    expect(container.style.gridTemplateColumns).toBe('0px 8px 1fr');

    toggle.click();
    expect(container.style.gridTemplateColumns).not.toBe('0px 8px 1fr');
  });

  it('should toggle readout when readout toggle clicked', () => {
    const { container, layout } = createLayout({ readoutCollapsed: false });
    layout.render(container);

    const readoutToggle = container.querySelector(
      '.readout-toggle'
    ) as HTMLButtonElement;
    expect(readoutToggle).toBeTruthy();

    const readout = container.querySelector('.readout-panel') as HTMLElement;
    expect(readout.classList.contains('is-collapsed')).toBe(false);

    readoutToggle.click();
    expect(readout.classList.contains('is-collapsed')).toBe(true);

    readoutToggle.click();
    expect(readout.classList.contains('is-collapsed')).toBe(false);
  });

  it('should update readout items', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    layout.setReadout([
      { label: '速度', value: '10 m/s' },
      { label: '角度', value: '45°', layout: 'half' }
    ]);

    const slot = container.querySelector('.readout-slot') as HTMLElement;
    expect(slot.children.length).toBe(2);
    expect(slot.textContent).toContain('速度');
    expect(slot.textContent).toContain('10 m/s');
    expect(slot.querySelector('.readout-item--half')).toBeTruthy();
  });

  it('should update status text in readout slot', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    layout.updateStatus('运行中');

    const slot = container.querySelector('.readout-slot') as HTMLElement;
    expect(slot.textContent).toContain('运行中');
  });

  it('should apply data-testid attributes', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    expect(container.dataset.testid).toBe('split-right-layout');
    expect(container.querySelector('[data-testid="left-panel"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="right-panel"]')).toBeTruthy();
  });

  it('should set theme attribute', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    layout.setTheme('dark');
    expect(container.getAttribute('data-theme')).toBe('dark');

    layout.setTheme('light');
    expect(container.getAttribute('data-theme')).toBe('light');
  });

  it('should set mode attribute', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    layout.setMode('presentation');
    expect(container.getAttribute('data-mode')).toBe('presentation');

    layout.setMode('normal');
    expect(container.getAttribute('data-mode')).toBe('normal');
  });

  it('should dispose without throwing', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    expect(async () => {
      await layout.unmount();
    }).not.toThrow();
  });

  it('should set resizer ARIA attributes for accessibility', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    const resizer = container.querySelector('.panel-resizer') as HTMLElement;
    expect(resizer).toBeTruthy();
    expect(resizer.getAttribute('role')).toBe('separator');
    expect(resizer.getAttribute('aria-orientation')).toBe('vertical');
    expect(resizer.getAttribute('aria-label')).toBe('调整面板宽度');
    expect(resizer.getAttribute('tabindex')).toBe('0');
  });

  it('should update container classes on handleResize for compact viewport', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    // Simulate compact viewport (< 768px)
    layout.handleResize(600);
    expect(container.style.gridTemplateColumns).toBe('1fr');
    expect(container.style.gridTemplateRows).toBe('auto 1fr');
  });

  it('should update container classes on handleResize for tablet viewport', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    // Simulate tablet viewport (768px - 1024px)
    layout.handleResize(900);
    expect(container.style.gridTemplateColumns).toBe('280px 8px 1fr');
  });

  it('should update container classes on handleResize for desktop viewport', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    // Simulate desktop viewport (> 1024px)
    layout.handleResize(1200);
    const cols = container.style.gridTemplateColumns;
    expect(cols).toMatch(/^\d+px 8px 1fr$/);
  });

  it('should hide resizer in compact viewport', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    const resizer = container.querySelector('.panel-resizer') as HTMLElement;
    expect(resizer.style.display).not.toBe('none');

    layout.handleResize(600);
    expect(resizer.style.display).toBe('none');

    layout.handleResize(1200);
    expect(resizer.style.display).toBe('block');
  });

  it('should set left ratio within bounds', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    Object.defineProperty(container, 'clientWidth', {
      value: 1200,
      writable: true
    });

    layout.setLeftRatio(0.5);
    const ratio = layout.getLeftRatio();
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThanOrEqual(0.5);
  });

  it('should update readout toggle button aria-label when toggled', () => {
    const { container, layout } = createLayout({ readoutCollapsed: false });
    layout.render(container);

    const readoutToggle = container.querySelector(
      '.readout-toggle'
    ) as HTMLButtonElement;
    expect(readoutToggle).toBeTruthy();
    expect(readoutToggle.getAttribute('aria-label')).toBe('折叠');

    readoutToggle.click();
    expect(readoutToggle.getAttribute('aria-label')).toBe('展开');

    readoutToggle.click();
    expect(readoutToggle.getAttribute('aria-label')).toBe('折叠');
  });

  it('should set and update readout data with half layout items', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    layout.setReadout([
      { label: '时间', value: '2.5s' },
      { label: '位移', value: '45m', layout: 'half' },
      { label: '速度', value: '18m/s', layout: 'half' }
    ]);

    const slot = container.querySelector('.readout-slot') as HTMLElement;
    expect(slot.children.length).toBe(3);
    expect(slot.querySelectorAll('.readout-item--half').length).toBe(2);
  });

  it('should render graph section when hasGraph is true', () => {
    const { container, layout } = createLayout({ hasGraph: true });
    layout.render(container);

    expect(container.querySelector('.graph-section')).toBeTruthy();
    expect(container.querySelector('.graph-slot')).toBeTruthy();
  });

  it('should not render graph section when hasGraph is false', () => {
    const { container, layout } = createLayout({ hasGraph: false });
    layout.render(container);

    expect(container.querySelector('.graph-section')).toBeFalsy();
  });
});
