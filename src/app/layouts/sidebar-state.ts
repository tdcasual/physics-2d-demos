/**
 * Canonical sidebar visibility owner.
 *
 * User preference and presentation suppression are stored separately.
 * `dataset.sidebarHidden` is a consumer-only projection written here.
 */

export type SidebarSnapshot = {
  userHidden: boolean;
  presentationSuppressed: boolean;
};

export class SidebarStateOwner {
  private userHidden = false;
  private presentationSuppressed = false;
  private readonly listeners = new Set<() => void>();

  getUserHidden(): boolean {
    return this.userHidden;
  }

  getPresentationSuppressed(): boolean {
    return this.presentationSuppressed;
  }

  getEffectiveHidden(): boolean {
    return this.userHidden || this.presentationSuppressed;
  }

  setUserHidden(hidden: boolean): void {
    if (this.userHidden === hidden) return;
    this.userHidden = hidden;
    this.notify();
  }

  setPresentationSuppressed(suppressed: boolean): void {
    if (this.presentationSuppressed === suppressed) return;
    this.presentationSuppressed = suppressed;
    this.notify();
  }

  snapshot(): SidebarSnapshot {
    return {
      userHidden: this.userHidden,
      presentationSuppressed: this.presentationSuppressed
    };
  }

  restore(snapshot: SidebarSnapshot): void {
    this.userHidden = snapshot.userHidden;
    this.presentationSuppressed = snapshot.presentationSuppressed;
    this.notify();
  }

  resetForNewScene(): void {
    this.userHidden = false;
    this.presentationSuppressed = false;
    this.notify();
  }

  /**
   * Write the consumer-only dataset projection. Layout resize helpers may
   * read this attribute; they must not treat it as a user-state writer.
   */
  project(container: HTMLElement): void {
    container.dataset.sidebarHidden = this.getEffectiveHidden()
      ? 'true'
      : 'false';
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
