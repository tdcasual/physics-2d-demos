export type TransportState = {
  isPlaying: boolean;
};

export function createTransportState(): TransportState {
  return { isPlaying: false };
}

export function createSceneShell() {
  const transport = createTransportState();

  return {
    transport,
    play(): void {
      transport.isPlaying = true;
    },
    pause(): void {
      transport.isPlaying = false;
    },
    reset(): void {
      transport.isPlaying = false;
    },
    stepOnce(onStep: () => void): void {
      onStep();
    }
  };
}
