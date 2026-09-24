import { describe, expect, it } from 'vitest';
import {
  axisTicksForSpan,
  estimateTickLabelWidth,
  formatGraphTick,
  graphAxisAnchor,
  graphPlotInsets,
  layoutGraphPanels
} from '../../src/scenes/ticker-tape/scene.view';

describe('ticker-tape graph panels', () => {
  it('gives one selected graph the whole plot', () => {
    const layout = layoutGraphPanels(860, 420, 1);
    expect(layout).not.toBeNull();
    expect(layout!.cols).toBe(1);
    expect(layout!.rows).toBe(1);
    expect(layout!.stacked).toBe(false);
    expect(layout!.width).toBe(860);
    expect(layout!.height).toBe(420);
    expect(layout!.boxes[0].w).toBeGreaterThan(860 * 0.9);
    expect(layout!.boxes[0].h).toBeGreaterThan(420 * 0.9);
    expect(layout!.boxes[0].x).toBeLessThan(20);
    expect(layout!.boxes[0].y).toBeLessThan(20);
  });

  it('places two wide graphs in full-height columns', () => {
    const layout = layoutGraphPanels(900, 480, 2);
    expect(layout).not.toBeNull();
    expect(layout!.stacked).toBe(false);
    expect(layout!.cols).toBe(2);
    expect(layout!.rows).toBe(1);
    expect(layout!.height).toBe(480);
    for (const box of layout!.boxes) {
      expect(box.w).toBeGreaterThan(900 * 0.4);
      expect(box.w).toBeLessThan(900 * 0.5);
      expect(box.h).toBeGreaterThan(480 * 0.9);
    }
    expect(layout!.boxes[1].x).toBeGreaterThan(
      layout!.boxes[0].x + layout!.boxes[0].w
    );
    expect(Math.abs(layout!.boxes[0].w - layout!.boxes[0].h)).toBeGreaterThan(
      20
    );
  });

  it('stacks two graphs into full-width rows when the plot is narrow or short', () => {
    const narrow = layoutGraphPanels(400, 200, 2);
    expect(narrow).not.toBeNull();
    expect(narrow!.stacked).toBe(true);
    expect(narrow!.cols).toBe(1);
    expect(narrow!.rows).toBe(2);
    expect(narrow!.boxes[0].w).toBeGreaterThan(400 * 0.9);
    expect(narrow!.boxes[1].y).toBeGreaterThan(
      narrow!.boxes[0].y + narrow!.boxes[0].h
    );
    expect(narrow!.height).toBeGreaterThan(200);

    const short = layoutGraphPanels(880, 280, 2);
    expect(short).not.toBeNull();
    expect(short!.stacked).toBe(true);
    expect(short!.cols).toBe(1);
    expect(short!.boxes[0].w).toBeGreaterThan(880 * 0.9);
    expect(short!.height).toBeGreaterThan(280);
  });

  it('fits a wide short landscape plot into the visible height', () => {
    const layout = layoutGraphPanels(800, 110, 2);
    expect(layout).not.toBeNull();
    expect(layout!.stacked).toBe(false);
    expect(layout!.height).toBe(110);
    expect(layout!.boxes[0].h).toBeGreaterThan(80);
    expect(layout!.boxes[0].h).toBeLessThan(110);
  });

  it('keeps two widescreen plots side by side when the row is only moderately short', () => {
    const layout = layoutGraphPanels(1200, 280, 2);
    expect(layout).not.toBeNull();
    expect(layout!.stacked).toBe(false);
    expect(layout!.cols).toBe(2);
    expect(layout!.rows).toBe(1);
    expect(layout!.height).toBe(280);
    expect(layout!.boxes[0].h).toBeGreaterThan(280 * 0.9);
    expect(layout!.boxes[1].x).toBeGreaterThan(
      layout!.boxes[0].x + layout!.boxes[0].w
    );
    expect(layout!.boxes[1].y).toBe(layout!.boxes[0].y);
  });

  it('spaces horizontal ticks so formatted labels cannot collide', () => {
    const cases = [
      { max: 0.6, span: 1100, font: 18 },
      { max: 0.6, span: 860, font: 32 },
      { max: 0.6, span: 520, font: 18 },
      { max: 0.6, span: 420, font: 36 },
      { max: 0.6, span: 340, font: 16 },
      { max: 0.2, span: 240, font: 16 }
    ];
    for (const sample of cases) {
      const ticks = axisTicksForSpan(
        sample.max,
        sample.span,
        sample.font,
        'horizontal'
      ).filter((value) => value <= sample.max + 1e-9);
      expect(ticks.length).toBeGreaterThanOrEqual(2);
      expect(ticks[0]).toBe(0);
      for (let i = 1; i < ticks.length; i += 1) {
        const gap = ((ticks[i] - ticks[i - 1]) / sample.max) * sample.span;
        const box =
          estimateTickLabelWidth(formatGraphTick(ticks[i - 1]), sample.font) /
            2 +
          estimateTickLabelWidth(formatGraphTick(ticks[i]), sample.font) / 2;
        expect(gap - box).toBeGreaterThanOrEqual(1);
      }
    }
    const crowded = axisTicksForSpan(0.6, 1100, 18, 'horizontal');
    expect(crowded[1] - crowded[0]).toBeGreaterThan(0.02);

    const vertical = axisTicksForSpan(0.35, 280, 32, 'vertical').filter(
      (value) => value <= 0.35 + 1e-9
    );
    expect(vertical.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < vertical.length; i += 1) {
      const gap = ((vertical[i] - vertical[i - 1]) / 0.35) * 280;
      expect(gap).toBeGreaterThanOrEqual(32 * 1.2);
    }
  });

  it('reserves room for 1080p axis titles and tick labels', () => {
    const insets = graphPlotInsets(
      { w: 860, h: 420 },
      { title: 40, tick: 32, axis: 36 },
      0.6,
      0.35,
      4
    );
    const yWidth = estimateTickLabelWidth(formatGraphTick(0.35), 32);
    const axisRight = graphAxisAnchor(36) + 36 / 2;
    const tickLeft = insets.left - 4 - 2 - yWidth;
    expect(tickLeft - axisRight).toBeGreaterThanOrEqual(4);
    expect(graphAxisAnchor(36) - 36 / 2).toBeGreaterThan(0);
    expect(insets.top).toBeGreaterThanOrEqual(6 + 40);
    expect(insets.bottom).toBeGreaterThanOrEqual(32 + 4);
    expect(insets.left + insets.right).toBeLessThan(860 * 0.7);
    expect(insets.left).toBeLessThanOrEqual(860 * 0.48 + 0.1);
  });
});
