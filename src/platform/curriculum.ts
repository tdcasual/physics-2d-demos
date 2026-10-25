/**
 * 人教版高中物理课程体系分类。
 *
 * 本文件只定义分类体系（领域 / 章节及其标签）。每个场景的归属写在自己的
 * scene.meta.ts（curriculumDomain / curriculumChapter），catalog 自动发现时
 * 校验——新增场景无需修改平台文件。
 */

export type CurriculumDomain =
  | 'mechanics'
  | 'electromagnetism'
  | 'optics'
  | 'thermal'
  | 'modern'
  | 'experimental';

export type CurriculumChapter =
  | 'kinematics'
  | 'forces'
  | 'energy'
  | 'momentum'
  | 'gravity'
  | 'oscillation-waves'
  | 'electric-field'
  | 'circuit'
  | 'magnetic-field'
  | 'electromagnetic-induction'
  | 'geometrical-optics'
  | 'physical-optics'
  | 'kinetic-theory'
  | 'thermodynamics'
  | 'modern-physics'
  | 'measurement'
  | 'data-analysis';

export type SceneCurriculum = {
  domain: CurriculumDomain;
  chapter: CurriculumChapter;
};

export type CurriculumDomainInfo = {
  label: string;
  color: string;
};

export type CurriculumChapterInfo = {
  domain: CurriculumDomain;
  label: string;
};

export const CURRICULUM_DOMAINS: readonly CurriculumDomain[] = [
  'mechanics',
  'electromagnetism',
  'optics',
  'thermal',
  'modern',
  'experimental'
];

export const CURRICULUM_DOMAIN_INFO: Record<
  CurriculumDomain,
  CurriculumDomainInfo
> = {
  mechanics: {
    label: '力学',
    color: 'var(--category-mechanics)'
  },
  electromagnetism: {
    label: '电磁学',
    color: 'var(--category-electromagnetism)'
  },
  optics: {
    label: '光学',
    color: 'var(--category-optics)'
  },
  thermal: {
    label: '热学',
    color: 'var(--category-thermal)'
  },
  modern: {
    label: '近代物理',
    color: 'var(--category-modern)'
  },
  experimental: {
    label: '实验与方法',
    color: 'var(--category-experimental)'
  }
};

export const CURRICULUM_CHAPTER_INFO: Record<
  CurriculumChapter,
  CurriculumChapterInfo
> = {
  kinematics: { domain: 'mechanics', label: '运动的描述与匀变速直线运动' },
  forces: { domain: 'mechanics', label: '相互作用与运动规律' },
  energy: { domain: 'mechanics', label: '功与机械能' },
  momentum: { domain: 'mechanics', label: '动量' },
  gravity: { domain: 'mechanics', label: '万有引力与宇宙航行' },
  'oscillation-waves': { domain: 'mechanics', label: '机械振动与机械波' },
  'electric-field': { domain: 'electromagnetism', label: '静电场' },
  circuit: { domain: 'electromagnetism', label: '恒定电流与电路' },
  'magnetic-field': { domain: 'electromagnetism', label: '磁场与带电粒子' },
  'electromagnetic-induction': {
    domain: 'electromagnetism',
    label: '电磁感应与交变电流'
  },
  'geometrical-optics': { domain: 'optics', label: '几何光学' },
  'physical-optics': { domain: 'optics', label: '波动光学' },
  'kinetic-theory': { domain: 'thermal', label: '分子动理论' },
  thermodynamics: { domain: 'thermal', label: '内能与能量守恒' },
  'modern-physics': { domain: 'modern', label: '光电效应与量子、原子物理' },
  measurement: { domain: 'experimental', label: '基本测量与实验仪器' },
  'data-analysis': { domain: 'experimental', label: '实验数据与图像分析' }
};
