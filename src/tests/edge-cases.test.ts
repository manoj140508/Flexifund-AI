import { describe, it, expect } from 'vitest';
import { parseTransactionCSV } from '../lib/csv-parser';
import { runFinancialAnalysis } from '../domain/analysis';
import { moneyFromRupees } from '../domain/money';

describe('Data Conditions & Edge Cases Audit', () => {
  it('handles empty CSV input safely', () => {
    const result = parseTransactionCSV('');
    expect(result.validTransactions.length).toBe(0);
    expect(result.rejectedRows.length).toBeGreaterThan(0);
    expect(result.rejectedRows[0].reason).toContain('Empty file');
  });

  it('handles CSV with missing required columns safely', () => {
    const csv = 'RandomColumn1,RandomColumn2\nVal1,Val2';
    const result = parseTransactionCSV(csv);
    expect(result.validTransactions.length).toBe(0);
    expect(result.rejectedRows.length).toBeGreaterThan(0);
  });

  it('handles invalid dates and invalid amounts by quarantining without crashing', () => {
    const csv = `Date,Description,Amount,Type
invalid-date,Swiggy Payout,25000,CR
01/01/2024,Swiggy Payout,not-a-number,CR
02/01/2024,Valid Payout,30000,CR`;
    const result = parseTransactionCSV(csv);
    expect(result.validTransactions.length).toBe(1);
    expect(result.rejectedRows.length).toBe(2);
    expect(result.validTransactions[0].amount.paise).toBe(3000000n);
  });

  it('detects duplicate transactions without dropping them', () => {
    const csv = `Date,Description,Amount,Type
01/01/2024,Swiggy Payout,25000,CR
01/01/2024,Swiggy Payout,25000,CR`;
    const result = parseTransactionCSV(csv);
    expect(result.validTransactions.length).toBe(2);
    expect(result.validTransactions.filter((tx) => tx.isDuplicateSuspected).length).toBe(1);
  });

  it('handles single-month history with appropriate confidence and data limitation warning', () => {
    const csv = `Date,Description,Amount,Type
01/01/2024,Swiggy Payout,25000,CR
15/01/2024,Swiggy Payout,20000,CR
10/01/2024,Rent,8000,DR`;
    const parsed = parseTransactionCSV(csv);
    const analysis = runFinancialAnalysis({
      transactions: parsed.validTransactions,
      rejectedRows: parsed.rejectedRows,
      warnings: parsed.warnings,
      statistics: parsed.statistics,
      sourceReference: 'single-month.csv',
    });

    expect(analysis.incomeAnalysis.sampleMonthsCount).toBe(1);
    expect(analysis.incomeAnalysis.volatilityRating).toBe('INSUFFICIENT_DATA');
    expect(analysis.incomeAnalysis.dataLimitations.length).toBeGreaterThan(0);
  });

  it('handles statement with zero income safely', () => {
    const csv = `Date,Description,Amount,Type
01/01/2024,Groceries,3000,DR
02/01/2024,Rent,8000,DR`;
    const parsed = parseTransactionCSV(csv);
    const analysis = runFinancialAnalysis({
      transactions: parsed.validTransactions,
      rejectedRows: parsed.rejectedRows,
      warnings: parsed.warnings,
      statistics: parsed.statistics,
      sourceReference: 'zero-income.csv',
    });

    expect(analysis.incomeAnalysis.totalIncome.paise).toBe(0n);
    expect(analysis.resilienceAnalysis.resilienceScore).toBeNull();
  });

  it('handles statement with zero expenses safely', () => {
    const csv = `Date,Description,Amount,Type
01/01/2024,Swiggy Payout,25000,CR
02/01/2024,Zomato Payout,15000,CR`;
    const parsed = parseTransactionCSV(csv);
    const analysis = runFinancialAnalysis({
      transactions: parsed.validTransactions,
      rejectedRows: parsed.rejectedRows,
      warnings: parsed.warnings,
      statistics: parsed.statistics,
      sourceReference: 'zero-expenses.csv',
    });

    expect(analysis.expenseAnalysis.totalExpenses.paise).toBe(0n);
    expect(analysis.expenseAnalysis.essentialMonthlyBurn.paise).toBe(0n);
  });

  it('correctly handles missing current cash balance by setting coverage to null and unconfirmed', () => {
    const csv = `Date,Description,Amount,Type
01/01/2024,Swiggy Payout,30000,CR
10/01/2024,Rent,10000,DR`;
    const parsed = parseTransactionCSV(csv);
    const analysisWithoutCash = runFinancialAnalysis({
      transactions: parsed.validTransactions,
      rejectedRows: parsed.rejectedRows,
      warnings: parsed.warnings,
      statistics: parsed.statistics,
      userProvidedCashBalance: null,
    });

    expect(analysisWithoutCash.resilienceAnalysis.userProvidedCurrentBalance).toBeNull();
    expect(analysisWithoutCash.resilienceAnalysis.bufferCoverageDays).toBeNull();
    expect(analysisWithoutCash.resilienceAnalysis.coverageStatus).toBe('INSUFFICIENT_DATA');
  });

  it('correctly uses user-provided current cash balance for buffer calculation', () => {
    const csv = `Date,Description,Amount,Type
01/01/2024,Swiggy Payout,30000,CR
10/01/2024,Rent,10000,DR`;
    const parsed = parseTransactionCSV(csv);
    const analysisWithCash = runFinancialAnalysis({
      transactions: parsed.validTransactions,
      rejectedRows: parsed.rejectedRows,
      warnings: parsed.warnings,
      statistics: parsed.statistics,
      userProvidedCashBalance: moneyFromRupees('20000'), // ₹20,000 provided by user
    });

    expect(analysisWithCash.resilienceAnalysis.userProvidedCurrentBalance).not.toBeNull();
    expect(analysisWithCash.resilienceAnalysis.userProvidedCurrentBalance?.paise).toBe(2000000n);
    expect(analysisWithCash.resilienceAnalysis.bufferCoverageDays).not.toBeNull();
    expect(analysisWithCash.resilienceAnalysis.coverageStatus).not.toBe('INSUFFICIENT_DATA');
  });

  it('handles negative surplus (expenses > income) without throwing and triggers stress indicators', () => {
    const csv = `Date,Description,Amount,Type
01/01/2024,Payout,15000,CR
05/01/2024,Rent,18000,DR
10/01/2024,D-Mart Provision,8000,DR`;
    const parsed = parseTransactionCSV(csv);
    const analysis = runFinancialAnalysis({
      transactions: parsed.validTransactions,
      rejectedRows: parsed.rejectedRows,
      warnings: parsed.warnings,
      statistics: parsed.statistics,
    });

    expect(analysis.resilienceAnalysis.estimatedHistoricalNetSurplus.paise).toBeLessThan(0n);
    const hasStressSignal = analysis.stressIndicators.some(
      (s) => s.severity === 'ELEVATED_CAUTION' || s.severity === 'MODERATE_CAUTION'
    );
    expect(hasStressSignal).toBe(true);
  });
});
