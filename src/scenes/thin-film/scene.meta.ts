/**
 * 薄膜干涉 — 竖直肥皂膜模型
 */

import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'derivation',
  readoutKeys: ['lambda', 'd-local', 'order'],
  renderHints: {
    contentScale: 1.5
  },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['profile', 'step', 'lambda', 'whiteLight']
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
  objective: '理解薄膜反射干涉：厚度均匀变化时条纹等距，非均匀时条纹疏密不均',
  description:
    '主视看干涉图样，侧视看厚度剖面；均匀变化条纹等间距，非均匀变化越往下越密',
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
  urlSyncKeys: ['step', 'profile'],
  testProfile: {
    hasGraph: true,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
