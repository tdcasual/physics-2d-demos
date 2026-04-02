/**
 * 物理学史时间线数据
 * Physics History Timeline Data
 */

export type Era = 'ancient' | 'classical' | 'modern' | 'contemporary';

export interface Scientist {
  name: string;
  nameEn: string;
  years: string;
  avatar: string;
  quote: string;
}

export interface Experiment {
  id: string;
  title: string;
  description: string;
  difficulty: 1 | 2 | 3;
  icon: string;
}

export interface TimelineNode {
  id: string;
  year: number;
  yearDisplay: string;
  era: Era;
  scientist: Scientist;
  discovery: {
    title: string;
    description: string;
    icon: string;
  };
  experiments: Experiment[];
  connections: string[];
  position: { x: number; y: number };
}

export const timelineData: TimelineNode[] = [
  {
    id: 'archimedes',
    year: -250,
    yearDisplay: '公元前 250年',
    era: 'ancient',
    scientist: {
      name: '阿基米德',
      nameEn: 'Archimedes',
      years: '287-212 BC',
      avatar: '🏛️',
      quote: '给我一个支点，我就能撬动地球。',
    },
    discovery: {
      title: '浮力原理',
      description: '物体在流体中所受的浮力等于它排开的流体的重量',
      icon: '🌊',
    },
    experiments: [
      {
        id: 'buoyancy',
        title: '浮力实验',
        description: '探索物体沉浮的条件',
        difficulty: 1,
        icon: '🏊',
      },
    ],
    connections: ['galileo'],
    position: { x: 0, y: 0 },
  },
  {
    id: 'galileo',
    year: 1590,
    yearDisplay: '1590年',
    era: 'classical',
    scientist: {
      name: '伽利略',
      nameEn: 'Galileo Galilei',
      years: '1564-1642',
      avatar: '🔭',
      quote: '数学是上帝书写宇宙的文字。',
    },
    discovery: {
      title: '自由落体定律',
      description: '物体下落的距离与时间的平方成正比',
      icon: '🍎',
    },
    experiments: [
      {
        id: 'projectile',
        title: '抛体运动',
        description: '探索抛物线轨迹的奥秘',
        difficulty: 2,
        icon: '🎯',
      },
      {
        id: 'chase-meet',
        title: '追及相遇',
        description: '速度的较量，相对运动的魅力',
        difficulty: 2,
        icon: '🏃',
      },
    ],
    connections: ['newton'],
    position: { x: 1, y: 0 },
  },
  {
    id: 'newton',
    year: 1687,
    yearDisplay: '1687年',
    era: 'classical',
    scientist: {
      name: '牛顿',
      nameEn: 'Isaac Newton',
      years: '1643-1727',
      avatar: '🍎',
      quote: '如果说我看得比别人远，那是因为我站在巨人的肩膀上。',
    },
    discovery: {
      title: '运动定律与万有引力',
      description: '奠定了经典力学的基础',
      icon: '🌍',
    },
    experiments: [
      {
        id: 'projectile',
        title: '抛体运动',
        description: '牛顿运动定律的完美展示',
        difficulty: 2,
        icon: '🎯',
      },
    ],
    connections: ['hooke'],
    position: { x: 2, y: 0 },
  },
  {
    id: 'hooke',
    year: 1678,
    yearDisplay: '1678年',
    era: 'classical',
    scientist: {
      name: '胡克',
      nameEn: 'Robert Hooke',
      years: '1635-1703',
      avatar: '🔧',
      quote: '弹性与形变成正比。',
    },
    discovery: {
      title: '弹性定律',
      description: '弹簧的伸长与受力成正比',
      icon: '🌀',
    },
    experiments: [
      {
        id: 'spring-oscillator',
        title: '弹簧振子',
        description: '探索简谐运动的韵律',
        difficulty: 2,
        icon: '🌀',
      },
    ],
    connections: ['maxwell'],
    position: { x: 2.5, y: 1 },
  },
  {
    id: 'maxwell',
    year: 1865,
    yearDisplay: '1865年',
    era: 'modern',
    scientist: {
      name: '麦克斯韦',
      nameEn: 'James Clerk Maxwell',
      years: '1831-1879',
      avatar: '⚡',
      quote: '光是电磁波的一种形式。',
    },
    discovery: {
      title: '电磁场统一理论',
      description: '将电、磁、光统一为同一现象',
      icon: '🌈',
    },
    experiments: [
      {
        id: 'field-lines',
        title: '电场分布',
        description: '可视化看不见的力量',
        difficulty: 2,
        icon: '⚡',
      },
      {
        id: 'emf-analogy',
        title: '电磁类比',
        description: '用熟悉理解陌生',
        difficulty: 3,
        icon: '🔗',
      },
    ],
    connections: ['einstein'],
    position: { x: 3.5, y: 0 },
  },
  {
    id: 'einstein',
    year: 1905,
    yearDisplay: '1905年',
    era: 'contemporary',
    scientist: {
      name: '爱因斯坦',
      nameEn: 'Albert Einstein',
      years: '1879-1955',
      avatar: '🧠',
      quote: '想象力比知识更重要。',
    },
    discovery: {
      title: '相对论',
      description: '时空结构与质能等价',
      icon: '⏰',
    },
    experiments: [
      {
        id: 'vt-integral',
        title: 'v-t图像',
        description: '微积分与物理的交汇',
        difficulty: 3,
        icon: '📊',
      },
    ],
    connections: [],
    position: { x: 4.5, y: 0 },
  },
];

// 获取时期颜色
export const getEraColor = (era: Era): string => {
  const colors: Record<Era, string> = {
    ancient: '#d4a373',
    classical: '#e17055',
    modern: '#00b894',
    contemporary: '#0984e3',
  };
  return colors[era];
};

// 获取时期名称
export const getEraName = (era: Era): string => {
  const names: Record<Era, string> = {
    ancient: '古代',
    classical: '经典',
    modern: '近代',
    contemporary: '现代',
  };
  return names[era];
};
