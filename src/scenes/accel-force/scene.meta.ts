import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
import { accelForceConstants as C } from './scene.sim';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: [
    'force',
    'accelTheory',
    'accelTape',
    'velocity',
    'time',
    'status'
  ],
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
  keywords: ['加速度', '力', '质量', '控制变量', '打点计时器', '牛顿第二定律'],
  objective: '保持 M 或 F 不变，记录 a–F 与 a–1/M，检验牛顿第二定律',
  description: '小车—斜轨—定滑轮—槽码，平衡摩擦后探究 a 与 F、1/M 的关系',
  difficulty: 3,
  icon: '🛒',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'forces',
  featured: false,
  defaultParams: {
    cartMass: C.cartDefault,
    hangerMass: C.hangerDefault,
    balanced: 1,
    autoRun: 1
  },
  urlSyncKeys: ['mode', 'cartMass', 'hangerMass', 'balanced', 'autoRun'],
  testProfile: {
    hasGraph: true,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
