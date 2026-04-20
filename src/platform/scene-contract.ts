/**
 * 场景契约定义
 * 这是 app 层和 scenes 层的共享契约，放置在 platform 层以避免循环依赖。
 */

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
  description?: string;
  difficulty?: 1 | 2 | 3;
  icon?: string;
  category?: 'mechanics' | 'electromagnetism' | 'method';
  featured?: boolean;
};

export type SceneLifecycle = {
  init(container?: HTMLElement | null): void;
  reset(): void;
  step(dt: number): void;
  render(): void;
  dispose(): void;
};
