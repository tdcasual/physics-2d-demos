import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: ['emf', 'current', 'power', 'torque', 'polarity', 'bulb'],
  renderHints: { contentScale: 1.45 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['rotation', 'field', 'B', 'omega', 'closed']
  }
};

export const faradayMeta: SceneMeta = {
  id: 'faraday-disc',
  title: '法拉第圆盘发电机原理',
  path: '/src/pages/faraday-disc.html',
  subject: '电磁学',
  concept: '电磁感应',
  subConcepts: ['动生电动势', '能量守恒'],
  keywords: ['法拉第圆盘', '动生电动势', '洛伦兹力', '右手定则', '发电机'],
  objective: '观察转动切割磁感线产生的电动势、极性与电流',
  description: '调节 B、ω、R 与回路，观察 E = ½BωR² 及灯泡、检流计',
  difficulty: 3,
  icon: '🧲',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'electromagnetic-induction',
  featured: false,
  defaultParams: {
    B: 1,
    omega: 10,
    radius: 0.2,
    externalResistance: 2,
    closed: 1
  },
  urlSyncKeys: [
    'B',
    'omega',
    'radius',
    'externalResistance',
    'rotation',
    'field',
    'closed',
    'preset'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
