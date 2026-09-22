import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['status', 'radius', 'speed', 'acceleration', 'period'],
  renderHints: { contentScale: 1.05 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['orbit', 'progress', 'autoRun']
  }
};

export const satelliteMeta: SceneMeta = {
  id: 'satellite-transfer',
  title: '人造卫星变轨运动状态',
  path: '/src/pages/satellite-transfer.html',
  subject: '力学',
  concept: '万有引力与卫星运动',
  subConcepts: ['圆轨道速度', '变轨运动'],
  keywords: ['人造卫星', '变轨', '圆轨道', '万有引力'],
  objective: '比较不同轨道上的速度与向心加速度',
  description: '选择轨道并定位卫星，观察变轨前后的运动量',
  difficulty: 2,
  icon: '◌',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'gravity',
  featured: false,
  defaultParams: { progress: 72.7, autoRun: 1 },
  urlSyncKeys: ['orbit', 'progress', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
