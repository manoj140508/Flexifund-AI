/**
 * Formatting Utilities
 * 
 * Standardized formatters for Indian currency, dates, percentages, and metrics.
 */

import { Money, formatRupees } from '../domain/money';

/**
 * Formats a money value or paise count into standard Indian Rupee notation.
 */
export function formatINR(val: Money | bigint | number, options?: { hideDecimalsIfZero?: boolean }): string {
  if (typeof val === 'number' || typeof val === 'bigint') {
    return formatRupees({ paise: BigInt(val), currency: 'INR' }, options);
  }
  return formatRupees(val, options);
}

/**
 * Formats basis points (e.g. 2500) into percentage string (e.g. "25.0%").
 */
export function formatBasisPoints(bp: number): string {
  return `${(bp / 100).toFixed(1)}%`;
}

/**
 * Formats a decimal ratio (e.g. 0.354) into percentage string (e.g. "35.4%").
 */
export function formatRatioPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/**
 * Formats ISO date string YYYY-MM-DD into human-readable Indian date format (DD MMM YYYY).
 */
export function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

/**
 * Formats month period YYYY-MM into MMM YYYY (e.g. "2024-03" -> "Mar 2024").
 */
export function formatMonthPeriod(periodKey: string): string {
  const parts = periodKey.split('-');
  if (parts.length !== 2) return periodKey;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[monthIdx] ?? parts[1]} ${year}`;
}
