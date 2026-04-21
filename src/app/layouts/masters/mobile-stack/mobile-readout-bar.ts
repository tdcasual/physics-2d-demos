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
    this.bar.replaceChildren();
    items.slice(0, maxItems).forEach((item) => {
      const div = document.createElement('div');
      div.className = 'mobile-readout-item';
      const label = document.createElement('span');
      label.className = 'readout-label';
      label.textContent = item.label;
      const value = document.createElement('span');
      value.className = 'readout-value';
      value.textContent = String(item.value);
      div.append(label, value);
      this.bar.appendChild(div);
    });
  }

  destroy(): void {
    this.bar.remove();
  }
}
