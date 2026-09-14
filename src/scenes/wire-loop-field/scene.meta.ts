import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['flux', 'emf', 'current', 'magneticForce'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'shape',
      'fieldStrength',
      'fieldDirection',
      'velocity',
      'resistance',
      'autoRun',
      'showCurrent',
      'reset'
    ]
  }
};

export const wireLoopFieldMeta: SceneMeta = {
  id: 'wire-loop-field',
  title: '线框穿过有界匀强磁场模型',
  path: '/src/pages/wire-loop-field.html',
  subject: '电磁',
  concept: '电磁感应定律',
  subConcepts: ['磁通量变化', '楞次定律'],
  keywords: ['线框', '有界磁场', '磁通量', '感应电动势', '楞次定律'],
  objective: '观察线框切入、切出磁场时的磁通量与感应量',
  description: '切换线框形状，联动观察 Φ、E、I',
  difficulty: 2,
  icon: '⊗',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    fieldStrength: 1,
    velocity: 2,
    resistance: 2,
    autoRun: 1,
    showCurrent: 1
  },
  urlSyncKeys: [
    'shape',
    'fieldStrength',
    'fieldDirection',
    'velocity',
    'resistance',
    'autoRun',
    'showCurrent'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
