import { describe, it, expect } from 'vitest';
import { analyzeIncome } from '../domain/income';
import { NormalizedTransaction } from '../domain/transactions';
import { moneyFromRupees } from '../domain/money';

function makeIncomeTx(id: string, date: string, rupees: string): NormalizedTransaction {
  return {
    id,
    date,
    rawDescription: 'Income deposit',
    normalizedMerchant: 'Client Payout',
    amount: moneyFromRupees(rupees),
    type: 'INCOME',
    category: 'INCOME',
    sourceReference: 'statement.csv',
    sourceRowNumber: 1,
    confidence: 1.0,
  };
}

describe('Income Analysis Domain Module', () => {
  it('calculates statistics for stable monthly income', () => {
    const txs: NormalizedTransaction[] = [
      makeIncomeTx('1', '2024-01-10', '25000'),
      makeIncomeTx('2', '2024-02-10', '25500'),
      makeIncomeTx('3', '2024-03-10', '25000'),
      makeIncomeTx('4', '2024-04-10', '25200'),
    ];

    const result = analyzeIncome(txs);
    expect(result.sampleMonthsCount).toBe(4);
    expect(result.volatilityRating).toBe('LOW');
    expect(result.coefficientOfVariation).toBeLessThan(0.15);
    expect(result.totalIncome.paise).toBe(10070000n);
    expect(result.trend).toBe('STABLE');
  });

  it('detects high volatility and establishes conservative planning baseline', () => {
    // Highly fluctuating gig income: ₹15,000 -> ₹42,000 -> ₹18,000 -> ₹38,000
    const txs: NormalizedTransaction[] = [
      makeIncomeTx('1', '2024-01-15', '15000'),
      makeIncomeTx('2', '2024-02-15', '42000'),
      makeIncomeTx('3', '2024-03-15', '18000'),
      makeIncomeTx('4', '2024-04-15', '38000'),
    ];

    const result = analyzeIncome(txs);
    expect(result.volatilityRating).toBe('HIGH');
    expect(result.coefficientOfVariation).toBeGreaterThanOrEqual(0.35);

    // Conservative baseline must be strictly lower than mean to protect against downside
    expect(result.conservativeBaselineMonthly.paise).toBeLessThan(result.monthlyAverage.paise);
  });

  it('handles zero income dataset gracefully', () => {
    const result = analyzeIncome([]);
    expect(result.totalIncome.paise).toBe(0n);
    expect(result.volatilityRating).toBe('INSUFFICIENT_DATA');
    expect(result.confidence).toBe('INSUFFICIENT_DATA');
    expect(result.dataLimitations.length).toBeGreaterThan(0);
  });

  it('handles single month of data with explicit limitation disclosure', () => {
    const txs: NormalizedTransaction[] = [
      makeIncomeTx('1', '2024-01-05', '10000'),
      makeIncomeTx('2', '2024-01-20', '15000'),
    ];

    const result = analyzeIncome(txs);
    expect(result.sampleMonthsCount).toBe(1);
    expect(result.coefficientOfVariation).toBeNull();
    expect(result.volatilityRating).toBe('INSUFFICIENT_DATA');
    expect(result.dataLimitations.some((l) => l.includes('Only 1 month'))).toBe(true);
  });

  it('detects contracting income trend over 3+ months', () => {
    const txs: NormalizedTransaction[] = [
      makeIncomeTx('1', '2024-01-15', '35000'),
      makeIncomeTx('2', '2024-02-15', '26000'),
      makeIncomeTx('3', '2024-03-15', '18000'),
    ];

    const result = analyzeIncome(txs);
    expect(result.trend).toBe('CONTRACTING');
  });
});
