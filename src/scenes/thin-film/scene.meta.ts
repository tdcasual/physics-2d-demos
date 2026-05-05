/**
 * 薄膜干涉 — 薄膜的反射干涉
 */

import type { SceneMeta } from '../../platform/scene-contract';

export const thinFilmMeta: SceneMeta = {
  id: 'thin-film',
  title: '薄膜干涉',
  path: '/src/pages/thin-film.html',
  subject: '光学',
  concept: '光的干涉',
  subConcepts: ['薄膜干涉', '半波损失'],
  keywords: ['光学', '薄膜干涉', '半波损失', '增透膜', '光程差'],
  objective: '理解薄膜反射干涉的原理及光程差公式',
  description: '通过几何推导理解薄膜干涉的增强与相消条件',
  difficulty: 2,
  icon: '🫧',
  category: 'method',
  featured: false,
  defaultParams: {
    lambda: 650,
    d: 500,
    n: 1.5,
    incidence: 30
  },
  urlSyncKeys: ['step']
};
