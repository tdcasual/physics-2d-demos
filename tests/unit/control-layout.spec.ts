import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  createControlLayout,
  createControlCard,
  createCollapsibleCard,
  createParamSlider,
  createButtonGrid,
  createTransportControls
} from '../../src/ui/control-layout';
import { createFloatingControls } from '../../src/ui/floating-controls-legacy';

describe('createControlLayout', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '400px';
    document.body.appendChild(container);
    Object.defineProperty(container, 'clientWidth', {
      value: 400,
      writable: true
    });
    // Mock ResizeObserver to prevent interference from async callbacks
    (window as unknown as Record<string, unknown>).ResizeObserver =
      class MockResizeObserver {
        observe() {}
        disconnect() {}
        unobserve() {}
      } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    container.remove();
  });

  it('should initialize with correct column count based on width', () => {
    const onLayoutChange = vi.fn();
    const layout = createControlLayout({
      container,
      onLayoutChange,
      defaultDensity: 'comfortable'
    });

    expect(container.getAttribute('data-columns')).toBe('3');
    expect(container.getAttribute('data-density')).toBe('comfortable');
    layout.dispose();
  });

  it('should switch to 2 columns at narrower width', () => {
    Object.defineProperty(container, 'clientWidth', {
      value: 300,
      writable: true
    });
    const layout = createControlLayout({
      container,
      minWidth2Col: 280,
      minWidth3Col: 380,
      defaultDensity: 'comfortable'
    });

    layout.updateLayout();
    expect(container.getAttribute('data-columns')).toBe('2');
    layout.dispose();
  });

  it('should switch to 1 column at narrow width', () => {
    Object.defineProperty(container, 'clientWidth', {
      value: 200,
      writable: true
    });
    const layout = createControlLayout({
      container,
      minWidth2Col: 280,
      minWidth3Col: 380,
      defaultDensity: 'comfortable'
    });

    layout.updateLayout();
    expect(container.getAttribute('data-columns')).toBe('1');
    layout.dispose();
  });

  it('should switch to compact density below 300px', () => {
    Object.defineProperty(container, 'clientWidth', {
      value: 250,
      writable: true
    });
    const layout = createControlLayout({
      container,
      defaultDensity: 'comfortable'
    });

    layout.updateLayout();
    expect(container.getAttribute('data-density')).toBe('compact');
    layout.dispose();
  });

  it('should allow manual column override', () => {
    const layout = createControlLayout({
      container,
      defaultDensity: 'comfortable'
    });
    layout.setColumns(2);

    expect(container.getAttribute('data-columns')).toBe('2');
    layout.dispose();
  });

  it('should allow manual density override', () => {
    const layout = createControlLayout({
      container,
      defaultDensity: 'comfortable'
    });
    layout.setDensity('compact');

    expect(container.getAttribute('data-density')).toBe('compact');
    layout.dispose();
  });

  it('should report current layout', () => {
    const layout = createControlLayout({
      container,
      defaultDensity: 'comfortable'
    });
    const current = layout.getCurrentLayout();

    expect(current.columns).toBe(3);
    expect(current.density).toBe('comfortable');
    expect(typeof current.width).toBe('number');
    layout.dispose();
  });

  it('should call onLayoutChange when layout changes', () => {
    const onLayoutChange = vi.fn();
    Object.defineProperty(container, 'clientWidth', {
      value: 200,
      writable: true
    });
    const layout = createControlLayout({ container, onLayoutChange });

    // Force a change from 1 to 2 columns
    Object.defineProperty(container, 'clientWidth', {
      value: 300,
      writable: true
    });
    layout.updateLayout();

    expect(onLayoutChange).toHaveBeenCalled();
    layout.dispose();
  });
});

