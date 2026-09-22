import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['radiusRatio', 'status', 'focusError'],
  renderHints: { contentScale: 1.04 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'mode',
      'radiusRatio',
      'particleCount',
      'emit',
      'clear'
    ]
  }
};

export const magneticConvergenceMeta: SceneMeta = {
  id: 'magnetic-convergence',
  title: '磁会聚与磁发散模型',
  path: '/src/pages/magnetic-convergence.html',
  subject: '电磁学',
  concept: '带电粒子在边界磁场中的运动',
  subConcepts: ['磁会聚', '磁发散'],
  keywords: ['匀强磁场', '洛伦兹力', '轨道半径', '粒子束'],
  objective: '比较 r / R 对粒子束会聚与发散的影响',
  description: '调节 r / R，观察粒子轨迹控制效果',
  difficulty: 2,
  icon: '✣',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'magnetic-field',
  featured: false,
  defaultParams: {
    radiusRatio: 1,
    particleCount: 7,
    mode: 0,
    autoRun: 1,
    showField: 1
  },
  urlSyncKeys: ['radiusRatio', 'particleCount', 'mode', 'autoRun', 'showField'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
