import { describe, expect, it } from 'vitest';
import { createTransportState } from '../../src/app/scene-shell';

describe('transport controls', () => {
  it('starts in paused mode', () => {
    expect(createTransportState().isPlaying).toBe(false);
  });
});
