import { describe, it, expect } from 'vitest';
import {
  moneyFromPaise,
  moneyFromRupees,
  addMoney,
  subtractMoney,
  multiplyMoney,
  divideMoney,
  percentageOfMoney,
  compareMoney,
  isZero,
  isPositive,
  isNegative,
  formatRupees,
  serializeMoney,
  deserializeMoney,
  ZERO_MONEY,
  MoneyError,
} from '../domain/money';

describe('Money Domain Module (Integer Paise Arithmetic)', () => {
  it('correctly creates Money from paise and rupees', () => {
    expect(moneyFromPaise(0n).paise).toBe(0n);
    expect(moneyFromPaise(100n).paise).toBe(100n);
    expect(moneyFromRupees('0').paise).toBe(0n);
    expect(moneyFromRupees('1').paise).toBe(100n);
    expect(moneyFromRupees('100.50').paise).toBe(10050n);
    expect(moneyFromRupees('0.05').paise).toBe(5n);
    expect(moneyFromRupees('-25.00').paise).toBe(-2500n);
  });

  it('handles extremely large values without precision loss', () => {
    // 50 Crore Rupees = 50,00,00,000 * 100 paise = 50,00,00,00,000 paise
    const huge = moneyFromRupees('500000000.00');
    expect(huge.paise).toBe(50000000000n);
    const added = addMoney(huge, moneyFromRupees('1.50'));
    expect(added.paise).toBe(50000000150n);
  });

  it('performs safe addition and subtraction', () => {
    const a = moneyFromRupees('150.25');
    const b = moneyFromRupees('49.75');
    expect(addMoney(a, b).paise).toBe(20000n);
    expect(subtractMoney(a, b).paise).toBe(10050n);
  });

  it('performs multiplication and basis points percentage calculations', () => {
    const base = moneyFromRupees('1000.00'); // 100,000 paise
    expect(multiplyMoney(base, 3n).paise).toBe(300000n);
    expect(multiplyMoney(base, 1.5).paise).toBe(150000n);

    // 18% GST = 1800 basis points
    const gst = percentageOfMoney(base, 1800);
    expect(gst.paise).toBe(18000n); // ₹180.00
  });

  it('performs controlled division with rounding modes', () => {
    const m = moneyFromPaise(100n); // ₹1.00
    // 100 / 3 = 33.333... -> 33
    expect(divideMoney(m, 3n).paise).toBe(33n);
    expect(divideMoney(m, 3n, 'CEIL').paise).toBe(34n);
    expect(divideMoney(m, 3n, 'FLOOR').paise).toBe(33n);

    // Division by zero throws MoneyError
    expect(() => divideMoney(m, 0n)).toThrow(MoneyError);
  });

  it('correctly compares money instances', () => {
    const small = moneyFromRupees('10.00');
    const big = moneyFromRupees('20.00');
    expect(compareMoney(small, big)).toBe(-1);
    expect(compareMoney(big, small)).toBe(1);
    expect(compareMoney(small, moneyFromRupees('10.00'))).toBe(0);
    expect(isZero(ZERO_MONEY)).toBe(true);
    expect(isPositive(small)).toBe(true);
    expect(isNegative(moneyFromRupees('-5'))).toBe(true);
  });

  it('formats rupees according to the Indian Numbering System', () => {
    expect(formatRupees(moneyFromRupees('0'))).toBe('₹0.00');
    expect(formatRupees(moneyFromRupees('1000'))).toBe('₹1,000.00');
    expect(formatRupees(moneyFromRupees('100000'))).toBe('₹1,00,000.00');
    expect(formatRupees(moneyFromRupees('10000000'))).toBe('₹1,00,00,000.00');
    expect(formatRupees(moneyFromRupees('-500.50'))).toBe('-₹500.50');
    expect(formatRupees(moneyFromRupees('1500'), { hideDecimalsIfZero: true })).toBe('₹1,500');
  });

  it('serializes and deserializes safely without raw BigInt in JSON', () => {
    const original = moneyFromRupees('2540.75');
    const serialized = serializeMoney(original);

    expect(typeof serialized.paise).toBe('string');
    expect(serialized.paise).toBe('254075');
    expect(serialized.decimalAmount).toBe('2540.75');

    // JSON round-trip
    const jsonString = JSON.stringify(serialized);
    expect(jsonString).not.toContain('254075n');

    const deserialized = deserializeMoney(JSON.parse(jsonString));
    expect(deserialized.paise).toBe(254075n);
    expect(deserialized.currency).toBe('INR');
  });

  it('throws MoneyError on invalid rupee strings', () => {
    expect(() => moneyFromRupees('abc')).toThrow(MoneyError);
    expect(() => moneyFromRupees('10.20.30')).toThrow(MoneyError);
    expect(() => moneyFromRupees('')).toThrow(MoneyError);
  });
});
