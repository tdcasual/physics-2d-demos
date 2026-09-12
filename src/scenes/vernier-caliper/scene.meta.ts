/**
 * 游标卡尺 — 测量工具演示
 */

import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'instrument',
  renderHints: {
    contentScale: 1.5,
    fontScale: 1.2,
    revealAnswer: false
  },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['objectType', 'precision', 'reveal']
  }
};

export const vernierCaliperMeta: SceneMeta = {
  id: 'vernier-caliper',
  title: '游标卡尺',
  path: '/src/pages/vernier-caliper.html',
  subject: '方法',
  concept: '长度测量',
  subConcepts: ['游标卡尺', '读数方法'],
  keywords: ['游标卡尺', '长度测量', '读数', '仪器'],
  objective: '掌握游标卡尺的结构和读数方法',
  description: '通过模拟游标卡尺测量不同物体，理解游标读数原理',
  difficulty: 1,
  icon: '📏',
  category: 'method',
  featured: false,
  defaultParams: {
    precision: 0.02,
    objectType: 0
  },
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
