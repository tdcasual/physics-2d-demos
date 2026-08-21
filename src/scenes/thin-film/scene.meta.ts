/**
 * 薄膜干涉 — 竖直肥皂膜模型
 */

import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  controlPanel: 'minimal',
  readoutPanel: 'overlay',
  graphPanel: 'visible',
  renderHints: {
    contentScale: 1.5
  },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['step', 'lambda', 'whiteLight']
  }
};

export const thinFilmMeta: SceneMeta = {
  id: 'thin-film',
  title: '薄膜干涉',
  path: '/src/pages/thin-film.html',
  subject: '光学',
  concept: '光的干涉',
  subConcepts: ['薄膜干涉', '半波损失'],
  keywords: ['光学', '薄膜干涉', '半波损失', '肥皂泡', '光程差', '厚度梯度'],
  objective: '理解薄膜反射干涉的原理及光程差公式',
  description: '竖直肥皂膜受重力影响上薄下厚，观察干涉条纹随厚度的变化',
  difficulty: 2,
  icon: '🫧',
  category: 'method',
  featured: false,
  defaultParams: {
    lambda: 550,
    dTop: 100,
    dBottom: 800,
    n: 1.33
  },
  urlSyncKeys: ['step'],
  testProfile: {
    hasGraph: true,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
