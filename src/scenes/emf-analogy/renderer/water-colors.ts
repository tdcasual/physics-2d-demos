import type { TeachingTheme } from '../../../platform/standards';

export type WaterColors = {
  bg: string;
  pipeBorder: string;
  pipeFill: string;
  waterHigh: string;
  waterMid: string;
  waterLow: string;
  pumpBody: string;
  pumpBlade: string;
  turbine: string;
  valveOpen: string;
  valveClosed: string;
  mesh: string;
  text: string;
  textSecondary: string;
  gaugeFace: string;
  gaugeBorder: string;
  gaugeNeedle: string;
  panelBg: string;
  panelBorder: string;
};

export function waterColors(theme: TeachingTheme): WaterColors {
  const isDark = theme === 'dark';
  return {
    bg: isDark ? '#0b1220' : '#f0f9ff',
    pipeBorder: isDark ? '#3b82f6' : '#60a5fa',
    pipeFill: isDark ? 'rgba(30,58,138,0.35)' : 'rgba(191,219,254,0.45)',
    waterHigh: isDark ? '#3b82f6' : '#2563eb',
    waterMid: isDark ? '#60a5fa' : '#3b82f6',
    waterLow: isDark ? '#93c5fd' : '#60a5fa',
    pumpBody: isDark ? '#1e3a5f' : '#dbeafe',
    pumpBlade: isDark ? '#60a5fa' : '#3b82f6',
    turbine: isDark ? '#475569' : '#94a3b8',
    valveOpen: isDark ? '#4ade80' : '#16a34a',
    valveClosed: isDark ? '#f87171' : '#dc2626',
    mesh: isDark ? '#64748b' : '#94a3b8',
    text: isDark ? '#e2e8f0' : '#1e2937',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    gaugeFace: isDark ? '#0f172a' : '#ffffff',
    gaugeBorder: isDark ? '#475569' : '#cbd5e1',
    gaugeNeedle: isDark ? '#f87171' : '#dc2626',
    panelBg: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.92)',
    panelBorder: isDark ? '#334155' : '#e2e8f0'
  };
}
