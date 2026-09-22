import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['accelerationA', 'accelerationB', 'upperForce', 'lowerForce'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['arrangement', 'massA', 'massB']
  }
};
export const connectedBodiesMeta: SceneMeta = {
  id: 'connected-bodies',
  title: '牛顿第二定律瞬时性与连接体',
  path: '/src/pages/connected-bodies.html',
  subject: '力学',
  concept: '连接体与瞬时性',
  subConcepts: ['剪断瞬间', '轻绳与轻弹簧'],
  keywords: ['牛顿第二定律', '连接体', '瞬时性', '张力'],
  objective: '比较剪断瞬间的力与加速度变化',
  description: '切换连接方式，观察 t = 0⁺ 的瞬时状态',
  difficulty: 3,
  icon: 'Σ',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'forces',
  featured: false,
  defaultParams: { massA: 2, massB: 1 },
  urlSyncKeys: ['arrangement', 'massA', 'massB', 'cut'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
