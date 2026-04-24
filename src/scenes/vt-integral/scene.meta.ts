import type { SceneMeta } from '../types';
import type { SceneDemoProfile } from '../../app/demo-profile';

export const demoProfile: SceneDemoProfile = {
  controlPanel: 'collapsed',
  readoutPanel: 'docked-bottom',
  renderHints: {
    contentScale: 1.7
  },
  interactionHints: {
    touchTargetMinSize: 48
  }
};

export const vtIntegralMeta: SceneMeta = {
  id: 'vt-integral',
  title: '微元法',
  path: '/src/pages/vt-integral.html',
  subject: '数学方法',
  concept: '积分思想',
  subConcepts: ['黎曼和', '面积逼近'],
  keywords: ['数学', '微元法', '积分'],
  objective: '展示积分逼近、曲线逼近与体积逼近的多场景演示',
  description: '通过可视化理解微积分的基本思想',
  difficulty: 3,
  icon: '📐',
  category: 'method',
  featured: true,
  defaultParams: {
    n: 10,
    scene: 1
  },
  demoProfile
};
