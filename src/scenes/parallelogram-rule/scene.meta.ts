import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: ['theory', 'measured', 'magnitude-error', 'angle-error'],
  renderHints: { contentScale: 1.3 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['stage', 'f1', 'f2', 'angle']
  }
};

export const parallelogramMeta: SceneMeta = {
  id: 'parallelogram-rule',
  title: '验证力的平行四边形定则',
  path: '/src/pages/parallelogram-rule.html',
  subject: '力学',
  concept: '力的合成',
  subConcepts: ['等效替代', '矢量作图'],
  keywords: ['平行四边形定则', '合力', '分力', '验证实验'],
  objective: '用作图与测量验证合力的平行四边形定则',
  description: '调节 F₁、F₂、夹角，逐步完成作图与定量对比',
  difficulty: 2,
  icon: '🧭',
  category: 'mechanics',
  featured: false,
  defaultParams: { f1: 1.8, f2: 1.8, angle: 90 },
  urlSyncKeys: ['f1', 'f2', 'angle', 'stage'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
