import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['potentialEnergy', 'kineticEnergy', 'height', 'velocity'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'theta2',
      'mu',
      'showVectors',
      'autoRun',
      'release',
      'reset'
    ]
  }
};

export const galileoInclineMeta: SceneMeta = {
  id: 'galileo-incline',
  title: '伽利略斜面理想实验',
  path: '/src/pages/galileo-incline.html',
  subject: '力学',
  concept: '牛顿第一定律与理想实验',
  subConcepts: ['能量转化', '控制变量法'],
  keywords: ['伽利略', '斜面', '理想实验', '惯性'],
  objective: '改变右侧斜面与摩擦，观察小球运动和能量',
  description: '斜面趋于水平且无摩擦时，小球保持匀速前进',
  difficulty: 3,
  icon: '↘',
  category: 'mechanics',
  featured: false,
  defaultParams: { theta2: 36, mu: 0, autoRun: 1, showVectors: 1 },
  urlSyncKeys: ['theta2', 'mu', 'autoRun', 'showVectors'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
