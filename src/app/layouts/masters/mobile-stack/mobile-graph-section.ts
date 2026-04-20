export class GraphSectionManager {
  readonly section: HTMLElement;
  private toggle: HTMLElement;
  readonly slot: HTMLElement;
  private expanded = false;
  private eventCleanups: (() => void)[] = [];
  private onToggle?: (expanded: boolean) => void;

  constructor(
    parent: HTMLElement,
    title: string,
    initialExpanded: boolean,
    onToggle?: (expanded: boolean) => void
  ) {
    this.expanded = initialExpanded;
    this.onToggle = onToggle;

    this.section = document.createElement('div');
    this.section.className = 'mobile-graph-section';
    if (this.expanded) this.section.classList.add('is-expanded');
    this.section.setAttribute('role', 'region');
    this.section.setAttribute('aria-label', title || '图表区域');

    this.toggle = document.createElement('div');
    this.toggle.className = 'mobile-section-toggle';
    this.toggle.setAttribute('role', 'button');
    this.toggle.setAttribute('aria-expanded', String(this.expanded));
    this.toggle.setAttribute('aria-controls', 'mobile-graph-content');
    this.toggle.setAttribute('tabindex', '0');
    this._updateToggleHtml(title);

    this.toggle.addEventListener('click', () => this.toggleExpanded());
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleExpanded();
      }
    };
    this.toggle.addEventListener('keydown', keyHandler);
    this.eventCleanups.push(() =>
      this.toggle.removeEventListener('keydown', keyHandler)
    );

    this.section.appendChild(this.toggle);

    this.slot = document.createElement('div');
    this.slot.className = 'mobile-graph-slot';
    this.slot.id = 'mobile-graph-content';
    this.slot.setAttribute('role', 'region');
    this.section.appendChild(this.slot);

    parent.appendChild(this.section);
  }

  private _updateToggleHtml(title: string): void {
    this.toggle.innerHTML = `
      <span class="toggle-title">${title || '📈 数据图表'}</span>
      <span class="toggle-icon" aria-hidden="true">${this.expanded ? '▼' : '▶'}</span>
    `;
  }

  toggleExpanded(): void {
    this.expanded = !this.expanded;
    this.section.classList.toggle('is-expanded', this.expanded);
    this.toggle.setAttribute('aria-expanded', String(this.expanded));
    const icon = this.toggle.querySelector('.toggle-icon');
    if (icon) icon.textContent = this.expanded ? '▼' : '▶';
    this.onToggle?.(this.expanded);
  }

  isExpanded(): boolean {
    return this.expanded;
  }

  destroy(): void {
    this.eventCleanups.forEach((c) => c());
    this.eventCleanups = [];
    this.section.remove();
  }
}
