import { describe, expect, it } from 'vitest';
import { createVelocityFunction } from '../../src/scenes/chase-meet/expression-parser';

describe('chase-meet expression-parser', () => {
  describe('valid expressions (baseline)', () => {
    it('parses a plain number', () => {
      expect(createVelocityFunction('42')(0)).toBe(42);
      expect(createVelocityFunction('42')(7)).toBe(42);
    });

    it('parses the variable t', () => {
      expect(createVelocityFunction('t')(3.5)).toBe(3.5);
    });

    it('respects operator precedence', () => {
      expect(createVelocityFunction('2+3*4')(0)).toBe(14);
    });

    it('respects parentheses', () => {
      expect(createVelocityFunction('(2+3)*4')(0)).toBe(20);
    });

    it('handles division', () => {
      expect(createVelocityFunction('10/4')(0)).toBe(2.5);
    });

    it('handles unary minus and plus', () => {
      expect(createVelocityFunction('-t')(2)).toBe(-2);
      expect(createVelocityFunction('--3')(0)).toBe(3);
      expect(createVelocityFunction('+-2')(0)).toBe(-2);
      expect(createVelocityFunction('-(t+1)')(4)).toBe(-5);
    });

    it('tolerates whitespace', () => {
      expect(createVelocityFunction('  2 * t  + 1 ')(3)).toBe(7);
    });

    it('parses leading-dot decimals', () => {
      expect(createVelocityFunction('.5*t')(4)).toBe(2);
    });
  });

  describe('malformed input → zero function', () => {
    it.each([
      { label: 'empty string', expr: '' },
      { label: 'whitespace only', expr: '   ' },
      { label: 'invalid identifier', expr: 'x + 1' },
      { label: 'function call', expr: 'sin(t)' },
      { label: 'unsupported operator', expr: '2^3' }
    ])('returns a zero function for $label', ({ expr }) => {
      const fn = createVelocityFunction(expr);
      expect(fn(0)).toBe(0);
      expect(fn(5)).toBe(0);
    });

    it('discards the whole expression when any character is invalid', () => {
      // tokenizer 遇非法字符直接中止：即使前缀 '2+t' 合法也整体归零
      const fn = createVelocityFunction('2+t;');
      expect(fn(3)).toBe(0);
    });

    it('returns a zero function when evaluation at t=0 is non-finite', () => {
      // 9^400 在 t=0 预检时溢出为 Infinity（双精度上限 ~1.8e308，9^343 起溢出）
      const huge = Array(400).fill('9').join('*');
      const fn = createVelocityFunction(huge);
      expect(fn(0)).toBe(0);
      expect(fn(2)).toBe(0);
    });

    it('scientific notation is unsupported: e aborts tokenization', () => {
      // '1e309'：'1' 入列后遇到非法字符 'e' → tokenizer 整体中止
      const fn = createVelocityFunction('1e309');
      expect(fn(1)).toBe(0);
    });
  });

  describe('operator boundary behaviour', () => {
    it('division by zero yields 0 instead of Infinity', () => {
      expect(createVelocityFunction('1/0')(0)).toBe(0);
    });

    it('division by an expression evaluating to zero yields 0', () => {
      expect(createVelocityFunction('10/(t-t)')(42)).toBe(0);
    });

    it('0/0 yields 0', () => {
      expect(createVelocityFunction('0/0')(0)).toBe(0);
    });

    it('trailing operator parses the missing operand as 0', () => {
      expect(createVelocityFunction('2+')(0)).toBe(2);
      expect(createVelocityFunction('t*')(4)).toBe(0);
    });

    it('leading binary operator parses the missing left operand as 0', () => {
      expect(createVelocityFunction('*2')(0)).toBe(0);
    });

    it('unclosed parenthesis is tolerated', () => {
      expect(createVelocityFunction('(2+3')(0)).toBe(5);
    });

    it('unmatched closing parenthesis terminates the expression early', () => {
      expect(createVelocityFunction('2+3)')(0)).toBe(5);
    });

    it('non-finite runtime results collapse to 0', () => {
      const fn = createVelocityFunction('t*t*t*t');
      expect(fn(2)).toBe(16);
      expect(fn(1e100)).toBe(0); // 1e400 → Infinity → 0
    });
  });

  describe('tokenizer quirks (documented behaviour)', () => {
    it('adjacent tokens without operator keep the first value', () => {
      // 'tt' → 两个 t token，第二个被静默忽略
      expect(createVelocityFunction('tt')(7)).toBe(7);
    });

    it('multi-dot numbers are truncated by parseFloat', () => {
      // '1.2.3' 被扫描为一个数字串，parseFloat 截断为 1.2
      expect(createVelocityFunction('1.2.3')(0)).toBeCloseTo(1.2, 6);
    });
  });
});
