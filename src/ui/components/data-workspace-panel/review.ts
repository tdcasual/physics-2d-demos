import {
  getTrialField,
  trialLabel,
  type DataWorkspaceFieldSpec,
  type DataWorkspaceSession,
  type DataWorkspaceSpec,
  type FieldCheckState
} from '../../../platform/data-workspace';

function headerLabel(field: DataWorkspaceFieldSpec): string {
  return field.unit ? `${field.label} / ${field.unit}` : field.label;
}

function isFieldsOrientation(spec: DataWorkspaceSpec): boolean {
  return spec.tableOrientation === 'fields';
}

function isNaPlaceholder(field: FieldCheckState | undefined): boolean {
  return Boolean(field?.checked && field.raw === '—' && !field.stale);
}

function reviewText(field: FieldCheckState | undefined): string {
  if (isNaPlaceholder(field)) return '—';
  return field?.raw ?? '';
}

function appendHeadCell(row: HTMLTableRowElement, label: string): void {
  const th = document.createElement('th');
  th.scope = 'col';
  th.textContent = label;
  row.appendChild(th);
}

export function renderDataWorkspaceReview(
  container: HTMLElement,
  session: DataWorkspaceSession,
  spec: DataWorkspaceSpec
): void {
  container.replaceChildren();
  const table = document.createElement('table');
  table.className = 'data-workspace-table data-workspace-review-table';
  table.dataset.orientation = isFieldsOrientation(spec) ? 'fields' : 'trials';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  const tbody = document.createElement('tbody');

  if (isFieldsOrientation(spec)) {
    appendHeadCell(headRow, '');
    for (let i = 0; i < session.trials.length; i += 1) {
      appendHeadCell(headRow, trialLabel(spec, i));
    }
    for (const def of spec.rowFields) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = headerLabel(def);
      tr.appendChild(th);
      session.trials.forEach((trial, trialIndex) => {
        const td = document.createElement('td');
        td.dataset.field = def.id;
        td.dataset.trial = String(trialIndex);
        td.textContent = reviewText(getTrialField(trial, def.id));
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
  } else {
    const cols = ['组', ...spec.rowFields.map(headerLabel)];
    for (const label of cols) appendHeadCell(headRow, label);
    session.trials.forEach((trial, trialIndex) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = trialLabel(spec, trialIndex);
      tr.appendChild(th);
      for (const def of spec.rowFields) {
        const td = document.createElement('td');
        td.dataset.field = def.id;
        td.dataset.trial = String(trialIndex);
        td.textContent = reviewText(getTrialField(trial, def.id));
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
  }

  thead.appendChild(headRow);
  table.append(thead, tbody);
  container.appendChild(table);
}
