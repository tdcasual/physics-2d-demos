import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['screenOffsetMm', 'exitSpeed', 'exitAngleDeg', 'status'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'particle',
      'accelVoltage',
      'deflectVoltage',
      'slowMode',
      'showVectors',
      'autoRun',
      'relaunch',
      'reset'
    ]
  }
};

export const chargedSuperpositionMeta: SceneMeta = {
  id: 'charged-superposition',
  title: '带电粒子加速与偏转叠加实验',
  path: '/src/pages/charged-superposition.html',
  subject: '电磁',
  concept: '带电粒子在电场中的加速与偏转',
  subConcepts: ['类平抛运动', '反向延长线定理'],
  keywords: ['带电粒子', '加速电压', '偏转电压', '叠加场'],
  objective: '调节电压，观察粒子轨迹与打屏偏移',
  description: '反向延长线交于偏转板中心',
  difficulty: 3,
  icon: 'qE',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    particle: 0,
    accelVoltage: 200,
    deflectVoltage: 30,
    autoRun: 1,
    slowMode: 0,
    showVectors: 1
  },
  urlSyncKeys: [
    'particle',
    'accelVoltage',
    'deflectVoltage',
    'autoRun',
    'slowMode',
    'showVectors'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
