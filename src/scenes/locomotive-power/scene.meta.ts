import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['velocity', 'accelerationNow', 'tractionForce', 'actualPower'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'mode',
      'ratedPower',
      'acceleration',
      'dragForce',
      'autoRun',
      'reset'
    ]
  }
};
export const locomotiveMeta: SceneMeta = {
  id: 'locomotive-power',
  title: '机车恒功率启动动力学分析',
  path: '/src/pages/locomotive-power.html',
  subject: '力学',
  concept: '功率与牵引力',
  subConcepts: ['恒功率启动', 'v-t 图象'],
  keywords: ['机车启动', '恒功率', '牵引力', '加速度', 'v-t'],
  objective: '观察恒功率下速度、牵引力与加速度的联动',
  description: '对比恒功率与恒加速度启动',
  difficulty: 2,
  icon: 'P',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    ratedPower: 18,
    acceleration: 1,
    dragForce: 1200,
    autoRun: 1
  },
  urlSyncKeys: ['mode', 'ratedPower', 'acceleration', 'dragForce', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
