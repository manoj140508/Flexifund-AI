import { describe, it, expect } from 'vitest';
import { analyzeResilience } from '../domain/resilience';
import { analyzeIncome } from '../domain/income';
import { analyzeExpenses } from '../domain/expenses';
import { NormalizedTransaction } from '../domain/transactions';
import { moneyFromRupees } from '../domain/money';

function makeTx(id: string, date: string, rupees: string, type: 'INCOME' | 'EXPENSE', cat: any): NormalizedTransaction {
  return {
    id,
    date,
    rawDescription: 'Tx',
    normalizedMerchant: 'Merchant',
    amount: moneyFromRupees(rupees),
    type,
    category: cat,
    sourceReference: 'statement.csv',
    sourceRowNumber: 1,
    confidence: 1.0,
  };
}

describe('Resilience Analysis Domain Module', () => {
  it('calculates coverage days accurately when user provides real cash balance', () => {
    const txs: NormalizedTransaction[] = [
      makeTx('1', '2024-01-01', '30000', 'INCOME', 'INCOME'),
      makeTx('2', '2024-01-15', '15000', 'EXPENSE', 'ESSENTIAL_GROCERIES'),
      makeTx('3', '2024-01-30', '5000', 'EXPENSE', 'WORK_FUEL_TRANSIT'),
    ];

    const income = analyzeIncome(txs);
    const expenses = analyzeExpenses(txs);

    // User provides ₹40,000 confirmed available cash
    const userCash = moneyFromRupees('40000');
    const resilience = analyzeResilience({
      incomeAnalysis: income,
      expenseAnalysis: expenses,
      userProvidedCashBalance: userCash,
    });

    expect(resilience.isEstimatedFromHistoricalOnly).toBe(false);
    expect(resilience.userProvidedCurrentBalance?.paise).toBe(4000000n);
    expect(resilience.bufferCoverageDays).toBeGreaterThan(30);
    expect(resilience.resilienceScore).toBeGreaterThanOrEqual(50);
  });

  it('labels coverage as historical estimate when user does NOT provide cash balance', () => {
    const txs: NormalizedTransaction[] = [
      makeTx('1', '2024-01-01', '25000', 'INCOME', 'INCOME'),
      makeTx('2', '2024-01-15', '12000', 'EXPENSE', 'ESSENTIAL_GROCERIES'),
    ];

    const income = analyzeIncome(txs);
    const expenses = analyzeExpenses(txs);

    const resilience = analyzeResilience({
      incomeAnalysis: income,
      expenseAnalysis: expenses,
      userProvidedCashBalance: null, // User did not supply cash balance
    });

    expect(resilience.isEstimatedFromHistoricalOnly).toBe(true);
    expect(resilience.userProvidedCurrentBalance).toBeNull();
    expect(resilience.dataLimitations.some((l) => l.includes('Current cash balance'))).toBe(true);
  });

  it('handles zero essential expenses edge case without dividing by zero', () => {
    const txs: NormalizedTransaction[] = [
      makeTx('1', '2024-01-01', '20000', 'INCOME', 'INCOME'),
      makeTx('2', '2024-01-10', '2000', 'EXPENSE', 'DISCRETIONARY'),
    ];

    const income = analyzeIncome(txs);
    const expenses = analyzeExpenses(txs);

    const resilience = analyzeResilience({
      incomeAnalysis: income,
      expenseAnalysis: expenses,
      userProvidedCashBalance: moneyFromRupees('10000'),
    });

    expect(resilience.coverageStatus).toBe('NOT_CALCULABLE');
  });
});
