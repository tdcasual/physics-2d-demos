import { describe, expect, it } from 'vitest';
import {
  normalizeWorkspaceStep,
  WorkspaceUiState
} from '../../src/app/layouts/workspace-ui-state';

describe('WorkspaceUiState', () => {
  it('normalizes unknown steps to data', () => {
    expect(normalizeWorkspaceStep('chartAnalysis')).toBe('chartAnalysis');
    expect(normalizeWorkspaceStep('nope')).toBe('data');
    expect(normalizeWorkspaceStep(undefined)).toBe('data');
  });

  it('preserves step and chrome visibility across restore', () => {
    const ui = new WorkspaceUiState();
    ui.setStep('chartAnalysis');
    ui.setChromeVisible(true);
    ui.setPresentationSuspension(true);
    const snap = ui.snapshot();
    ui.resetForNewScene();
    expect(ui.getStep()).toBe('data');
    ui.restore(snap);
    expect(ui.getStep()).toBe('chartAnalysis');
    expect(ui.getChromeVisible()).toBe(true);
    expect(ui.getPresentationSuspension()).toBe(true);
  });
});
