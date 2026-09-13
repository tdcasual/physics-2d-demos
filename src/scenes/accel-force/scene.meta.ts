import type { SceneMeta } from '../types';
import type { SceneDemoProfile } from '../../platform/demo-profile';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: ['force', 'acceleration', 'velocity', 'status'],
  renderHints: { contentScale: 1.15 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['mode', 'cartMass', 'hangerMass', 'balanced']
  }
};
export const accelForceMeta: SceneMeta = {
  id: 'accel-force',
  title: '探究加速度与力质量关系实验',
  path: '/src/pages/accel-force.html',
  subject: '力学',
  concept: '牛顿第二定律探究实验',
  subConcepts: ['控制变量法', '纸带逐差法'],
  keywords: ['加速度', '力', '质量', '实验'],
  objective: '改变力或质量，观察加速度关系',
  description: '小车—槽码实验装置与 a—F、a—1/M 数据图',
  difficulty: 3,
  icon: '🛒',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    mode: 0,
    cartMass: 0.4,
    hangerMass: 0.03,
    balanced: 1,
    autoRun: 1
  },
  urlSyncKeys: ['mode', 'cartMass', 'hangerMass', 'balanced', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
