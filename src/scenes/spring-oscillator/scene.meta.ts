import type { SceneMeta } from '../types';

export const springOscillatorMeta: SceneMeta = {
  id: 'spring-oscillator',
  title: '弹簧振子',
  path: '/src/pages/spring-oscillator.html',
  subject: '力学',
  concept: '简谐运动',
  subConcepts: ['相位关系', '周期与频率'],
  keywords: ['力学', '弹簧', '简谐运动', '相位', '周期'],
  objective: '演示弹簧振子的简谐运动，理解相位、同相与反相的概念',
  description: '探索简谐运动的韵律，周期与频率的美妙关系',
  difficulty: 2,
  icon: '🌀',
  category: 'mechanics',
  featured: true,
  defaultParams: {
    k: 10,
    m: 1,
    x0: 5
  }
};
