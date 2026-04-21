import { describe, expect, it } from 'vitest';
import {
  getChartTheme,
  defaultChartThemes
} from '../../src/core/chart/chart-theme';

describe('chart-theme', () => {
  it('should return light theme', () => {
    const theme = getChartTheme('light');
    expect(theme.mode).toBe('light');
    expect(theme.bg).toBe('#f8fafc');
    expect(theme.seriesColors.length).toBeGreaterThan(0);
  });

  it('should return dark theme', () => {
    const theme = getChartTheme('dark');
    expect(theme.mode).toBe('dark');
    expect(theme.bg).toBe('#0f172a');
    expect(theme.seriesColors.length).toBeGreaterThan(0);
  });

  it('should have distinct light and dark themes', () => {
    const light = getChartTheme('light');
    const dark = getChartTheme('dark');
    expect(light.bg).not.toBe(dark.bg);
    expect(light.text).not.toBe(dark.text);
    expect(light.panelBg).not.toBe(dark.panelBg);
  });

  it('should expose default themes record', () => {
    expect(defaultChartThemes.light).toBeDefined();
    expect(defaultChartThemes.dark).toBeDefined();
    expect(defaultChartThemes.light.mode).toBe('light');
    expect(defaultChartThemes.dark.mode).toBe('dark');
  });

  it('should have required color properties in light theme', () => {
    const theme = getChartTheme('light');
    expect(theme.bg).toBeTruthy();
    expect(theme.panelBg).toBeTruthy();
    expect(theme.text).toBeTruthy();
    expect(theme.textSecondary).toBeTruthy();
    expect(theme.grid).toBeTruthy();
    expect(theme.axis).toBeTruthy();
    expect(theme.border).toBeTruthy();
    expect(theme.seriesColors.length).toBe(6);
  });

  it('should have required color properties in dark theme', () => {
    const theme = getChartTheme('dark');
    expect(theme.bg).toBeTruthy();
    expect(theme.panelBg).toBeTruthy();
    expect(theme.text).toBeTruthy();
    expect(theme.textSecondary).toBeTruthy();
    expect(theme.grid).toBeTruthy();
    expect(theme.axis).toBeTruthy();
    expect(theme.border).toBeTruthy();
    expect(theme.seriesColors.length).toBe(6);
  });

  it('should return same object on repeated calls (reference equality)', () => {
    const a = getChartTheme('light');
    const b = getChartTheme('light');
    expect(a).toBe(b);
  });
});
