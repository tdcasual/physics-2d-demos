/**
 * Scene-host workspace chrome/step state.
 *
 * Session `active` still lives on DataWorkspaceHost. This object stores the
 * view-step and whether chrome should be visible after presentation ends.
 */

export type WorkspaceStep = 'data' | 'chartAnalysis';

export type WorkspaceUiSnapshot = {
  step: WorkspaceStep;
  chromeVisible: boolean;
  presentationSuspension: boolean;
};

export function normalizeWorkspaceStep(step: unknown): WorkspaceStep {
  return step === 'chartAnalysis' ? 'chartAnalysis' : 'data';
}

export class WorkspaceUiState {
  private step: WorkspaceStep = 'data';
  private chromeVisible = false;
  private presentationSuspension = false;
  private readonly listeners = new Set<() => void>();

  getStep(): WorkspaceStep {
    return this.step;
  }

  setStep(step: unknown): void {
    const next = normalizeWorkspaceStep(step);
    if (this.step === next) return;
    this.step = next;
    this.notify();
  }

  getChromeVisible(): boolean {
    return this.chromeVisible;
  }

  setChromeVisible(visible: boolean): void {
    if (this.chromeVisible === visible) return;
    this.chromeVisible = visible;
    this.notify();
  }

  getPresentationSuspension(): boolean {
    return this.presentationSuspension;
  }

  setPresentationSuspension(suspended: boolean): void {
    if (this.presentationSuspension === suspended) return;
    this.presentationSuspension = suspended;
    this.notify();
  }

  snapshot(): WorkspaceUiSnapshot {
    return {
      step: this.step,
      chromeVisible: this.chromeVisible,
      presentationSuspension: this.presentationSuspension
    };
  }

  restore(snapshot: WorkspaceUiSnapshot): void {
    this.step = normalizeWorkspaceStep(snapshot.step);
    this.chromeVisible = snapshot.chromeVisible;
    this.presentationSuspension = snapshot.presentationSuspension;
    this.notify();
  }

  resetForNewScene(): void {
    this.step = 'data';
    this.chromeVisible = false;
    this.presentationSuspension = false;
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}
