import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['stage', 'velocity', 'acceleration'],
  renderHints: { contentScale: 1.05 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['preset', 'releaseHeight', 'mode', 'autoRun', 'slow']
  }
};

export const springBallMeta: SceneMeta = {
  id: 'spring-ball',
  title: '小球落到竖直弹簧与简谐运动',
  path: '/src/pages/spring-ball.html',
  subject: '力学',
  concept: '竖直弹簧与简谐运动',
  subConcepts: ['平衡位置', '最低点对称性'],
  keywords: ['竖直弹簧', '简谐运动', '平衡位置', '最低点', '对称点'],
  objective: '观察小球接触弹簧后的简谐运动，验证最低点的对称关系',
  description: '改变释放高度，比较自由落体、压缩、回弹和最低点加速度',
  difficulty: 3,
  icon: '🌀',
  category: 'mechanics',
  featured: false,
  defaultParams: { releaseHeight: 0, mode: 0, preset: 0, autoRun: 1, slow: 0 },
  urlSyncKeys: ['releaseHeight', 'mode', 'preset', 'autoRun', 'slow'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
