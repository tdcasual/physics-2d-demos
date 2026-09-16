import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: ['model', 'vBottom', 'vTop', 'speed', 'constraint', 'status'],
  renderHints: { contentScale: 1.2 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['model', 'vBottom', 'theta']
  }
};

export const verticalCircleMeta: SceneMeta = {
  id: 'vertical-circle',
  title: '竖直平面内圆周运动临界状态',
  path: '/src/pages/vertical-circle.html',
  subject: '力学',
  concept: '竖直平面内圆周运动临界',
  subConcepts: ['绳模型', '杆模型'],
  keywords: ['圆周运动', '临界速度', '向心力', '拉力', '绳模型', '杆模型'],
  objective: '切换绳、杆模型，观察最高点临界条件',
  description: '拖动小球或调节速度，比较两种模型的约束力',
  difficulty: 3,
  icon: '🎢',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    vBottom: 23.5,
    theta: -51,
    autoRun: 1,
    showVectors: 1,
    showPath: 1
  },
  urlSyncKeys: [
    'model',
    'vBottom',
    'theta',
    'autoRun',
    'showVectors',
    'showPath'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
