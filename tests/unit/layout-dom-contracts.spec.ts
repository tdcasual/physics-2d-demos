import { describe, expect, it } from 'vitest';
import {
  buildControlSection,
  buildGraphSection,
  buildResizer,
  buildToolbar
} from '../../src/app/layouts/_shared/split-helpers';
import { MobileStackLayout } from '../../src/app/layouts/layouts/mobile-stack/mobile-stack';
import { LabStageLayout } from '../../src/app/layouts/layouts/lab-stage/lab-stage';
import { createReadoutPanel } from '../../src/app/layouts/capabilities/readout-panel';
import type { CapabilityContext } from '../../src/app/layouts/types';
import { createFloatingControls } from '../../src/ui/floating-controls';
import { createStageDom } from '../../src/scenes/chase-meet/renderer/view-utils';

describe('layout DOM compatibility contracts', () => {
  function createCapabilityContext(container: HTMLElement): CapabilityContext {
    return {
      container,
      getTheme: () => 'light',
      setTheme() {},
      getMode: () => 'normal',
      setMode() {},
      switchLayout() {},
      getCurrentLayoutId: () => 'split-right',
      getAvailableLayouts: () => [],
      on: () => () => {}
    };
  }

  it('exposes stable unprefixed aliases for shell toolbar controls', () => {
    const { toolbar, sidebarBtn, modeBtn } = buildToolbar('teaching');

    expect(toolbar.classList.contains('teaching-stage-toolbar')).toBe(true);
    expect(toolbar.classList.contains('stage-toolbar')).toBe(true);
    expect(sidebarBtn.classList.contains('teaching-sidebar-toggle')).toBe(true);
    expect(sidebarBtn.classList.contains('sidebar-toggle')).toBe(true);
    expect(modeBtn.classList.contains('teaching-mode-toggle')).toBe(true);
    expect(modeBtn.classList.contains('mode-toggle')).toBe(true);
  });

  it('exposes a stable unprefixed alias for the control slot', () => {
    const { slot } = buildControlSection('teaching');

    expect(slot.classList.contains('teaching-control-slot')).toBe(true);
    expect(slot.classList.contains('control-slot')).toBe(true);
  });

  it('exposes stable unprefixed aliases for graph sections and resizers', () => {
    const { section, slot } = buildGraphSection('teaching');
    const title = section.querySelector('h2');
    const resizer = buildResizer(
      'teaching-panel-resizer',
      'vertical',
      '调整左侧面板宽度'
    );

    expect(section.classList.contains('graph-section')).toBe(true);
    expect(slot.classList.contains('graph-slot')).toBe(true);
    expect(title?.classList.contains('section-title')).toBe(true);
    expect(resizer.classList.contains('teaching-panel-resizer')).toBe(true);
    expect(resizer.classList.contains('panel-resizer')).toBe(true);
  });

  it('exposes stable unprefixed aliases for readout panels', () => {
    const animation = document.createElement('div');
    const control = document.createElement('div');
    const definition = createReadoutPanel({
      cssPrefix: 'teaching',
      collapsed: true
    });

    const instance = definition.mount(
      { animation, control },
      {},
      createCapabilityContext(animation)
    );

    expect(animation.querySelector('.teaching-readout-panel')).not.toBeNull();
    expect(animation.querySelector('.readout-panel')).not.toBeNull();
    expect(animation.querySelector('.teaching-readout-toggle')).not.toBeNull();
    expect(animation.querySelector('.readout-toggle')).not.toBeNull();

    instance.dispose();
  });

  it('exposes a stable control-slot alias in mobile stack layouts', async () => {
    const container = document.createElement('div');
    const layout = new MobileStackLayout(container);

    const slots = await layout.mount();

    expect(slots.control.classList.contains('mobile-control-slot')).toBe(true);
    expect(slots.control.classList.contains('control-slot')).toBe(true);

    await layout.unmount();
  });

  it('exposes a stable control-slot alias in lab-stage layouts', async () => {
    const container = document.createElement('div');
    const layout = new LabStageLayout(container);
    const slots = await layout.mount();

    expect(slots.control.classList.contains('lab-control-slot')).toBe(true);
    expect(slots.control.classList.contains('control-slot')).toBe(true);
    expect(slots.animation.querySelector('canvas')).toBeInstanceOf(
      HTMLCanvasElement
    );
    expect(container.classList.contains('teaching-demo')).toBe(true);
    expect(
      container
        .querySelector('.lab-control-section')
        ?.classList.contains('layout-left-panel')
    ).toBe(true);

    expect(
      container
        .querySelector('#lab-panel-data')
        ?.classList.contains('is-collapsed')
    ).toBe(false);
    const dataDisclosure = container.querySelector(
      '#lab-panel-data .lab-float-fold'
    );
    expect(dataDisclosure?.getAttribute('aria-controls')).toBe(
      'lab-panel-body-data'
    );
    expect(dataDisclosure?.getAttribute('aria-expanded')).toBe('true');
    container.dispatchEvent(
      new CustomEvent('layout:modechange', {
        detail: { mode: 'presentation' }
      })
    );
    expect(
      container
        .querySelector('#lab-panel-data')
        ?.classList.contains('is-collapsed')
    ).toBe(true);
    expect(dataDisclosure?.getAttribute('aria-expanded')).toBe('false');
    expect(
      container
        .querySelector('#lab-panel-graph')
        ?.classList.contains('is-collapsed')
    ).toBe(true);
    container.dispatchEvent(
      new CustomEvent('layout:modechange', { detail: { mode: 'normal' } })
    );
    expect(
      container
        .querySelector('#lab-panel-data')
        ?.classList.contains('is-collapsed')
    ).toBe(false);

    await layout.unmount();
  });

  it('exposes the legacy floating-control selector without changing buttons', () => {
    const controls = createFloatingControls({});

    expect(
      controls.classList.contains('teaching-stage-floating-controls')
    ).toBe(true);
    expect(controls.classList.contains('stage-floating-controls')).toBe(true);
    expect(controls.querySelectorAll('button')).toHaveLength(2);

    controls.dispose();
  });

  it('removes chase-meet layout placeholder canvas from canvas audits', () => {
    const slot = document.createElement('div');
    const layoutCanvas = document.createElement('canvas');
    slot.appendChild(layoutCanvas);

    createStageDom(slot);

    expect(slot.contains(layoutCanvas)).toBe(false);
    expect(slot.querySelectorAll('canvas')).toHaveLength(3);
  });
});
