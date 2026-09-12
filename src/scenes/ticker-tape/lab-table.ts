export type LabRowKey = 'x' | 'delta' | 'v';

export type LabTableModel = {
  labels: string[];
  xCm: Array<number | null>;
  deltaXCm: Array<number | null>;
  vMs: Array<number | null>;
  aMs2: number | null;
  showA: boolean;
};

export type LabTableHandle = {
  element: HTMLElement;
  setModel(model: LabTableModel): void;
  dispose(): void;
};

function styleCell(el: HTMLElement, header = false): void {
  el.style.padding = '0.2rem';
  el.style.textAlign = header ? 'left' : 'center';
  el.style.borderBottom = '1px solid var(--border-color)';
  el.style.whiteSpace = 'nowrap';
}

function styleInput(input: HTMLInputElement): void {
  input.style.cssText =
    'width:3rem;max-width:100%;box-sizing:border-box;background:var(--bg-input, transparent);color:inherit;border:1px solid var(--border-color);border-radius:4px;padding:0.2rem 0.12rem;text-align:center;font-size:0.9rem;';
}

export function createLabTable(
  onChange: (row: LabRowKey, index: number, value: number | null) => void
): LabTableHandle {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'overflow-x:auto;max-width:100%;';
  const style = document.createElement('style');
  style.textContent =
    '.ticker-tape-lab input[type=number]::-webkit-outer-spin-button,.ticker-tape-lab input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}' +
    '.ticker-tape-lab input[type=number]{-moz-appearance:textfield;appearance:textfield}' +
    '.ticker-tape-lab th:first-child,.ticker-tape-lab td:first-child{position:sticky;left:0;background:var(--bg-card);z-index:1}';
  wrap.appendChild(style);
  const table = document.createElement('table');
  table.className = 'ticker-tape-lab';
  table.setAttribute('aria-label', '纸带实验数据');
  table.style.cssText =
    'width:100%;border-collapse:collapse;font-size:0.9rem;color:var(--text-primary);';
  wrap.appendChild(table);

  let xInputs: HTMLInputElement[] = [];
  let deltaInputs: Array<HTMLInputElement | null> = [];
  let vInputs: HTMLInputElement[] = [];
  let aCell: HTMLTableCellElement | null = null;
  let builtCols = -1;
  let builtShowA = false;

  function bindNumber(
    input: HTMLInputElement,
    row: LabRowKey,
    index: number
  ): void {
    input.type = 'number';
    input.inputMode = 'decimal';
    input.addEventListener('change', () => {
      const n = parseFloat(input.value);
      onChange(row, index, Number.isFinite(n) ? n : null);
    });
  }

  function rebuild(model: LabTableModel): void {
    table.replaceChildren();
    const note = document.createElement('caption');
    note.textContent = '先填 x，再手算 Δx 与 v 后描点';
    note.style.captionSide = 'bottom';
    note.style.paddingTop = '0.35rem';
    note.style.color = 'var(--text-secondary)';
    note.style.textAlign = 'left';
    table.appendChild(note);
    xInputs = [];
    deltaInputs = [];
    vInputs = [];
    aCell = null;

    const thead = document.createElement('thead');
    const header = document.createElement('tr');
    const first = document.createElement('th');
    first.textContent = '';
    styleCell(first, true);
    header.appendChild(first);
    for (const label of model.labels) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      styleCell(th);
      header.appendChild(th);
    }
    thead.appendChild(header);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    const addInputRow = (
      label: string,
      values: Array<number | null>,
      row: LabRowKey,
      step: string,
      sink: Array<HTMLInputElement | null>,
      skipZero: boolean
    ) => {
      const tr = document.createElement('tr');
      const lab = document.createElement('th');
      lab.scope = 'row';
      lab.textContent = label;
      styleCell(lab, true);
      tr.appendChild(lab);
      values.forEach((val, i) => {
        const td = document.createElement('td');
        styleCell(td);
        if (skipZero && i === 0) {
          td.textContent = '';
          sink.push(null);
        } else {
          const input = document.createElement('input');
          input.step = step;
          input.setAttribute('aria-label', `计数点 ${i} 的 ${row}`);
          input.value = val === null ? '' : String(val);
          styleInput(input);
          bindNumber(input, row, i);
          sink.push(input);
          td.appendChild(input);
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    };

    addInputRow('x / cm', model.xCm, 'x', '0.01', xInputs, false);
    addInputRow('Δx / cm', model.deltaXCm, 'delta', '0.01', deltaInputs, true);
    addInputRow('v / (m/s)', model.vMs, 'v', '0.001', vInputs, false);

    if (model.showA) {
      const tr = document.createElement('tr');
      const lab = document.createElement('th');
      lab.scope = 'row';
      lab.textContent = 'a / (m/s²) 逐差';
      styleCell(lab, true);
      tr.appendChild(lab);
      const td = document.createElement('td');
      td.colSpan = model.labels.length;
      td.textContent = model.aMs2 === null ? '' : model.aMs2.toFixed(2);
      styleCell(td);
      aCell = td;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    builtCols = model.labels.length;
    builtShowA = model.showA;
  }

  function writeInput(
    input: HTMLInputElement | null | undefined,
    value: number | null
  ): void {
    if (!input || document.activeElement === input) return;
    const next = value === null ? '' : String(value);
    if (input.value !== next) input.value = next;
  }

  function update(model: LabTableModel): void {
    model.xCm.forEach((x, i) => writeInput(xInputs[i], x));
    model.deltaXCm.forEach((v, i) => writeInput(deltaInputs[i], v));
    model.vMs.forEach((v, i) => writeInput(vInputs[i], v));
    if (aCell) {
      aCell.textContent = model.aMs2 === null ? '' : model.aMs2.toFixed(2);
    }
  }

  function setModel(model: LabTableModel): void {
    if (builtCols !== model.labels.length || builtShowA !== model.showA) {
      rebuild(model);
      return;
    }
    update(model);
  }

  return {
    element: wrap,
    setModel,
    dispose() {
      table.replaceChildren();
      xInputs = [];
      deltaInputs = [];
      vInputs = [];
      aCell = null;
      builtCols = -1;
    }
  };
}
