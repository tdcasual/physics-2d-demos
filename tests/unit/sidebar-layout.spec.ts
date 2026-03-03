import { describe, expect, it } from 'vitest';
import { clampSidebarWidth, getDefaultSidebarWidth } from '../../src/app/sidebar-layout';

describe('sidebar layout helpers', () => {
  it('clamps width to min and max bounds', () => {
    expect(clampSidebarWidth(120, 260, 640)).toBe(260);
    expect(clampSidebarWidth(480, 260, 640)).toBe(480);
    expect(clampSidebarWidth(980, 260, 640)).toBe(640);
  });

  it('computes a stable default width by viewport ratio', () => {
    expect(getDefaultSidebarWidth(1200, 280, 600)).toBe(408);
    expect(getDefaultSidebarWidth(680, 280, 600)).toBe(280);
    expect(getDefaultSidebarWidth(2600, 280, 600)).toBe(600);
  });
});
