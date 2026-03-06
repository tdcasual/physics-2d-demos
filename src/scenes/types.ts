export type SceneLifecycle = {
  init(container?: HTMLElement | null): void;
  reset(): void;
  step(dt: number): void;
  render(): void;
  dispose(): void;
};

export type ScenePlacardMeta = {
  subject: string;
  concept: string;
  subConcepts: [string, string];
};

export type SceneMeta = ScenePlacardMeta & {
  id: string;
  title: string;
  path: string;
  keywords: string[];
  objective: string;
  defaultParams: Record<string, number>;
};
