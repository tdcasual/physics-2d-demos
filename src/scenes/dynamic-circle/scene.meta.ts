import type { SceneMeta } from '../types';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: ['tab', 'radius', 'boundary', 'critical', 'status'],
  renderHints: { contentScale: 1.45 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['tab', 'boundary', 'B', 'v', 'theta']
  }
};

export const dynamicCircleMeta: SceneMeta = {
  id: 'dynamic-circle',
  title: '动态圆·三法破临界',
  path: '/src/pages/dynamic-circle.html',
  subject: '电磁学',
  concept: '带电粒子在有界磁场中的运动',
  subConcepts: ['动态圆模型', '临界条件'],
  keywords: ['磁场', '洛伦兹力', '轨道半径', '临界'],
  objective: '改变磁场、速度与边界，观察轨道圆心和临界射出条件',
  description: '拖动边界或调节参数，比较三种动态圆模型',
  difficulty: 3,
  icon: '🧲',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'magnetic-field',
  featured: false,
  defaultParams: {
    B: 0.1,
    v: 11.5,
    theta: -90,
    y0: 330,
    xBound: 480,
    triX: 480,
    triH: 300,
    circleR: 120,
    circleX: 380,
    circleY: 330,
    autoSweep: 0,
    showCenter: 1
  },
  urlSyncKeys: ['tab', 'boundary'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
