import { describe, it, expect } from 'vitest';
import { parseTransactionCSV } from '../lib/csv-parser';
import { runFinancialAnalysis, serializeFinancialAnalysisResult } from '../domain/analysis';
import { moneyFromRupees } from '../domain/money';

describe('Complete Master Financial Analysis Pipeline', () => {
  it('processes Format C (Withdrawal, Deposit, Balance) through the complete pipeline', () => {
    const formatCCsv = `Date,Narration,Withdrawal,Deposit,Balance
05/01/2024,Swiggy Payout,,28500.00,28500.00
10/01/2024,House Rent,8000.00,,20500.00
15/01/2024,D-Mart Provision,3500.00,,17000.00
18/01/2024,Indian Oil Petrol,1500.00,,15500.00
20/01/2024,Netflix Subscription,499.00,,15001.00
05/02/2024,Swiggy Payout,,34000.00,49001.00
10/02/2024,House Rent,8000.00,,41001.00
15/02/2024,D-Mart Provision,3800.00,,37201.00
18/02/2024,Indian Oil Petrol,1600.00,,35601.00
20/02/2024,Netflix Subscription,499.00,,35102.00
05/03/2024,Swiggy Payout,,22000.00,57102.00
10/03/2024,House Rent,8000.00,,49102.00
15/03/2024,D-Mart Provision,3400.00,,45702.00
18/03/2024,Indian Oil Petrol,1400.00,,44302.00
20/03/2024,Netflix Subscription,499.00,,43803.00`;

    const parseResult = parseTransactionCSV(formatCCsv, 'bank_passbook.csv');
    expect(parseResult.validTransactions.length).toBe(15);
    expect(parseResult.rejectedRows.length).toBe(0);

    // Run master pipeline with user provided cash balance
    const analysis = runFinancialAnalysis({
      transactions: parseResult.validTransactions,
      rejectedRows: parseResult.rejectedRows,
      warnings: parseResult.warnings,
      statistics: parseResult.statistics,
      userProvidedCashBalance: moneyFromRupees('43803.00'),
      proposedMonthlyRepaymentPaise: 300000n, // Proposed ₹3,000/mo commitment
      sourceReference: 'bank_passbook.csv',
    });

    // 1. Data Quality
    expect(analysis.dataQuality.scoreGrade).toBe('A');
    expect(analysis.dataQuality.observedMonths).toBe(3);
    expect(analysis.dataQuality.validRows).toBe(15);

    // 2. Income Metrics
    expect(analysis.incomeAnalysis.sampleMonthsCount).toBe(3);
    expect(analysis.incomeAnalysis.monthlyBreakdown.length).toBe(3);
    expect(analysis.incomeAnalysis.conservativeBaselineMonthly.paise).toBeGreaterThan(0n);
    expect(analysis.incomeAnalysis.incomeConcentration?.topSourceMerchant).toContain('Swiggy');

    // 3. Expense Metrics
    expect(analysis.expenseAnalysis.essentialMonthlyBurn.paise).toBeGreaterThan(0n);
    expect(analysis.expenseAnalysis.recurringPayments.length).toBeGreaterThanOrEqual(1);

    // 4. Savings Opportunities
    expect(analysis.savingsOpportunities.length).toBeGreaterThan(0);
    const netflix = analysis.savingsOpportunities.find((o) => o.category === 'RECURRING_DISCRETIONARY_PAYMENT');
    expect(netflix).toBeDefined();

    // 5. Resilience & Cash Buffer
    expect(analysis.resilienceAnalysis.isEstimatedFromHistoricalOnly).toBe(false);
    expect(analysis.resilienceAnalysis.bufferCoverageDays).toBeGreaterThan(30);
    expect(analysis.resilienceAnalysis.resilienceScore).toBeGreaterThanOrEqual(60);

    // 6. Proposed Repayment
    expect(analysis.proposedRepaymentEvaluation).toBeDefined();
    expect(analysis.proposedRepaymentEvaluation?.pressureLevel).toBeDefined();

    // 7. Evidence Registry
    expect(analysis.evidenceRecords.length).toBeGreaterThanOrEqual(3);

    // 8. Safe JSON Serialization without BigInt
    const serialized = serializeFinancialAnalysisResult(analysis);
    const jsonStr = JSON.stringify(serialized);
    expect(jsonStr).not.toContain('n,');
    expect(typeof serialized.incomeAnalysis.totalIncome.paise).toBe('string');
    expect(typeof serialized.expenseAnalysis.essentialMonthlyBurn.paise).toBe('string');
  });

  it('marks emergency coverage as INSUFFICIENT_DATA when user cash balance is not provided', () => {
    const csv = `Date,Description,Amount,Type
2024-01-01,Client Payout,25000,CR
2024-01-10,Groceries,8000,DR`;

    const parseResult = parseTransactionCSV(csv);
    const analysis = runFinancialAnalysis({
      transactions: parseResult.validTransactions,
      rejectedRows: parseResult.rejectedRows,
      warnings: parseResult.warnings,
      userProvidedCashBalance: null, // No cash balance
    });

    expect(analysis.resilienceAnalysis.coverageStatus).toBe('INSUFFICIENT_DATA');
    expect(analysis.resilienceAnalysis.bufferCoverageDays).toBeNull();
    expect(analysis.resilienceAnalysis.isEstimatedFromHistoricalOnly).toBe(true);
    expect(analysis.allLimitations.some((l) => l.includes('Current cash balance not provided'))).toBe(true);
  });
});