describe('createControlCard', () => {
  it('should create a card with title', () => {
    const card = createControlCard('参数设置');

    expect(card.element.classList.contains('ctrl-card')).toBe(true);
    expect(card.header.textContent).toContain('参数设置');
    expect(card.body.classList.contains('ctrl-card-body')).toBe(true);
  });

  it('should create a card with icon', () => {
    const card = createControlCard('预设', { icon: '⚙️' });

    expect(card.header.innerHTML).toContain('⚙️');
    expect(card.header.textContent).toContain('预设');
  });

  it('should create collapsed card when specified', () => {
    const card = createControlCard('高级', { defaultCollapsed: true });

    expect(card.element.classList.contains('collapsed')).toBe(true);
    const toggle = card.header.querySelector(
      '.ctrl-card-toggle'
    ) as HTMLButtonElement;
    expect(toggle.getAttribute('aria-label')).toBe('展开');
  });

  it('should toggle collapsed state on button click', () => {
    const card = createControlCard('测试');
    const toggle = card.header.querySelector(
      '.ctrl-card-toggle'
    ) as HTMLButtonElement;

    expect(card.element.classList.contains('collapsed')).toBe(false);
    toggle.click();
    expect(card.element.classList.contains('collapsed')).toBe(true);
    expect(toggle.getAttribute('aria-label')).toBe('展开');
    toggle.click();
    expect(card.element.classList.contains('collapsed')).toBe(false);
    expect(toggle.getAttribute('aria-label')).toBe('折叠');
  });

  it('should set collapsed state programmatically', () => {
    const card = createControlCard('测试');

    card.setCollapsed(true);
    expect(card.element.classList.contains('collapsed')).toBe(true);

    card.setCollapsed(false);
    expect(card.element.classList.contains('collapsed')).toBe(false);
  });

  it('should not toggle when clicking non-toggle areas', () => {
    const card = createControlCard('测试');
    const title = card.header.querySelector('.ctrl-card-title') as HTMLElement;

    title.click();
    expect(card.element.classList.contains('collapsed')).toBe(false);
  });

  it('createCollapsibleCard should be an alias', () => {
    const card = createCollapsibleCard('别名测试');
    expect(card.element.classList.contains('ctrl-card')).toBe(true);
  });
});

