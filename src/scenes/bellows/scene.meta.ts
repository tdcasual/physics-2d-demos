import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'lecture',
  readoutKeys: [
    'direction',
    'leftPressure',
    'rightPressure',
    'valveC',
    'valveD',
    'valveA',
    'valveB'
  ],
  renderHints: { contentScale: 1.2 },
  interactionHints: { touchTargetMinSize: 48, visibleControlKeys: ['motion'] }
};

export const bellowsMeta: SceneMeta = {
  id: 'bellows',
  title: '双动式风箱工作原理演示',
  path: '/src/pages/bellows.html',
  subject: '力学',
  concept: '大气压强的应用',
  subConcepts: ['压强差', '单向阀'],
  keywords: ['双动式风箱', '大气压强', '活塞', '单向阀', '气流'],
  objective: '观察活塞往复时气室压强和四个单向阀的交替联动',
  description: '切换活塞方向，观察压缩端排气、扩张端进气',
  difficulty: 2,
  icon: '↔️',
  category: 'mechanics',
  featured: false,
  defaultParams: { autoRun: 1, showFlow: 1 },
  urlSyncKeys: ['motion', 'autoRun', 'showFlow'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
