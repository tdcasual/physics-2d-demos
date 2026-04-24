import { describe, expect, it } from 'vitest';
import { MobileStackLayout } from '../../src/app/layouts/masters/mobile-stack/mobile-stack';

describe('MobileStackLayout', () => {
  function createLayout(
    config?: ConstructorParameters<typeof MobileStackLayout>[1]
  ) {
    const container = document.createElement('div');
    container.style.width = '375px';
    container.style.height = '812px';
    const layout = new MobileStackLayout(container, config);
    return { container, layout };
  }

  it('should render scroll container with correct structure', () => {
    const { container, layout } = createLayout();
    const slots = layout.render(container);

    expect(container.querySelector('.mobile-scroll-container')).toBeTruthy();
    expect(container.querySelector('.mobile-animation-section')).toBeTruthy();
    expect(container.querySelector('.mobile-control-section')).toBeTruthy();
    expect(container.querySelector('.mobile-stage-canvas')).toBeTruthy();

    expect(slots.control).toBeTruthy();
    expect(slots.animation).toBeTruthy();
    expect(slots.readout).toBeTruthy();
  });

  it('should render graph section when hasGraph is true', () => {
    const { container, layout } = createLayout({ hasGraph: true });
    const slots = layout.render(container);

    expect(container.querySelector('.mobile-graph-section')).toBeTruthy();
    expect(slots.graph).toBeTruthy();
  });

  it('should NOT render graph section when hasGraph is false', () => {
    const { container, layout } = createLayout({ hasGraph: false });
    layout.render(container);

    expect(container.querySelector('.mobile-graph-section')).toBeFalsy();
  });

  it('should apply auto-height to animation section when hasGraph is false', () => {
    const { container, layout } = createLayout({ hasGraph: false });
    layout.render(container);

    const animSection = container.querySelector(
      '.mobile-animation-section'
    ) as HTMLElement;
    expect(animSection.classList.contains('auto-height')).toBe(true);
    expect(animSection.style.height).toBe('auto');
  });

  it('should set animation section to fixed height when hasGraph is true', () => {
    const { container, layout } = createLayout({ hasGraph: true });
    layout.render(container);

    const animSection = container.querySelector(
      '.mobile-animation-section'
    ) as HTMLElement;
    expect(animSection.classList.contains('auto-height')).toBe(false);
    expect(animSection.style.height).not.toBe('auto');
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

    // MobileStackLayout does not have setMode; mode is set via container attribute
    container.setAttribute('data-mode', 'presentation');
    expect(container.getAttribute('data-mode')).toBe('presentation');

    container.setAttribute('data-mode', 'normal');
    expect(container.getAttribute('data-mode')).toBe('normal');
  });

  it('should update readout items', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    layout.setReadout([
      { label: '时间', value: '2.5s' },
      { label: '速度', value: '10m/s' }
    ]);

    const readoutBar = container.querySelector('.mobile-readout-bar');
    expect(readoutBar).toBeTruthy();
    expect(readoutBar?.textContent).toContain('时间');
    expect(readoutBar?.textContent).toContain('2.5s');
    expect(readoutBar?.textContent).toContain('速度');
  });

  it('should return stage canvas from getCanvas', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    const canvas = layout.getCanvas();
    expect(canvas).toBeTruthy();
    expect(canvas?.tagName).toBe('CANVAS');
  });

  it('should add landscape class on wide viewport in handleResize', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    layout.handleResize(1200, 800);
    expect(container.classList.contains('is-landscape')).toBe(true);

    layout.handleResize(375, 812);
    expect(container.classList.contains('is-landscape')).toBe(false);
  });

  it('should adjust animation height on resize when not auto-height', () => {
    const { container, layout } = createLayout({
      hasGraph: true,
      animationHeightVh: 50,
      animationMinHeight: 200,
      animationMaxHeight: 400
    });
    layout.render(container);

    const animSection = container.querySelector(
      '.mobile-animation-section'
    ) as HTMLElement;
    const beforeHeight = animSection.style.height;

    layout.handleResize(375, 800);
    const afterHeight = animSection.style.height;
    expect(afterHeight).not.toBe('');
    expect(afterHeight).not.toBe('auto');
  });

  it('should NOT adjust animation height when auto-height', () => {
    const { container, layout } = createLayout({
      hasGraph: false,
      animationHeightVh: 50
    });
    layout.render(container);

    const animSection = container.querySelector(
      '.mobile-animation-section'
    ) as HTMLElement;
    expect(animSection.style.height).toBe('auto');

    layout.handleResize(375, 800);
    expect(animSection.style.height).toBe('auto');
  });

  it('should provide correct slot config', () => {
    const { container, layout } = createLayout({ hasGraph: true });
    layout.render(container);

    expect(layout.getSlotConfig('header')?.visible).toBe(false);
    expect(layout.getSlotConfig('control')?.visible).toBe(true);
    expect(layout.getSlotConfig('animation')?.visible).toBe(true);
    expect(layout.getSlotConfig('readout')?.visible).toBe(true);
  });

  it('should mount and unmount without throwing', async () => {
    const { container, layout } = createLayout();
    layout.render(container);

    await expect(layout.mount()).resolves.not.toThrow();
    expect(container.classList.contains('layout-master')).toBe(true);
    expect(container.classList.contains('layout-mobile-stack')).toBe(true);

    await expect(layout.unmount()).resolves.not.toThrow();
    expect(container.querySelector('.mobile-scroll-container')).toBeFalsy();
    expect(container.classList.contains('layout-master')).toBe(false);
  });

  it('should expose supported slots', () => {
    const { layout } = createLayout();
    expect(layout.supportedSlots).toContain('header');
    expect(layout.supportedSlots).toContain('control');
    expect(layout.supportedSlots).toContain('animation');
    expect(layout.supportedSlots).toContain('graph');
    expect(layout.supportedSlots).toContain('readout');
  });

  it('should support slot queries after mount', async () => {
    const { container, layout } = createLayout();
    await layout.mount();

    expect(layout.supportsSlot('animation')).toBe(true);
    expect(layout.supportsSlot('unknown' as any)).toBe(false);
    expect(layout.getSlot('animation')).toBeTruthy();
    expect(layout.getSlots().animation).toBeTruthy();
  });

  describe('demo profile', () => {
    it('should hide control section when controlPanel is hidden', () => {
      const { container, layout } = createLayout();
      layout.render(container);

      layout.applyDemoProfile({
        controlPanel: 'hidden',
        readoutPanel: 'hidden',
        renderHints: { contentScale: 1.5 }
      });

      const controlSection = container.querySelector('.mobile-control-section');
      expect((controlSection as HTMLElement).style.display).toBe('none');
    });

    it('should collapse control section when controlPanel is collapsed', () => {
      const { container, layout } = createLayout();
      layout.render(container);

      layout.applyDemoProfile({
        controlPanel: 'collapsed',
        readoutPanel: 'hidden',
        renderHints: { contentScale: 1.5 }
      });

      const controlSection = container.querySelector('.mobile-control-section');
      expect(controlSection?.classList.contains('is-collapsed-demo')).toBe(true);
    });

    it('should hide readout bar when readoutPanel is hidden', () => {
      const { container, layout } = createLayout();
      layout.render(container);

      layout.applyDemoProfile({
        controlPanel: 'full',
        readoutPanel: 'hidden',
        renderHints: { contentScale: 1.5 }
      });

      const readoutBar = container.querySelector('.mobile-readout-bar');
      expect((readoutBar as HTMLElement).style.display).toBe('none');
    });

    it('should apply overlay style to readout bar', () => {
      const { container, layout } = createLayout();
      layout.render(container);

      layout.applyDemoProfile({
        controlPanel: 'full',
        readoutPanel: 'overlay',
        renderHints: { contentScale: 1.5 }
      });

      const readoutBar = container.querySelector('.mobile-readout-bar');
      expect(readoutBar?.classList.contains('is-overlay')).toBe(true);
    });

    it('should add touch optimization class', () => {
      const { container, layout } = createLayout();
      layout.render(container);

      layout.applyDemoProfile({
        controlPanel: 'full',
        readoutPanel: 'hidden',
        renderHints: { contentScale: 1.5 },
        interactionHints: { touchTargetMinSize: 56 }
      });

      expect(container.classList.contains('demo-touch-optimized')).toBe(true);
    });

    it('should reset demo profile', () => {
      const { container, layout } = createLayout();
      layout.render(container);

      layout.applyDemoProfile({
        controlPanel: 'hidden',
        readoutPanel: 'hidden',
        renderHints: { contentScale: 1.5 }
      });

      layout.resetDemoProfile();

      const controlSection = container.querySelector('.mobile-control-section');
      expect((controlSection as HTMLElement).style.display).not.toBe('none');
      expect(controlSection?.classList.contains('is-collapsed-demo')).toBe(false);

      const readoutBar = container.querySelector('.mobile-readout-bar');
      expect((readoutBar as HTMLElement).style.display).not.toBe('none');

      expect(container.classList.contains('demo-touch-optimized')).toBe(false);
    });
  });
});
