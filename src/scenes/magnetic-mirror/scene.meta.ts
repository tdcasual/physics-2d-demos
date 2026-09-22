import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: [
    'position',
    'parallel-speed',
    'perpendicular-speed',
    'pitch-distance'
  ],
  renderHints: { contentScale: 1.15 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['mode', 'pitchAngle', 'mirrorRatio', 'autoRun']
  }
};

export const magneticMirrorMeta: SceneMeta = {
  id: 'magnetic-mirror',
  title: '磁镜与磁约束交互',
  path: '/src/pages/magnetic-mirror.html',
  subject: '电磁',
  concept: '带电粒子在非均匀磁场中的运动',
  subConcepts: ['磁镜约束', '速度分解'],
  keywords: ['磁镜', '磁约束', '洛伦兹力', '受控核聚变'],
  objective: '观察磁镜反射与逃逸锥',
  description: '两端强、中间弱的磁场约束带电粒子',
  difficulty: 3,
  icon: '🧲',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'magnetic-field',
  featured: false,
  defaultParams: {
    pitchAngle: 35,
    mirrorRatio: 6,
    mode: 0,
    autoRun: 1,
    showVelocity: 1,
    showField: 1,
    showForce: 0
  },
  urlSyncKeys: ['mode', 'pitchAngle', 'mirrorRatio', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
