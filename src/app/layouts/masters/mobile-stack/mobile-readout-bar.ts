export interface ReadoutItem {
  label: string;
  value: string | number;
}

export class ReadoutBarManager {
  readonly bar: HTMLElement;

  constructor(parent: HTMLElement, title: string) {
    this.bar = document.createElement('div');
    this.bar.className = 'mobile-readout-bar';
    this.bar.setAttribute('role', 'region');
    this.bar.setAttribute('aria-label', title || '数据读数');
    parent.appendChild(this.bar);
  }

  setItems(items: ReadoutItem[], maxItems: number): void {
    this.bar.innerHTML = items
      .slice(0, maxItems)
      .map(
        (item) => `
      <div class="mobile-readout-item">
        <span class="readout-label">${item.label}</span>
        <span class="readout-value">${item.value}</span>
      </div>
    `
      )
      .join('');
  }

  destroy(): void {
    this.bar.remove();
  }
}
