import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'derivation',
  transport: 'visible',
  readoutKeys: ['lambda', 'd-local', 'order'],
  renderHints: { contentScale: 1.5 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'profile',
      'lambda',
      'dTop',
      'dBottom',
      'n',
      'cursorY',
      'autoRun'
    ]
  }
};
export const wedgeFilmInterferenceMeta: SceneMeta = {
  id: 'wedge-film-interference',
  title: '薄膜干涉·劈尖',
  path: '/src/pages/wedge-film-interference.html',
  subject: '光学',
  concept: '劈尖薄膜干涉',
  subConcepts: ['厚度梯度', '半波损失'],
  keywords: ['薄膜干涉', '劈尖', '等厚条纹', '半波损失'],
  objective: '改变厚度梯度，观察干涉条纹疏密',
  description: '调波长与膜厚，读出局部光程差',
  difficulty: 2,
  icon: '∥',
  category: 'method',
  featured: false,
  defaultParams: {
    lambda: 550,
    dTop: 0,
    dBottom: 800,
    n: 1.5,
    cursorY: 50,
    autoRun: 1
  },
  urlSyncKeys: [
    'profile',
    'lambda',
    'dTop',
    'dBottom',
    'n',
    'cursorY',
    'autoRun'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
