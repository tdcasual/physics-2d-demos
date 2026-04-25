import type { TeachingTheme } from '../../../platform/standards';

export type CircuitColors = {
  bg: string;
  wire: string;
  wireActive: string;
  component: string;
  componentFill: string;
  electron: string;
  electronDim: string;
  text: string;
  textSecondary: string;
  accent: string;
  danger: string;
  panelBg: string;
  panelBorder: string;
};

export function circuitColors(theme: TeachingTheme): CircuitColors {
  const isDark = theme === 'dark';
  return {
    bg: isDark ? '#0b1220' : '#f8fafc',
    wire: isDark ? '#94a3b8' : '#475569',
    wireActive: isDark ? '#60a5fa' : '#2563eb',
    component: isDark ? '#e2e8f0' : '#1e2937',
    componentFill: isDark ? '#1e293b' : '#ffffff',
    electron: isDark ? '#38bdf8' : '#0ea5e9',
    electronDim: isDark ? '#334155' : '#cbd5e1',
    text: isDark ? '#e2e8f0' : '#1e2937',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    accent: isDark ? '#4ade80' : '#16a34a',
    danger: isDark ? '#f87171' : '#dc2626',
    panelBg: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.9)',
    panelBorder: isDark ? '#334155' : '#e2e8f0'
  };
}
