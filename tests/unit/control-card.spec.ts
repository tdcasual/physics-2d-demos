import { describe, expect, it } from 'vitest';
import { createControlCard } from '../../src/ui/components/ControlCard';

describe('createControlCard', () => {
  it('should render basic card with title', () => {
    const card = createControlCard('参数设置');
    expect(card.element.tagName).toBe('DIV');
    expect(card.header.textContent).toContain('参数设置');
    expect(card.body).toBeDefined();
  });

  it('should render with icon', () => {
    const card = createControlCard('参数设置', { icon: '⚡' });
    expect(card.header.textContent).toContain('⚡');
    expect(card.header.textContent).toContain('参数设置');
  });

  it('should apply className', () => {
    const card = createControlCard('标题', { className: 'my-card' });
    expect(card.element.classList.contains('my-card')).toBe(true);
  });

  it('should start collapsed when defaultCollapsed=true', () => {
    const card = createControlCard('标题', { defaultCollapsed: true });
    expect(card.element.classList.contains('collapsed')).toBe(true);
    expect(card.body.style.display).toBe('none');
  });

  it('should start expanded by default', () => {
    const card = createControlCard('标题');
    expect(card.element.classList.contains('collapsed')).toBe(false);
    expect(card.body.style.display).not.toBe('none');
  });

  it('should toggle collapse on toggle button click', () => {
    const card = createControlCard('标题');
    const toggle = card.header.querySelector('button');
    expect(toggle).toBeTruthy();

    toggle!.click();
    expect(card.element.classList.contains('collapsed')).toBe(true);
    expect(card.body.style.display).toBe('none');

    toggle!.click();
    expect(card.element.classList.contains('collapsed')).toBe(false);
    expect(card.body.style.display).not.toBe('none');
  });

  it('should not toggle when clicking header outside toggle button', () => {
    const card = createControlCard('标题');
    // Click on the header element itself, not the toggle button
    const clickEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(clickEvent, 'target', { value: card.header });
    card.header.dispatchEvent(clickEvent);

    expect(card.element.classList.contains('collapsed')).toBe(false);
  });

  it('should set collapsed programmatically', () => {
    const card = createControlCard('标题');
    card.setCollapsed(true);
    expect(card.element.classList.contains('collapsed')).toBe(true);
    expect(card.body.style.display).toBe('none');

    card.setCollapsed(false);
    expect(card.element.classList.contains('collapsed')).toBe(false);
    expect(card.body.style.display).not.toBe('none');
  });

  it('should render headerActions', () => {
    const btn = document.createElement('button');
    btn.textContent = 'Action';
    const card = createControlCard('标题', { headerActions: [btn] });
    expect(card.header.querySelector('button')?.textContent).toBe('Action');
  });

  it('should update aria-label on toggle', () => {
    const card = createControlCard('标题');
    const toggle = card.header.querySelector('button')!;
    expect(toggle.getAttribute('aria-label')).toBe('折叠');

    toggle.click();
    expect(toggle.getAttribute('aria-label')).toBe('展开');
  });

  it('should apply hover effects to header actions', () => {
    const btn = document.createElement('button');
    btn.textContent = 'Action';
    const card = createControlCard('标题', { headerActions: [btn] });
    const actionBtn = card.header.querySelector('button')!;

    // Simulate mouseenter
    actionBtn.dispatchEvent(new MouseEvent('mouseenter'));
    expect(actionBtn.style.filter).toBe('brightness(1.1)');

    // Simulate mouseleave
    actionBtn.dispatchEvent(new MouseEvent('mouseleave'));
    expect(actionBtn.style.filter).toBe('none');
  });

  it('should apply hover effects to toggle button', () => {
    const card = createControlCard('标题');
    const toggle = card.header.querySelectorAll('button');
    // Last button is the toggle
    const toggleBtn = toggle[toggle.length - 1];

    // Note: mouseleave may not update style in happy-dom; only verify mouseenter
    toggleBtn.dispatchEvent(new MouseEvent('mouseenter'));
    expect(toggleBtn.style.background).toContain('var(--border-light)');
  });

  it('should render correct toggle arrow for collapsed state', () => {
    const card = createControlCard('标题', { defaultCollapsed: true });
    const toggle = card.header.querySelector('button')!;
    expect(toggle.innerHTML).toBe('▶');
  });

  it('should render correct toggle arrow for expanded state', () => {
    const card = createControlCard('标题');
    const toggle = card.header.querySelector('button')!;
    expect(toggle.innerHTML).toBe('▼');
  });
});
