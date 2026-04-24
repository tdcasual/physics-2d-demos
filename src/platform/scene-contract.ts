/**
 * 场景契约定义
 * 这是 app 层和 scenes 层的共享契约，放置在 platform 层以避免循环依赖。
 */

export type ScenePlacardMeta = {
  subject: string;
  concept: string;
  subConcepts: [string, string];
};

import type { SceneDemoProfile } from '../app/demo-profile';

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
  /** 演示模式配置（可选，未配置则走旧逻辑） */
  demoProfile?: SceneDemoProfile;
};

export type SceneLifecycle = {
  init(container?: HTMLElement | null): void;
  reset(): void;
  step(dt: number): void;
  render(): void;
  dispose(): void;
};
