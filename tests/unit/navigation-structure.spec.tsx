import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExperimentsSection } from '../../src/app/sections/ExperimentsSection';

describe('Navigation structure', () => {
  it('should render section header with correct labels', () => {
    render(<ExperimentsSection />);

    expect(screen.getByText('实践')).toBeTruthy();
    expect(screen.getByText('物理实验')).toBeTruthy();
    expect(screen.getByText('选择实验开始探索')).toBeTruthy();
  });

  it('should render all filter buttons', () => {
    render(<ExperimentsSection />);

    const filterBar = document.querySelector('.filter-bar');
    expect(filterBar).toBeTruthy();

    const filters = [
      '全部',
      '力学',
      '电磁学',
      '光学',
      '热学',
      '近代物理',
      '实验与方法'
    ];
    for (const label of filters) {
      // Use querySelector within filter-bar to avoid matching card categories
      const btn =
        filterBar!.querySelector(`button:contains('${label}')`) ??
        Array.from(filterBar!.querySelectorAll('button')).find(
          (b) => b.textContent === label
        );
      expect(btn).toBeTruthy();
    }
  });

  it('should render experiment cards', () => {
    render(<ExperimentsSection />);

    const grid = document.querySelector('.experiments-grid');
    expect(grid).toBeTruthy();
    expect(grid!.children.length).toBeGreaterThan(0);
  });

  it('should filter experiments when clicking filter buttons', () => {
    render(<ExperimentsSection />);

    const filterBar = document.querySelector('.filter-bar')!;
    const buttons = Array.from(filterBar.querySelectorAll('button'));
    const mechanicsBtn = buttons.find((b) => b.textContent === '力学')!;
    const allBtn = buttons.find((b) => b.textContent === '全部')!;

    fireEvent.click(mechanicsBtn);
    expect(mechanicsBtn.classList.contains('active')).toBe(true);

    fireEvent.click(allBtn);
    expect(allBtn.classList.contains('active')).toBe(true);
  });

  it('should render cards with correct structure', () => {
    render(<ExperimentsSection />);

    const cards = document.querySelectorAll('.experiment-card');
    expect(cards.length).toBeGreaterThan(0);

    // Verify card structure
    const firstCard = cards[0];
    expect(firstCard.querySelector('.card-meta')).toBeTruthy();
    expect(firstCard.querySelector('.card-content')).toBeTruthy();
    expect(firstCard.querySelector('.card-footer')).toBeTruthy();
    expect(firstCard.querySelector('.card-border')).toBeTruthy();
  });

  it('should render card numbers starting from 01', () => {
    render(<ExperimentsSection />);

    const cardNumbers = document.querySelectorAll('.card-number');
    expect(cardNumbers.length).toBeGreaterThan(0);
    expect(cardNumbers[0].textContent).toBe('01');
  });
});
