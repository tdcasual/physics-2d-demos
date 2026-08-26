/**
 * Field-lines scene color palette
 * Semantic colors for positive/negative charges and field lines
 */

export type FieldLineColors = {
  positive: {
    core: string;
    mid: string;
    light: string;
    glow: string;
    edge: string;
    text: string;
  };
  negative: {
    core: string;
    mid: string;
    light: string;
    glow: string;
    edge: string;
    text: string;
  };
  fieldLineWarm: { base: string; arrow: string };
  fieldLineCool: { base: string; arrow: string };
};

const LIGHT: FieldLineColors = {
  positive: {
    core: '#E65100',
    mid: '#FFB74D',
    light: '#FFF8E1',
    glow: 'rgba(230, 81, 0, 0.3)',
    edge: 'rgba(230, 81, 0, 0.6)',
    text: 'rgba(230, 81, 0, 0.85)'
  },
  negative: {
    core: '#006064',
    mid: '#4DD0E1',
    light: '#E0F7FA',
    glow: 'rgba(0, 150, 136, 0.3)',
    edge: 'rgba(0, 96, 100, 0.6)',
    text: 'rgba(0, 150, 136, 0.85)'
  },
  fieldLineWarm: {
    base: '230, 120, 40',
    arrow: '230, 120, 40'
  },
  fieldLineCool: {
    base: '40, 160, 200',
    arrow: '40, 160, 200'
  }
};

const DARK: FieldLineColors = {
  positive: {
    core: '#E65100',
    mid: '#FFB74D',
    light: '#FFF8E1',
    glow: 'rgba(230, 81, 0, 0.4)',
    edge: 'rgba(230, 81, 0, 0.6)',
    text: 'rgba(230, 81, 0, 0.85)'
  },
  negative: {
    core: '#006064',
    mid: '#4DD0E1',
    light: '#E0F7FA',
    glow: 'rgba(0, 150, 136, 0.4)',
    edge: 'rgba(0, 96, 100, 0.6)',
    text: 'rgba(0, 150, 136, 0.85)'
  },
  fieldLineWarm: {
    base: '255, 160, 70',
    arrow: '255, 160, 70'
  },
  fieldLineCool: {
    base: '70, 200, 230',
    arrow: '70, 200, 230'
  }
};

export function getFieldLineColors(isDark: boolean): FieldLineColors {
  return isDark ? DARK : LIGHT;
}
