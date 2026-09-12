import { describe, expect, it } from 'vitest';
import { createMicrometerScene } from '../../src/scenes/micrometer/scene.entry';
import { createVernierCaliperScene } from '../../src/scenes/vernier-caliper/scene.entry';

describe('instrument presentation readout', () => {
  it('micrometer omits the millimetre answer until reveal', () => {
    const scene = createMicrometerScene({
      mode: 'presentation',
      demoHints: { contentScale: 1.5, revealAnswer: false }
    });
    const hidden = scene
      .getReadoutItems()
      .map((item) => item.value)
      .join(' ');
    expect(hidden).not.toMatch(/4\.593/);
    expect(hidden).toMatch(/揭示/);
    scene.setRevealAnswer(true);
    const shown = scene
      .getReadoutItems()
      .map((item) => item.value)
      .join(' ');
    expect(shown).toMatch(/4\.593/);
  });

  it('vernier omits object size and total reading until reveal', () => {
    const scene = createVernierCaliperScene({
      mode: 'presentation',
      demoHints: { contentScale: 1.5, revealAnswer: false }
    });
    const hidden = scene
      .getReadoutItems()
      .map((item) => item.value)
      .join(' ');
    expect(hidden).not.toMatch(/5\.24/);
    scene.setRevealAnswer(true);
    const shown = scene
      .getReadoutItems()
      .map((item) => item.value)
      .join(' ');
    expect(shown).toMatch(/5\.24/);
  });
});
