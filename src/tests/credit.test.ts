import { describe, it, expect } from 'vitest';
import { evaluateProposedRepayment, simulateWhatIfScenario } from '../domain/credit';
import { analyzeIncome } from '../domain/income';
import { analyzeExpenses } from '../domain/expenses';
import { analyzeResilience } from '../domain/resilience';
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

describe('Responsible Credit Analysis & What-If Engine', () => {
  const txs: NormalizedTransaction[] = [
    makeTx('1', '2024-01-01', '28000', 'INCOME', 'INCOME'),
    makeTx('2', '2024-02-01', '32000', 'INCOME', 'INCOME'),
    makeTx('3', '2024-03-01', '25000', 'INCOME', 'INCOME'),
    makeTx('4', '2024-01-10', '12000', 'EXPENSE', 'ESSENTIAL_GROCERIES'),
    makeTx('5', '2024-02-10', '12000', 'EXPENSE', 'ESSENTIAL_GROCERIES'),
    makeTx('6', '2024-03-10', '12000', 'EXPENSE', 'ESSENTIAL_GROCERIES'),
  ];

  const income = analyzeIncome(txs);
  const expenses = analyzeExpenses(txs);
  const resilience = analyzeResilience({
    incomeAnalysis: income,
    expenseAnalysis: expenses,
    userProvidedCashBalance: moneyFromRupees('30000'),
  });

  const context = {
    incomeAnalysis: income,
    expenseAnalysis: expenses,
    resilienceAnalysis: resilience,
  };

  it('evaluates proposed monthly repayment and identifies higher pressure responsibly', () => {
    // Proposed ₹10,000/mo repayment (1000000 paise) on ~₹25,000 conservative baseline (~40% ratio)
    const result = evaluateProposedRepayment(context, 1000000n);

    expect(result.pressureLevel).toBe('HIGHER_PRESSURE');
    expect(result.conservativeIncomeCoverageRatio).toBeGreaterThan(30);
    expect(result.guidanceSummary).toContain('higher financial pressure');
    expect(result.saferAlternativeAdvice).toBeDefined();
    expect(result.disposableIncomeDelta.paise).toBe(-1000000n);
  });

  it('evaluates a small proposed repayment with lower pressure', () => {
    // Proposed ₹1,000/mo repayment (100000 paise)
    const result = evaluateProposedRepayment(context, 100000n);
    expect(result.pressureLevel).toBe('LOWER_PRESSURE');
    expect(result.guidanceSummary).toContain('lower impact');
  });

  it('simulates an income reduction shock (-20%) and projects tightened margins', () => {
    const result = simulateWhatIfScenario(context, {
      incomeChangePercent: -20,
    });

    expect(result.incomeMetric.projected.paise).toBeLessThan(result.incomeMetric.baseline.paise);
    expect(result.monthlySurplusMetric.projected.paise).toBeLessThan(result.monthlySurplusMetric.baseline.paise);
  });

  it('simulates essential expense increase (+₹3,000 inflation) and recalculates coverage days', () => {
    const result = simulateWhatIfScenario(context, {
      essentialExpenseChangePaise: 300000n,
    });

    expect(result.essentialExpenseMetric.projected.paise).toBeGreaterThan(result.essentialExpenseMetric.baseline.paise);
    if (result.coverageDaysDelta !== null) {
      expect(result.coverageDaysDelta).toBeLessThan(0); // Coverage days decrease
    }
  });
});
