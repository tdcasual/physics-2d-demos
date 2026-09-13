import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'lecture',
  readoutKeys: ['m1', 'm2', 'r1', 'r2', 'omega'],
  renderHints: { contentScale: 1.25 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['m1', 'm2', 'distance']
  }
};

export const binaryStarsMeta: SceneMeta = {
  id: 'binary-stars',
  title: '双星系统运动轨道-万有引力定律与航天',
  path: '/src/pages/binary-stars.html',
  subject: '力学',
  concept: '双星系统',
  subConcepts: ['万有引力', '质心运动'],
  keywords: ['双星系统', '万有引力', '质心', '轨道半径', '角速度'],
  objective: '观察双星绕质心同周期运动，理解质量与轨道半径的反比关系',
  description: '调节质量与距离，观察双星轨道和受力',
  difficulty: 3,
  icon: '✦',
  category: 'mechanics',
  featured: false,
  defaultParams: { m1: 4, m2: 2, distance: 30, autoRun: 1, showVectors: 1 },
  urlSyncKeys: ['m1', 'm2', 'distance', 'autoRun', 'showVectors'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
