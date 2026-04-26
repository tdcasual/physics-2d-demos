import { describe, expect, it, beforeEach } from 'vitest';
import { SplitRightLayout } from '../../src/app/layouts/masters/split-right/split-right';
import type { SceneDemoProfile } from '../../src/app/demo-profile';

describe('SplitRightLayout demo profile', () => {
  let container: HTMLElement;
  let layout: SplitRightLayout;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '1920px';
    container.style.height = '1080px';
    layout = new SplitRightLayout(container);
    layout.render(container);
  });

  const baseProfile: SceneDemoProfile = {
    controlPanel: 'hidden',
    readoutPanel: 'docked-bottom',
    renderHints: { contentScale: 1.5 }
  };

  it('should hide sidebar when controlPanel is hidden', () => {
    layout.applyDemoProfile({ ...baseProfile, controlPanel: 'hidden' });

    const leftPanel = container.querySelector('.teaching-left-panel');
    expect(leftPanel).toBeTruthy();
    expect((leftPanel as HTMLElement).style.display).toBe('none');
    expect(container.style.gridTemplateColumns).toContain('0px');
  });

  it('should collapse control section when controlPanel is collapsed', () => {
    layout.applyDemoProfile({ ...baseProfile, controlPanel: 'collapsed' });

    const controlSection = container.querySelector('.teaching-control-section');
    expect(controlSection?.getAttribute('data-collapsed')).toBe('true');
  });

  it('should dock readout panel to bottom', () => {
    layout.applyDemoProfile({ ...baseProfile, readoutPanel: 'docked-bottom' });

    const readout = container.querySelector('.teaching-readout-panel');
    expect(readout?.classList.contains('teaching-is-docked-bottom')).toBe(true);
  });

  it('should dock readout panel to top', () => {
    layout.applyDemoProfile({ ...baseProfile, readoutPanel: 'docked-top' });

    const readout = container.querySelector('.teaching-readout-panel');
    expect(readout?.classList.contains('teaching-is-docked-top')).toBe(true);
  });

  it('should hide readout panel', () => {
    layout.applyDemoProfile({ ...baseProfile, readoutPanel: 'hidden' });

    const readout = container.querySelector('.teaching-readout-panel') as HTMLElement;
    expect(readout.style.display).toBe('none');
  });

  it('should overlay readout panel and enlarge font', () => {
    layout.applyDemoProfile({ ...baseProfile, readoutPanel: 'overlay' });

    const readout = container.querySelector('.teaching-readout-panel');
    expect(readout?.classList.contains('teaching-is-overlay')).toBe(true);
    expect(readout?.classList.contains('teaching-readout-enlarged')).toBe(true);
  });

  it('should add touch optimization class when touchTargetMinSize provided', () => {
    layout.applyDemoProfile({
      ...baseProfile,
      interactionHints: { touchTargetMinSize: 56 }
    });

    expect(container.classList.contains('teaching-demo-touch-optimized')).toBe(true);
    expect(container.style.getPropertyValue('--demo-touch-min')).toBe('56px');
  });

  it('should reset demo profile back to standard layout', () => {
    layout.applyDemoProfile(baseProfile);
    layout.resetDemoProfile();

    const leftPanel = container.querySelector('.teaching-left-panel');
    expect((leftPanel as HTMLElement).style.display).not.toBe('none');

    const readout = container.querySelector('.teaching-readout-panel');
    expect(readout?.classList.contains('teaching-is-docked-bottom')).toBe(false);
    expect(readout?.classList.contains('teaching-readout-enlarged')).toBe(false);

    expect(container.classList.contains('teaching-demo-touch-optimized')).toBe(false);
  });

  it('should setMode update button text', () => {
    layout.setMode('presentation');
    const modeButton = container.querySelector('.teaching-mode-toggle');
    expect(modeButton?.textContent).toBe('标准');

    layout.setMode('normal');
    expect(modeButton?.textContent).toBe('演示');
  });
});
