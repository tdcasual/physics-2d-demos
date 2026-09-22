import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['centripetalForce', 'tension', 'period', 'linearSpeed'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['height', 'theta', 'showVectors', 'autoRun', 'reset']
  }
};

export const conicalPendulumMeta: SceneMeta = {
  id: 'conical-pendulum',
  title: '圆锥摆核心模型探究',
  path: '/src/pages/conical-pendulum.html',
  subject: '力学',
  concept: '圆锥摆与匀速圆周运动',
  subConcepts: ['向心力来源', '周期与悬点高度'],
  keywords: ['圆锥摆', '向心力', '绳子拉力', '周期'],
  objective: '调节高度和摆角，观察圆锥摆受力与周期',
  description: '重力恒定，拉力水平分量提供向心力',
  difficulty: 3,
  icon: '↻',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'forces',
  featured: false,
  defaultParams: { height: 3, theta: 57, autoRun: 1, showVectors: 1 },
  urlSyncKeys: ['height', 'theta', 'autoRun', 'showVectors'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
