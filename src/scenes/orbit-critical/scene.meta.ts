import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['speed', 'normal', 'accel', 'critical', 'status'],
  renderHints: { contentScale: 1.03 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'model',
      'bottomSpeed',
      'radius',
      'gravity',
      'angle',
      'autoRun',
      'showVectors'
    ]
  }
};
export const orbitCriticalMeta: SceneMeta = {
  id: 'orbit-critical',
  title: '圆周运动不脱离轨道临界问题',
  path: '/src/pages/orbit-critical.html',
  subject: '力学',
  concept: '圆周运动临界问题',
  subConcepts: ['最高点临界速度', '约束力方向'],
  keywords: ['圆周运动', '脱轨', '临界速度', '支持力'],
  objective: '比较绳与杆模型在最高点的临界条件',
  description: '调节底速和半径，观察速度与约束力',
  difficulty: 3,
  icon: '◯',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    bottomSpeed: 4.2,
    radius: 1.5,
    gravity: 9.8,
    angle: -50,
    autoRun: 1,
    showVectors: 1
  },
  urlSyncKeys: [
    'model',
    'bottomSpeed',
    'radius',
    'gravity',
    'angle',
    'autoRun',
    'showVectors'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
