import { describe, it, expect } from 'vitest';
import { analyzeResilience } from '../domain/resilience';
import { analyzeIncome } from '../domain/income';
import { analyzeExpenses } from '../domain/expenses';
import { NormalizedTransaction } from '../domain/transactions';
import { moneyFromRupees } from '../domain/money';
import { runFinancialAnalysis, serializeFinancialAnalysisResult, recalculateResilienceWithCash } from '../domain/analysis';
import { detectFinancialStress } from '../domain/stress';

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

  it('recalculates resilience dynamically when user updates current cash', () => {
    const txs: NormalizedTransaction[] = [
      makeTx('1', '2024-01-01', '30000', 'INCOME', 'INCOME'),
      makeTx('2', '2024-01-01', '7500', 'EXPENSE', 'ESSENTIAL_GROCERIES'),
      makeTx('3', '2024-01-30', '7500', 'EXPENSE', 'ESSENTIAL_HOUSING'),
    ];

    // Initial analysis without cash
    const raw = runFinancialAnalysis({ transactions: txs });
    const serialized = serializeFinancialAnalysisResult(raw);

    expect(serialized.resilienceAnalysis.bufferCoverageDays).toBeNull();
    expect(serialized.resilienceAnalysis.coverageStatus).toBe('INSUFFICIENT_DATA');

    // Step 1: User provides ₹10,000 cash
    const updated1 = recalculateResilienceWithCash(serialized, 1000000n);
    expect(updated1.resilienceAnalysis.bufferCoverageDays).not.toBeNull();
    expect(updated1.resilienceAnalysis.coverageStatus).not.toBe('INSUFFICIENT_DATA');
    const days1 = updated1.resilienceAnalysis.bufferCoverageDays!;
    expect(days1).toBeGreaterThan(0);

    // Step 2: User updates to ₹20,000 cash (should double runway)
    const updated2 = recalculateResilienceWithCash(serialized, 2000000n);
    const days2 = updated2.resilienceAnalysis.bufferCoverageDays!;
    expect(days2).toBe(days1 * 2);

    // Step 3: User clears cash balance
    const updated3 = recalculateResilienceWithCash(serialized, null);
    expect(updated3.resilienceAnalysis.bufferCoverageDays).toBeNull();
    expect(updated3.resilienceAnalysis.coverageStatus).toBe('INSUFFICIENT_DATA');
  });

  it('detects low runway stress indicator when provided cash provides < 14 days coverage', () => {
    const txs: NormalizedTransaction[] = [
      makeTx('1', '2024-01-01', '30000', 'INCOME', 'INCOME'),
      makeTx('2', '2024-01-15', '15000', 'EXPENSE', 'ESSENTIAL_GROCERIES'),
    ];

    const income = analyzeIncome(txs);
    const expenses = analyzeExpenses(txs);

    // ₹2,000 cash provides ~4 days of coverage
    const lowCash = moneyFromRupees('2000');
    const resilience = analyzeResilience({
      incomeAnalysis: income,
      expenseAnalysis: expenses,
      userProvidedCashBalance: lowCash,
    });

    const stress = detectFinancialStress({
      incomeAnalysis: income,
      expenseAnalysis: expenses,
      resilienceAnalysis: resilience,
    });

    const bufferStress = stress.find((s) => s.id === 'stress_limited_buffer_coverage');
    expect(bufferStress).toBeDefined();
    expect(bufferStress?.title).toBe('Limited emergency coverage');
  });
});
