/**
 * 数据工作区删行确认框与焦点陷阱。
 * 从 createDataWorkspacePanel 抽出（债务计划 E2）。
 */

export type ConfirmDialogController = {
  confirmEl: HTMLElement;
  requestDelete(trialId: string, returnFocus: HTMLElement): void;
};

export function createConfirmDialog(options: {
  ac: AbortController;
  harvestDrafts(): void;
  removeTrial(trialId: string): void;
  onDeleted(): void;
}): ConfirmDialogController {
  const confirmEl = document.createElement('div');
  confirmEl.className = 'data-workspace-confirm';
  confirmEl.hidden = true;
  confirmEl.setAttribute('role', 'dialog');
  confirmEl.setAttribute('aria-label', '确认删除该组');
  confirmEl.setAttribute('aria-modal', 'true');
  const confirmText = document.createElement('p');
  confirmText.textContent = '该组已有数据，确定删除？';
  const confirmOk = document.createElement('button');
  confirmOk.type = 'button';
  confirmOk.className = 'data-workspace-check';
  confirmOk.textContent = '删除';
  const confirmCancel = document.createElement('button');
  confirmCancel.type = 'button';
  confirmCancel.className = 'data-workspace-exit';
  confirmCancel.textContent = '取消';
  confirmEl.append(confirmText, confirmCancel, confirmOk);
  let pendingDeleteId: string | null = null;
  let confirmReturnFocus: HTMLElement | null = null;

  function restoreConfirmFocus(): void {
    const target = confirmReturnFocus;
    confirmReturnFocus = null;
    if (target?.isConnected && !target.hasAttribute('disabled')) target.focus();
  }

  confirmCancel.addEventListener(
    'click',
    () => {
      pendingDeleteId = null;
      confirmEl.hidden = true;
      restoreConfirmFocus();
    },
    { signal: options.ac.signal }
  );
  confirmEl.addEventListener(
    'keydown',
    (event) => {
      if (confirmEl.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        pendingDeleteId = null;
        confirmEl.hidden = true;
        restoreConfirmFocus();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = [confirmCancel, confirmOk];
      const active = document.activeElement;
      if (event.shiftKey && active === items[0]) {
        event.preventDefault();
        items[1]?.focus();
      } else if (!event.shiftKey && active === items[1]) {
        event.preventDefault();
        items[0]?.focus();
      }
    },
    { signal: options.ac.signal }
  );
  confirmOk.addEventListener(
    'click',
    () => {
      if (!pendingDeleteId) return;
      options.harvestDrafts();
      options.removeTrial(pendingDeleteId);
      pendingDeleteId = null;
      confirmEl.hidden = true;
      restoreConfirmFocus();
      options.onDeleted();
    },
    { signal: options.ac.signal }
  );

  return {
    confirmEl,
    requestDelete(trialId, returnFocus) {
      pendingDeleteId = trialId;
      confirmReturnFocus = returnFocus;
      confirmEl.hidden = false;
      confirmCancel.focus();
    }
  };
}
