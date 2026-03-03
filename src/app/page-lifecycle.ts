export type PageDisposer = () => void;

export type PageLifecycle = {
  onDispose: (disposer: PageDisposer) => void;
  dispose: () => void;
};

export function createPageLifecycle(): PageLifecycle {
  const disposers: PageDisposer[] = [];
  let disposed = false;

  return {
    onDispose(disposer: PageDisposer): void {
      if (disposed) {
        disposer();
        return;
      }
      disposers.push(disposer);
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const disposer of disposers.splice(0)) {
        disposer();
      }
    }
  };
}
