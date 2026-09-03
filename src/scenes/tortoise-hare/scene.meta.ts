import type { SceneMeta } from '../types';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  controlPanel: 'collapsed',
  readoutPanel: 'docked-bottom',
  renderHints: { contentScale: 1.6 },
  interactionHints: { touchTargetMinSize: 48 }
};

export const tortoiseHareMeta: SceneMeta = {
  id: 'tortoise-hare',
  title: '龟兔赛跑',
  path: '/src/pages/tortoise-hare.html',
  subject: '力学',
  concept: '运动图像',
  subConcepts: ['x-t 图线对比', '相遇与追及'],
  keywords: ['力学', '运动学', 'x-t图像', '龟兔赛跑', '追及相遇'],
  objective: '通过两物体 x–t 图线的同图对比，理解相遇、追及与出发方式的关系',
  description: '乌龟与兔子的位置—时间图线同图联动：交点即相遇，水平段即停下',
  difficulty: 2,
  icon: '🐢',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    speed: 1
  },
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
