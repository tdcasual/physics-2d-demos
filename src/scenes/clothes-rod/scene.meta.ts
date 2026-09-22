import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['thetaLeft', 'thetaRight', 'tensionLeft', 'tensionRight'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['model', 'distance', 'length', 'height', 'weight']
  }
};
export const clothesRodMeta: SceneMeta = {
  id: 'clothes-rod',
  title: '晾衣杆模型',
  path: '/src/pages/clothes-rod.html',
  subject: '力学',
  concept: '共点力平衡',
  subConcepts: ['活结等张力', '几何与张力'],
  keywords: ['晾衣杆', '张力', '力矩', '平衡'],
  objective: '观察几何参数对绳张力的影响',
  description: '调节 d、L 和重物，比较两种结点模型',
  difficulty: 2,
  icon: 'T',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'forces',
  featured: false,
  defaultParams: { distance: 6, length: 10, height: 0.8, weight: 40 },
  urlSyncKeys: ['model', 'distance', 'length', 'height', 'weight'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
