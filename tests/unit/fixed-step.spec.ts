import { describe, expect, it } from 'vitest';
import { createFixedStepper } from '../../src/core/fixed-step';

describe('createFixedStepper', () => {
  it('clamps catch-up work to maxSubSteps', () => {
    const stepper = createFixedStepper({ dt: 1 / 60, maxSubSteps: 5 });
    const steps = stepper.consume(1.0);
    expect(steps).toBe(5);
  });
});
