const MODULUS = 0x100000000;
const MULTIPLIER = 1664525;
const INCREMENT = 1013904223;

export function createRng(seed: number) {
  let state = (Math.floor(seed) >>> 0) || 1;

  return function next(): number {
    state = (MULTIPLIER * state + INCREMENT) % MODULUS;
    return state / MODULUS;
  };
}