describe('createParamSlider', () => {
  it('should create slider with label and initial value', () => {
    const slider = createParamSlider('速度', { min: 0, max: 100, value: 50 });

    expect(slider.element.classList.contains('ctrl-param')).toBe(true);
    expect(slider.element.textContent).toContain('速度');
    expect(slider.getValue()).toBe(50);
  });

  it('should update value via setValue', () => {
    const slider = createParamSlider('角度', {
      min: 0,
      max: 90,
      value: 45,
      unit: '°'
    });

    slider.setValue(60);
    expect(slider.getValue()).toBe(60);
  });

  it('should call onChange when slider changes', () => {
    const onChange = vi.fn();
    const slider = createParamSlider('测试', { min: 0, max: 10, onChange });

    const input = slider.element.querySelector('input') as HTMLInputElement;
    input.value = '5';
    input.dispatchEvent(new Event('input'));

    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('should support compact mode', () => {
    const slider = createParamSlider('紧凑', {
      min: 0,
      max: 10,
      compact: true
    });

    expect(slider.element.style.display).toBe('grid');
  });
});

describe('createButtonGrid', () => {
  it('should create grid with buttons', () => {
    const grid = createButtonGrid([
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' }
    ]);

    expect(grid.element.classList.contains('ctrl-btn-grid')).toBe(true);
    expect(grid.element.children.length).toBe(2);
  });

  it('should set active button', () => {
    const grid = createButtonGrid([
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' }
    ]);

    grid.setActive('b');
    const buttons = grid.element.querySelectorAll('button');
    expect(buttons[1].classList.contains('active')).toBe(true);
    expect(buttons[0].classList.contains('active')).toBe(false);
  });

  it('should call onClick and onSelect when button clicked', () => {
    const onClick = vi.fn();
    const onSelect = vi.fn();
    const grid = createButtonGrid([{ label: 'Test', value: 'test', onClick }], {
      onSelect
    });

    const btn = grid.element.querySelector('button') as HTMLButtonElement;
    btn.click();

    expect(onClick).toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledWith('test');
  });

  it('should support custom column count', () => {
    const grid = createButtonGrid([{ label: 'A', value: 'a' }], { columns: 3 });

    expect(grid.element.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
  });
});

describe('createTransportControls', () => {
  it('should create transport control buttons', () => {
    const controls = createTransportControls({});

    expect(controls.element.classList.contains('ctrl-transport')).toBe(true);
    expect(controls.element.children.length).toBe(4);
  });

  it('should call onPlay when play button clicked', () => {
    const onPlay = vi.fn();
    const controls = createTransportControls({ onPlay });

    const buttons = controls.element.querySelectorAll('button');
    buttons[0].click();

    expect(onPlay).toHaveBeenCalled();
  });

  it('should call onReset when reset button clicked', () => {
    const onReset = vi.fn();
    const controls = createTransportControls({ onReset });

    const buttons = controls.element.querySelectorAll('button');
    buttons[2].click();

    expect(onReset).toHaveBeenCalled();
  });

  it('should toggle active state with setPlaying', () => {
    const controls = createTransportControls({});
    const buttons = controls.element.querySelectorAll('button');

    controls.setPlaying(true);
    expect(buttons[0].classList.contains('active')).toBe(true);
    expect(buttons[1].classList.contains('active')).toBe(false);

    controls.setPlaying(false);
    expect(buttons[0].classList.contains('active')).toBe(false);
    expect(buttons[1].classList.contains('active')).toBe(true);
  });
});

describe('createFloatingControls', () => {
  it('should create floating controls with play/pause and reset', () => {
    const controls = createFloatingControls({});

    expect(controls.classList.contains('stage-floating-controls')).toBe(true);
    expect(controls.querySelectorAll('button').length).toBe(2);
  });

  it('should call onTogglePlay when play button clicked', () => {
    const onTogglePlay = vi.fn();
    const controls = createFloatingControls({
      onTogglePlay,
      isPlaying: () => false
    });

    const playBtn = controls.querySelector('button') as HTMLButtonElement;
    playBtn.click();

    expect(onTogglePlay).toHaveBeenCalled();
    controls.dispose();
  });

  it('should call onReset when reset button clicked', () => {
    const onReset = vi.fn();
    const controls = createFloatingControls({ onReset });

    const buttons = controls.querySelectorAll('button');
    buttons[1].click();

    expect(onReset).toHaveBeenCalled();
    controls.dispose();
  });

  it('should update state via setState', () => {
    const controls = createFloatingControls({});
    const playBtn = controls.querySelector('button') as HTMLButtonElement;

    controls.setState({ isPlaying: true });
    expect(playBtn.textContent).toBe('⏸');

    controls.setState({ isPlaying: false });
    expect(playBtn.textContent).toBe('▶');
    controls.dispose();
  });

  it('should update speed via setState', () => {
    const controls = createFloatingControls({});

    controls.setState({ speed: 1.5 });
    const speedValue =
      controls.querySelectorAll('span')[
        controls.querySelectorAll('span').length - 1
      ];
    expect(speedValue.textContent).toBe('1.50×');
    controls.dispose();
  });

  it('should dispose without throwing', () => {
    const controls = createFloatingControls({});
    expect(() => controls.dispose()).not.toThrow();
  });

  it('should stop propagation on mousedown', () => {
    const controls = createFloatingControls({});
    const playBtn = controls.querySelector('button') as HTMLButtonElement;

    const event = new MouseEvent('mousedown', { bubbles: true });
    const stopPropagation = vi.spyOn(event, 'stopPropagation');
    playBtn.dispatchEvent(event);

    expect(stopPropagation).toHaveBeenCalled();
    controls.dispose();
  });
});
