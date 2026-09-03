/**
 * Money Domain Module - Integer Paise (Minor Currency Unit) Arithmetic
 * 
 * 1 INR = 100 Paise.
 * Internal representation uses BigInt to completely eliminate floating-point rounding errors.
 * 
 * Non-negotiable: BigInt must never be serialized directly to JSON.
 * Helper functions serialize to / deserialize from wire formats (strings/objects).
 */

export interface Money {
  readonly paise: bigint;
  readonly currency: 'INR';
}

export interface SerializedMoney {
  paise: string; // e.g. "10050"
  decimalAmount: string; // e.g. "100.50"
  currency: 'INR';
}

export type RoundingMode = 'HALF_EVEN' | 'FLOOR' | 'CEIL' | 'TRUNC';

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

/**
 * Creates a Money instance from an integer count of paise.
 */
export function moneyFromPaise(paise: bigint | number): Money {
  const bigintPaise = typeof paise === 'number' ? BigInt(Math.trunc(paise)) : paise;
  return {
    paise: bigintPaise,
    currency: 'INR',
  };
}

/**
 * Creates a Money instance from a decimal rupee string or number.
 * e.g. "100.50" -> 10050n, "-25.00" -> -2500n
 */
export function moneyFromRupees(rupees: string | number): Money {
  if (typeof rupees === 'number') {
    if (!Number.isFinite(rupees)) {
      throw new MoneyError(`Invalid rupee number: ${rupees}`);
    }
    rupees = rupees.toFixed(2);
  }

  const trimmed = rupees.trim();
  if (!trimmed || trimmed === '.') {
    throw new MoneyError(`Empty or invalid rupee string: "${rupees}"`);
  }

  const isNegative = trimmed.startsWith('-');
  const clean = isNegative ? trimmed.slice(1) : trimmed;

  const parts = clean.split('.');
  if (parts.length > 2) {
    throw new MoneyError(`Malformed rupee string with multiple decimal points: "${rupees}"`);
  }

  const wholeStr = parts[0] || '0';
  const fracStr = (parts[1] || '').padEnd(2, '0').slice(0, 2);

  if (!/^\d+$/.test(wholeStr) || !/^\d+$/.test(fracStr)) {
    throw new MoneyError(`Malformed rupee amount: "${rupees}"`);
  }

  const totalPaise = BigInt(wholeStr) * 100n + BigInt(fracStr);
  return {
    paise: isNegative ? -totalPaise : totalPaise,
    currency: 'INR',
  };
}

export const ZERO_MONEY: Money = Object.freeze({ paise: 0n, currency: 'INR' });

/**
 * Addition
 */
export function addMoney(a: Money, b: Money): Money {
  return {
    paise: a.paise + b.paise,
    currency: 'INR',
  };
}

/**
 * Subtraction
 */
export function subtractMoney(a: Money, b: Money): Money {
  return {
    paise: a.paise - b.paise,
    currency: 'INR',
  };
}

/**
 * Multiplication by an integer or a ratio.
 */
export function multiplyMoney(m: Money, multiplier: bigint | number): Money {
  if (typeof multiplier === 'number') {
    if (!Number.isFinite(multiplier)) {
      throw new MoneyError(`Invalid multiplier: ${multiplier}`);
    }
    // Scale by 10,000 for precision, then divide
    const scaled = Math.round(multiplier * 10000);
    const result = (m.paise * BigInt(scaled) + 5000n) / 10000n;
    return { paise: result, currency: 'INR' };
  }
  return {
    paise: m.paise * multiplier,
    currency: 'INR',
  };
}

/**
 * Integer division with controlled rounding.
 */
export function divideMoney(m: Money, divisor: bigint | number, mode: RoundingMode = 'HALF_EVEN'): Money {
  const d = typeof divisor === 'number' ? BigInt(Math.trunc(divisor)) : divisor;
  if (d === 0n) {
    throw new MoneyError('Division by zero in Money arithmetic');
  }

  const quotient = m.paise / d;
  const remainder = m.paise % d;

  if (remainder === 0n) {
    return { paise: quotient, currency: 'INR' };
  }

  switch (mode) {
    case 'TRUNC':
      return { paise: quotient, currency: 'INR' };
    case 'FLOOR':
      return {
        paise: (m.paise < 0n !== d < 0n) ? quotient - 1n : quotient,
        currency: 'INR',
      };
    case 'CEIL':
      return {
        paise: (m.paise < 0n === d < 0n) ? quotient + 1n : quotient,
        currency: 'INR',
      };
    case 'HALF_EVEN':
    default: {
      const doubledRemainder = (remainder < 0n ? -remainder : remainder) * 2n;
      const absDivisor = d < 0n ? -d : d;
      if (doubledRemainder > absDivisor) {
        return {
          paise: (m.paise < 0n !== d < 0n) ? quotient - 1n : quotient + 1n,
          currency: 'INR',
        };
      } else if (doubledRemainder === absDivisor) {
        // Round to even
        const isOdd = (quotient & 1n) !== 0n;
        return {
          paise: isOdd ? ((m.paise < 0n !== d < 0n) ? quotient - 1n : quotient + 1n) : quotient,
          currency: 'INR',
        };
      }
      return { paise: quotient, currency: 'INR' };
    }
  }
}

