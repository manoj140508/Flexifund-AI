import { describe, it, expect } from 'vitest';
import { analyzeExpenses } from '../domain/expenses';
import { NormalizedTransaction } from '../domain/transactions';
import { moneyFromRupees } from '../domain/money';

function makeExpenseTx(id: string, date: string, rupees: string, merchant: string, cat: any): NormalizedTransaction {
  return {
    id,
    date,
    rawDescription: `${merchant} payment`,
    normalizedMerchant: merchant,
    amount: moneyFromRupees(rupees),
    type: 'EXPENSE',
    category: cat,
    sourceReference: 'statement.csv',
    sourceRowNumber: 1,
    confidence: 0.9,
  };
}

describe('Expense Analysis Domain Module', () => {
  it('categorizes expenses and computes essential burn rates', () => {
    const txs: NormalizedTransaction[] = [
      makeExpenseTx('1', '2024-01-05', '8000', 'Landlord House Rent', 'ESSENTIAL_HOUSING'),
      makeExpenseTx('2', '2024-01-10', '3000', 'D-Mart Supermarket', 'ESSENTIAL_GROCERIES'),
      makeExpenseTx('3', '2024-01-15', '2000', 'IOCL Petrol Pump', 'WORK_FUEL_TRANSIT'),
      makeExpenseTx('4', '2024-01-20', '1500', 'Netflix & Swiggy', 'DISCRETIONARY'),
      makeExpenseTx('5', '2024-01-25', '120', 'Bank SMS Charge', 'FEES_CHARGES'),
    ];

    const result = analyzeExpenses(txs);
    expect(result.totalExpenses.paise).toBe(1462000n);
    expect(result.essentialMonthlyBurn.paise).toBe(1300000n); // 8000 + 3000 + 2000 = 13000
    expect(result.discretionaryMonthlyBurn.paise).toBe(150000n);
    expect(result.feesAndChargesTotal.paise).toBe(12000n);
  });

  it('detects recurring payment clusters from empirical interval evidence', () => {
    // 3 monthly recurring payments spaced ~30 days apart
    const txs: NormalizedTransaction[] = [
      makeExpenseTx('1', '2024-01-05', '499', 'Netflix Subscription', 'DISCRETIONARY'),
      makeExpenseTx('2', '2024-02-04', '499', 'Netflix Subscription', 'DISCRETIONARY'),
      makeExpenseTx('3', '2024-03-05', '499', 'Netflix Subscription', 'DISCRETIONARY'),
    ];

    const result = analyzeExpenses(txs);
    expect(result.recurringPayments.length).toBe(1);
    const cluster = result.recurringPayments[0];
    expect(cluster.normalizedMerchant).toBe('Netflix Subscription');
    expect(cluster.occurrencesCount).toBe(3);
    expect(cluster.confidence).toBe('HIGH');
  });

  it('does not falsely classify isolated one-off payments as recurring', () => {
    const txs: NormalizedTransaction[] = [
      makeExpenseTx('1', '2024-01-15', '5000', 'Bike Repair Garage', 'WORK_EQUIPMENT'),
    ];

    const result = analyzeExpenses(txs);
    expect(result.recurringPayments.length).toBe(0);
  });
});
