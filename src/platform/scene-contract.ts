/**
 * 场景契约定义
 * 这是 app 层和 scenes 层的共享契约，放置在 platform 层以避免循环依赖。
 */

/** 场景展示元数据（用于生成标题卡片） */
export type ScenePlacardMeta = {
  subject: string;
  concept: string;
  subConcepts: [string, string];
};

import type { SceneDemoProfile } from './demo-profile';

/** Test capabilities declared by the scene, independent of any layout. */
export type SceneTestProfile = {
  hasGraph: boolean;
  hasTransport: boolean;
  supportsPresentation: boolean;
};

/** 场景完整元数据（注册表使用） */
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
  /** 额外允许通过 URL query string 同步的参数（不在 defaultParams 中） */
  urlSyncKeys?: string[];
  /** 演示模式配置（可选，未配置则走旧逻辑） */
  demoProfile?: SceneDemoProfile;
  /** 场景测试能力；真实场景由契约测试强制声明。 */
  testProfile?: SceneTestProfile;
};

/** 场景生命周期接口 */
export type SceneLifecycle = {
  init(container?: HTMLElement | null): void;
  reset(): void;
  step(dt: number): void;
  render(): void;
  dispose(): void;
};