/**
 * Calculates a basis points percentage: (paise * basisPoints) / 10000
 * e.g., 2000 basis points = 20.00%
 */
export function percentageOfMoney(m: Money, basisPoints: number): Money {
  const bp = BigInt(Math.round(basisPoints));
  const result = (m.paise * bp + 5000n) / 10000n;
  return { paise: result, currency: 'INR' };
}

/**
 * Comparisons
 */
export function isZero(m: Money): boolean {
  return m.paise === 0n;
}

export function isPositive(m: Money): boolean {
  return m.paise > 0n;
}

export function isNegative(m: Money): boolean {
  return m.paise < 0n;
}

export function compareMoney(a: Money, b: Money): number {
  if (a.paise < b.paise) return -1;
  if (a.paise > b.paise) return 1;
  return 0;
}

export function minMoney(a: Money, b: Money): Money {
  return a.paise <= b.paise ? a : b;
}

export function maxMoney(a: Money, b: Money): Money {
  return a.paise >= b.paise ? a : b;
}

export function absMoney(m: Money): Money {
  return m.paise < 0n ? { paise: -m.paise, currency: 'INR' } : m;
}

/**
 * Format as Indian Rupee string: e.g. "1,00,500.50"
 */
export function formatRupees(m: Money, options: { includeSymbol?: boolean; hideDecimalsIfZero?: boolean } = {}): string {
  const isNeg = m.paise < 0n;
  const absPaise = isNeg ? -m.paise : m.paise;
  const whole = absPaise / 100n;
  const frac = absPaise % 100n;

  // Indian Numbering System formatting for whole part
  const wholeStr = whole.toString();
  let formattedWhole = '';
  if (wholeStr.length <= 3) {
    formattedWhole = wholeStr;
  } else {
    const last3 = wholeStr.slice(-3);
    const remaining = wholeStr.slice(0, -3);
    const withCommas = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedWhole = `${withCommas},${last3}`;
  }

  let formatted = '';
  if (options.hideDecimalsIfZero && frac === 0n) {
    formatted = formattedWhole;
  } else {
    formatted = `${formattedWhole}.${frac.toString().padStart(2, '0')}`;
  }

  const prefix = isNeg ? '-' : '';
  const symbol = options.includeSymbol !== false ? '₹' : '';
  return `${prefix}${symbol}${formatted}`;
}

/**
 * Safe Serialization for API boundaries (BigInt -> SerializedMoney)
 */
export function serializeMoney(m: Money): SerializedMoney {
  const isNeg = m.paise < 0n;
  const absPaise = isNeg ? -m.paise : m.paise;
  const whole = absPaise / 100n;
  const frac = absPaise % 100n;
  const sign = isNeg ? '-' : '';

  return {
    paise: m.paise.toString(),
    decimalAmount: `${sign}${whole.toString()}.${frac.toString().padStart(2, '0')}`,
    currency: 'INR',
  };
}

/**
 * Deserialization from API boundary (SerializedMoney or string -> Money)
 */
export function deserializeMoney(input: SerializedMoney | string | bigint): Money {
  if (typeof input === 'bigint') {
    return { paise: input, currency: 'INR' };
  }
  if (typeof input === 'string') {
    // If it's pure integer digits (possibly with minus), treat as paise
    if (/^-?\d+$/.test(input.trim())) {
      return { paise: BigInt(input.trim()), currency: 'INR' };
    }
    // Otherwise treat as decimal rupee string
    return moneyFromRupees(input);
  }
  if (input && typeof input.paise === 'string') {
    return { paise: BigInt(input.paise), currency: 'INR' };
  }
  throw new MoneyError(`Cannot deserialize invalid money representation: ${JSON.stringify(input)}`);
}
