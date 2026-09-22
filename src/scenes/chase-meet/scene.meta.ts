/**
 * 追及相遇问题 — 两物体同向/相向运动的速度-时间关系
 */

import type { SceneMeta } from '../types';

import type { SceneDemoProfile } from '../../platform/demo-profile';

export const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: ['t', 'distance', 'meet'],
  renderHints: {
    contentScale: 1.8,
    fontScale: 2.0,
    strokeScale: 1.5
  },
  interactionHints: {
    touchTargetMinSize: 56,
    visibleControlKeys: ['preset']
  }
};

export const chaseMeetMeta: SceneMeta = {
  id: 'chase-meet',
  title: '追及相遇',
  path: '/src/pages/chase-meet.html',
  subject: '力学',
  concept: '运动关系',
  subConcepts: ['位移比较', '相遇条件'],
  keywords: ['力学', '追及相遇', '2D'],
  objective: '演示一维追及场景中位置与速度图像的联动关系',
  description: '速度的较量，相对运动的魅力，v-t图像实战',
  difficulty: 2,
  icon: '🏃',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'kinematics',
  featured: true,
  defaultParams: {
    totalTime: 10,
    dt: 0.02,
    x0A: 0,
    x0B: 10
  },
  testProfile: {
    hasGraph: true,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
