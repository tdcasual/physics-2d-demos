import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ExperimentsSection } from '../../src/app/sections/ExperimentsSection';

afterEach(() => cleanup());

describe('Navigation structure', () => {
  it('should render section header with correct labels', () => {
    render(<ExperimentsSection />);

    expect(screen.getByText('实践')).toBeTruthy();
    expect(screen.getByText('物理实验')).toBeTruthy();
    expect(screen.getByText(/按课程章节浏览/)).toBeTruthy();
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
    expect(allBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('should search by title and keep the query in the URL', () => {
    window.history.replaceState({}, '', '/');
    render(<ExperimentsSection />);

    const search = screen.getByRole('searchbox', { name: '搜索实验' });
    fireEvent.change(search, { target: { value: '抛体' } });

    expect(
      document.querySelectorAll('.experiment-card').length
    ).toBeGreaterThan(0);
    expect(document.querySelector('.directory-status')?.textContent).toContain(
      '搜索“抛体”'
    );
    expect(window.location.search).toContain('q=%E6%8A%9B%E4%BD%93');
  });

  it('preserves a valid chapter-only URL on initial load and rerender', () => {
    window.history.replaceState({}, '', '/?chapter=kinematics');
    const { rerender } = render(<ExperimentsSection />);

    const chapter = screen.getByRole('combobox', {
      name: '按课程章节筛选'
    }) as HTMLSelectElement;
    expect(chapter.value).toBe('kinematics');
    expect(window.location.search).toContain('chapter=kinematics');
    expect(
      document.querySelectorAll('.experiment-card').length
    ).toBeGreaterThan(0);

    rerender(<ExperimentsSection />);
    expect(chapter.value).toBe('kinematics');
    expect(window.location.search).toContain('chapter=kinematics');
  });

  it('should initialize the domain filter from the URL', () => {
    window.history.replaceState({}, '', '/?domain=optics');
    render(<ExperimentsSection />);

    const opticsButton = screen.getByRole('button', { name: '光学' });
    expect(opticsButton.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('.directory-status')?.textContent).toContain(
      '个实验'
    );
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
