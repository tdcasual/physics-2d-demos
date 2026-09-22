/**
 * 人教版高中物理课程体系分类。
 *
 * 这份表是场景分类的唯一事实源。场景目录自动发现后由 catalog 校验每个
 * id 都有且只有一条课程归属，避免 subject/category 文案漂移造成误归类。
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

type SceneCurriculumMap = Record<string, SceneCurriculum>;

/** 每个自动发现的场景必须在此表中出现一次。 */
export const SCENE_CURRICULUM: SceneCurriculumMap = {
  // 力学：运动与力
  'accel-force': { domain: 'mechanics', chapter: 'forces' },
  'block-board': { domain: 'mechanics', chapter: 'forces' },
  'car-bank': { domain: 'mechanics', chapter: 'forces' },
  'centripetal-motion': { domain: 'mechanics', chapter: 'forces' },
  'chase-meet': { domain: 'mechanics', chapter: 'kinematics' },
  'clothes-rod': { domain: 'mechanics', chapter: 'forces' },
  'connected-bodies': { domain: 'mechanics', chapter: 'forces' },
  'connected-bodies-incline': { domain: 'mechanics', chapter: 'forces' },
  'conical-pendulum': { domain: 'mechanics', chapter: 'forces' },
  'conveyor-belt': { domain: 'mechanics', chapter: 'kinematics' },
  'displacement-time': { domain: 'mechanics', chapter: 'kinematics' },
  'force-composition': { domain: 'mechanics', chapter: 'forces' },
  'free-fall-throw': { domain: 'mechanics', chapter: 'kinematics' },
  'friction-critical': { domain: 'mechanics', chapter: 'forces' },
  'galileo-incline': { domain: 'mechanics', chapter: 'forces' },
  'micro-deformation': { domain: 'mechanics', chapter: 'forces' },
  'orbit-critical': { domain: 'mechanics', chapter: 'forces' },
  'parallelogram-rule': { domain: 'mechanics', chapter: 'forces' },
  projectile: { domain: 'mechanics', chapter: 'kinematics' },
  'projectile-components': { domain: 'mechanics', chapter: 'kinematics' },
  'projectile-data-analysis': {
    domain: 'experimental',
    chapter: 'data-analysis'
  },
  'three-forces': { domain: 'mechanics', chapter: 'forces' },
  'tortoise-hare': { domain: 'mechanics', chapter: 'kinematics' },
  'uniformly-varied-motion': { domain: 'mechanics', chapter: 'kinematics' },
  'vertical-circle': { domain: 'mechanics', chapter: 'forces' },
  'xt-graph': { domain: 'mechanics', chapter: 'kinematics' },

  // 力学：功、能量与动量
  'elastic-energy': { domain: 'mechanics', chapter: 'momentum' },
  'incline-spring': { domain: 'mechanics', chapter: 'energy' },
  'locomotive-power': { domain: 'mechanics', chapter: 'energy' },
  'mechanical-energy': { domain: 'mechanics', chapter: 'energy' },
  'mechanical-energy-two-ball': { domain: 'mechanics', chapter: 'energy' },
  'pendulum-energy': { domain: 'mechanics', chapter: 'energy' },
  'potential-energy-graphs': {
    domain: 'electromagnetism',
    chapter: 'electric-field'
  },
  'variable-work': { domain: 'mechanics', chapter: 'energy' },
  'air-track-momentum': { domain: 'mechanics', chapter: 'momentum' },
  'bullet-block': { domain: 'mechanics', chapter: 'momentum' },
  'elastic-collision': { domain: 'mechanics', chapter: 'momentum' },
  'impulse-momentum': { domain: 'mechanics', chapter: 'momentum' },
  'momentum-conservation-comparison': {
    domain: 'mechanics',
    chapter: 'momentum'
  },
  'momentum-ring-pendulum': { domain: 'mechanics', chapter: 'momentum' },

  // 力学：万有引力与机械振动、机械波
  'binary-stars': { domain: 'mechanics', chapter: 'gravity' },
  'earth-gravity': { domain: 'mechanics', chapter: 'gravity' },
  'satellite-transfer': { domain: 'mechanics', chapter: 'gravity' },
  'doppler-effect': { domain: 'mechanics', chapter: 'oscillation-waves' },
  ganshe: { domain: 'mechanics', chapter: 'oscillation-waves' },
  'harmonic-wave': { domain: 'mechanics', chapter: 'oscillation-waves' },
  'mechanical-wave': { domain: 'mechanics', chapter: 'oscillation-waves' },
  'pendulum-period': { domain: 'mechanics', chapter: 'oscillation-waves' },
  'spring-ball': { domain: 'mechanics', chapter: 'oscillation-waves' },
  'spring-oscillator': { domain: 'mechanics', chapter: 'oscillation-waves' },
  'wave-superpose': { domain: 'mechanics', chapter: 'oscillation-waves' },

  // 电磁学：电场、电路
  'alternating-electric-deflection': {
    domain: 'electromagnetism',
    chapter: 'electric-field'
  },
  'alternating-electric-field': {
    domain: 'electromagnetism',
    chapter: 'electric-field'
  },
  'charged-superposition': {
    domain: 'electromagnetism',
    chapter: 'electric-field'
  },
  'electric-deflection': {
    domain: 'electromagnetism',
    chapter: 'electric-field'
  },
  'electric-field-establish': {
    domain: 'electromagnetism',
    chapter: 'circuit'
  },
  'electric-pendulum': {
    domain: 'electromagnetism',
    chapter: 'electric-field'
  },
  electrification: { domain: 'electromagnetism', chapter: 'electric-field' },
  'electrostatic-induction': {
    domain: 'electromagnetism',
    chapter: 'electric-field'
  },
  'electrostatic-shielding': {
    domain: 'electromagnetism',
    chapter: 'electric-field'
  },
  'field-lines': { domain: 'electromagnetism', chapter: 'electric-field' },
  'uniform-electric-acceleration': {
    domain: 'electromagnetism',
    chapter: 'electric-field'
  },
  'closed-circuit': { domain: 'electromagnetism', chapter: 'circuit' },
  'closed-power': { domain: 'electromagnetism', chapter: 'circuit' },
  'emf-internal-resistance': { domain: 'electromagnetism', chapter: 'circuit' },
  'half-deflection': { domain: 'electromagnetism', chapter: 'circuit' },
  'lightbulb-iv-curve': { domain: 'electromagnetism', chapter: 'circuit' },
  'multimeter-practice': { domain: 'experimental', chapter: 'measurement' },
  'resistor-measurement': { domain: 'experimental', chapter: 'measurement' },
  'capacitor-charge-discharge': {
    domain: 'electromagnetism',
    chapter: 'circuit'
  },
  'parallel-capacitor': {
    domain: 'electromagnetism',
    chapter: 'electric-field'
  },

  // 电磁学：磁场与电磁感应
  'ampere-balance': { domain: 'electromagnetism', chapter: 'magnetic-field' },
  'bounded-magnetic': { domain: 'electromagnetism', chapter: 'magnetic-field' },
  'charged-particle-circle': {
    domain: 'electromagnetism',
    chapter: 'magnetic-field'
  },
  cyclotron: { domain: 'electromagnetism', chapter: 'magnetic-field' },
  'dynamic-circle': { domain: 'electromagnetism', chapter: 'magnetic-field' },
  'magnetic-convergence': {
    domain: 'electromagnetism',
    chapter: 'magnetic-field'
  },
  'magnetic-mirror': { domain: 'electromagnetism', chapter: 'magnetic-field' },
  'mass-spectrometer': {
    domain: 'electromagnetism',
    chapter: 'magnetic-field'
  },
  'velocity-selector': {
    domain: 'electromagnetism',
    chapter: 'magnetic-field'
  },
  'charged-particle-electric': {
    domain: 'electromagnetism',
    chapter: 'electric-field'
  },
  'emf-analogy': {
    domain: 'electromagnetism',
    chapter: 'electromagnetic-induction'
  },
  'faraday-disc': {
    domain: 'electromagnetism',
    chapter: 'electromagnetic-induction'
  },
  'induction-accelerator': {
    domain: 'electromagnetism',
    chapter: 'electromagnetic-induction'
  },
  'lenz-law': {
    domain: 'electromagnetism',
    chapter: 'electromagnetic-induction'
  },
  'metal-rod-track': {
    domain: 'electromagnetism',
    chapter: 'electromagnetic-induction'
  },
  'rod-model': {
    domain: 'electromagnetism',
    chapter: 'electromagnetic-induction'
  },
  'single-loop': {
    domain: 'electromagnetism',
    chapter: 'electromagnetic-induction'
  },
  'wire-loop-field': {
    domain: 'electromagnetism',
    chapter: 'electromagnetic-induction'
  },
  oscilloscope: { domain: 'experimental', chapter: 'measurement' },

  // 光学
  'parallel-glass-refraction': {
    domain: 'optics',
    chapter: 'geometrical-optics'
  },
  'semicylinder-tir': { domain: 'optics', chapter: 'geometrical-optics' },
  'semicylinder-tir-standard': {
    domain: 'optics',
    chapter: 'geometrical-optics'
  },
  'double-slit': { domain: 'optics', chapter: 'physical-optics' },
  'interference-formula': { domain: 'optics', chapter: 'physical-optics' },
  'single-slit': { domain: 'optics', chapter: 'physical-optics' },
  'thin-film': { domain: 'optics', chapter: 'physical-optics' },
  wedge: { domain: 'optics', chapter: 'physical-optics' },
  'wedge-film-interference': { domain: 'optics', chapter: 'physical-optics' },

  // 热学
  bellows: { domain: 'thermal', chapter: 'thermodynamics' },
  'brownian-motion': { domain: 'thermal', chapter: 'kinetic-theory' },
  'internal-energy': { domain: 'thermal', chapter: 'thermodynamics' },
  'joule-work-heat': { domain: 'thermal', chapter: 'thermodynamics' },
  'maxwell-speed-distribution': {
    domain: 'thermal',
    chapter: 'kinetic-theory'
  },
  'molecular-potential': { domain: 'thermal', chapter: 'kinetic-theory' },

  // 近代物理
  'binding-energy': { domain: 'modern', chapter: 'modern-physics' },
  'photoelectric-cutoff': { domain: 'modern', chapter: 'modern-physics' },
  'photoelectric-iv': { domain: 'modern', chapter: 'modern-physics' },
  'photoelectric-switch': { domain: 'modern', chapter: 'modern-physics' },
  'radioactive-decay': { domain: 'modern', chapter: 'modern-physics' },
  'rutherford-alpha-scattering': {
    domain: 'modern',
    chapter: 'modern-physics'
  },
  'zinc-photoelectric-energy': { domain: 'modern', chapter: 'modern-physics' },

  // 实验与方法
  'auto-water-feeder': { domain: 'experimental', chapter: 'data-analysis' },
  'laser-speed': { domain: 'experimental', chapter: 'data-analysis' },
  micrometer: { domain: 'experimental', chapter: 'measurement' },
  'precision-tools': { domain: 'experimental', chapter: 'measurement' },
  'ticker-tape': { domain: 'experimental', chapter: 'data-analysis' },
  'ticker-timer': { domain: 'experimental', chapter: 'measurement' },
  'vernier-caliper': { domain: 'experimental', chapter: 'measurement' },
  'vt-integral': { domain: 'experimental', chapter: 'data-analysis' }
};

export function resolveSceneCurriculum(
  id: string
): SceneCurriculum | undefined {
  return SCENE_CURRICULUM[id];
}
