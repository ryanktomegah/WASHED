import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { addMoney, compareMoney, formatMoney, money, subtractMoney } from './money.js';

describe('money', () => {
  it('rejects floating-point amounts', () => {
    expect(() => money(10.5, 'XOF')).toThrow('Money amount must be a safe integer');
  });

  it('requires matching currencies for arithmetic', () => {
    expect(() => addMoney(money(100, 'XOF'), money(100, 'GHS'))).toThrow('Currency mismatch');
  });

  it('preserves add/subtract identity for any safe XOF amount', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        (leftAmount, rightAmount) => {
          const left = money(leftAmount, 'XOF');
          const right = money(rightAmount, 'XOF');

          expect(subtractMoney(addMoney(left, right), right)).toEqual(left);
        },
      ),
    );
  });

  it('compares amounts in the same currency', () => {
    expect(compareMoney(money(1, 'XOF'), money(2, 'XOF'))).toBe(-1);
    expect(compareMoney(money(2, 'XOF'), money(2, 'XOF'))).toBe(0);
    expect(compareMoney(money(3, 'XOF'), money(2, 'XOF'))).toBe(1);
  });

  it('formats XOF without fractional digits', () => {
    expect(formatMoney(money(2500, 'XOF'), 'fr-TG')).toContain('2');
    expect(formatMoney(money(2500, 'XOF'), 'fr-TG')).toContain('500');
  });
});
