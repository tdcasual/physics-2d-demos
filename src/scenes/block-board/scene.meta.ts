import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: [
    'block-velocity',
    'board-velocity',
    'relative-displacement',
    'sync-time'
  ],
  renderHints: { contentScale: 1.1 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'blockMass',
      'boardMass',
      'initialVelocity',
      'friction',
      'autoRun'
    ]
  }
};

export const blockBoardMeta: SceneMeta = {
  id: 'block-board',
  title: '木块与木板相对滑动物理模型',
  path: '/src/pages/block-board.html',
  subject: '力学',
  concept: '板块模型与相对运动',
  subConcepts: ['滑动摩擦', '共速与相对位移'],
  keywords: ['木块', '木板', '摩擦力', '相对位移', '共速'],
  objective: '观察摩擦力如何让木块与木板达到共速',
  description: '同步显示板块运动、v-t 图像和相对位移',
  difficulty: 3,
  icon: '🧱',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    blockMass: 2,
    boardMass: 2,
    initialVelocity: 6,
    friction: 0.2,
    autoRun: 1,
    showArea: 1,
    showForces: 0
  },
  urlSyncKeys: [
    'blockMass',
    'boardMass',
    'initialVelocity',
    'friction',
    'autoRun',
    'showArea',
    'showForces'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
