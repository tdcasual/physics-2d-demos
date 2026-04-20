import type { SceneMeta } from '../types';

export const emfAnalogyMeta: SceneMeta = {
  id: 'emf-analogy',
  title: '电路水流类比',
  path: '/src/pages/emf-analogy.html',
  subject: '电磁学',
  concept: '闭合电路',
  subConcepts: ['路端电压', '内电压'],
  keywords: ['电磁学', '电路', '电动势', '2D'],
  objective: '用水流类比演示电流、内阻压降与路端电压关系',
  description: '用熟悉理解陌生，将电磁现象与日常生活类比',
  difficulty: 3,
  icon: '🔗',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    opening: 0.5
  }
};
