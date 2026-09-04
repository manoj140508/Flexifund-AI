import { describe, it, expect } from 'vitest';
import { detectSavingsOpportunities, calculateSavingsCapacity } from '../domain/savings';
import { analyzeIncome } from '../domain/income';
import { analyzeExpenses } from '../domain/expenses';
import { NormalizedTransaction } from '../domain/transactions';
import { moneyFromRupees } from '../domain/money';

function makeTx(id: string, date: string, rupees: string, merchant: string, type: 'INCOME' | 'EXPENSE', cat: any): NormalizedTransaction {
  return {
    id,
    date,
    rawDescription: `${merchant} transaction`,
    normalizedMerchant: merchant,
    amount: moneyFromRupees(rupees),
    type,
    category: cat,
    sourceReference: 'statement.csv',
    sourceRowNumber: 1,
    confidence: 1.0,
  };
}

describe('Money-Saving Opportunity Engine & Savings Capacity', () => {
  it('detects recurring discretionary payment opportunity with conservative annualization', () => {
    // 3 monthly recurring streaming payments of ₹799
    const txs: NormalizedTransaction[] = [
      makeTx('1', '2024-01-05', '799', 'Netflix', 'EXPENSE', 'DISCRETIONARY'),
      makeTx('2', '2024-02-04', '799', 'Netflix', 'EXPENSE', 'DISCRETIONARY'),
      makeTx('3', '2024-03-05', '799', 'Netflix', 'EXPENSE', 'DISCRETIONARY'),
      makeTx('4', '2024-01-10', '30000', 'Client', 'INCOME', 'INCOME'),
      makeTx('5', '2024-02-10', '32000', 'Client', 'INCOME', 'INCOME'),
      makeTx('6', '2024-03-10', '28000', 'Client', 'INCOME', 'INCOME'),
    ];

    const income = analyzeIncome(txs);
    const expenses = analyzeExpenses(txs);

    const opportunities = detectSavingsOpportunities({ incomeAnalysis: income, expenseAnalysis: expenses });
    expect(opportunities.length).toBeGreaterThanOrEqual(1);

    const netflixOpp = opportunities.find((o) => o.category === 'RECURRING_DISCRETIONARY_PAYMENT');
    expect(netflixOpp).toBeDefined();
    expect(netflixOpp?.potentialMonthlySaving?.paise).toBe(79900n);
    expect(netflixOpp?.potentialAnnualSaving?.paise).toBe(79900n * 12n);
    expect(netflixOpp?.description).toContain('Netflix');
    expect(netflixOpp?.recommendedAction).toContain('reviewing');
  });

  it('detects avoidable bank fees opportunity when repeated charges occur', () => {
    const txs: NormalizedTransaction[] = [
      makeTx('1', '2024-01-15', '236', 'Bank Non-Maintenance Fee', 'EXPENSE', 'FEES_CHARGES'),
      makeTx('2', '2024-02-15', '236', 'Bank Non-Maintenance Fee', 'EXPENSE', 'FEES_CHARGES'),
      makeTx('3', '2024-01-01', '20000', 'Salary', 'INCOME', 'INCOME'),
    ];

    const income = analyzeIncome(txs);
    const expenses = analyzeExpenses(txs);

    const opportunities = detectSavingsOpportunities({ incomeAnalysis: income, expenseAnalysis: expenses });
    const feeOpp = opportunities.find((o) => o.category === 'AVOIDABLE_FEES_CHARGES');
    expect(feeOpp).toBeDefined();
    expect(feeOpp?.title).toContain('Avoidable Account & Service Fees');
    expect(feeOpp?.evidence.sourceTransactionIds.length).toBe(2);
  });

  it('calculates deterministic savings capacity range adapting to conservative income', () => {
    // Gig income: ₹20,000 (lean) to ₹40,000 (peak). Conservative reference ~₹20,000.
    // Essential burn: ₹12,000.
    const txs: NormalizedTransaction[] = [
      makeTx('1', '2024-01-01', '20000', 'Income', 'INCOME', 'INCOME'),
      makeTx('2', '2024-02-01', '40000', 'Income', 'INCOME', 'INCOME'),
      makeTx('3', '2024-03-01', '30000', 'Income', 'INCOME', 'INCOME'),
      makeTx('4', '2024-01-10', '12000', 'Landlord', 'EXPENSE', 'ESSENTIAL_HOUSING'),
      makeTx('5', '2024-02-10', '12000', 'Landlord', 'EXPENSE', 'ESSENTIAL_HOUSING'),
      makeTx('6', '2024-03-10', '12000', 'Landlord', 'EXPENSE', 'ESSENTIAL_HOUSING'),
    ];

    const income = analyzeIncome(txs);
    const expenses = analyzeExpenses(txs);

    const capacity = calculateSavingsCapacity(income, expenses);
    expect(capacity.status).toBe('ESTIMATED_RANGE');
    expect(capacity.minimumMonthlySavings.paise).toBeGreaterThan(0n);
    expect(capacity.maximumMonthlySavings.paise).toBeGreaterThanOrEqual(capacity.minimumMonthlySavings.paise);
    expect(capacity.disclaimer).toContain('estimate based on the financial data provided');
  });

  it('handles zero or lean surplus by not forcing savings that create financial stress', () => {
    // Lean income: ₹15,000. Essential burn: ₹15,500.
    const txs: NormalizedTransaction[] = [
      makeTx('1', '2024-01-01', '15000', 'Income', 'INCOME', 'INCOME'),
      makeTx('2', '2024-01-10', '15500', 'Groceries & Rent', 'EXPENSE', 'ESSENTIAL_GROCERIES'),
    ];

    const income = analyzeIncome(txs);
    const expenses = analyzeExpenses(txs);

    const capacity = calculateSavingsCapacity(income, expenses);
    expect(capacity.minimumMonthlySavings.paise).toBe(0n); // Does not force saving when essential burn absorbs income
    expect(capacity.explanation).toContain('essential living expenses');
  });

  it('detects repeated food delivery & dining moderation opportunity from transaction patterns', () => {
    const txs: NormalizedTransaction[] = [
      makeTx('1', '2024-01-01', '25000', 'Swiggy Partner', 'INCOME', 'INCOME'),
      makeTx('2', '2024-01-03', '450', 'ZOMATO ORDER', 'EXPENSE', 'DISCRETIONARY'),
      makeTx('3', '2024-01-08', '520', 'SWIGGY FOOD', 'EXPENSE', 'DISCRETIONARY'),
      makeTx('4', '2024-01-15', '680', 'DOMINOS PIZZA', 'EXPENSE', 'DISCRETIONARY'),
      makeTx('5', '2024-01-22', '350', 'ZOMATO ORDER', 'EXPENSE', 'DISCRETIONARY'),
      makeTx('6', '2024-01-10', '5000', 'House Rent', 'EXPENSE', 'ESSENTIAL_HOUSING'),
    ];

    const income = analyzeIncome(txs);
    const expenses = analyzeExpenses(txs);

    const opportunities = detectSavingsOpportunities({ incomeAnalysis: income, expenseAnalysis: expenses, transactions: txs });
    const diningOpp = opportunities.find((o) => o.category === 'REPEATED_DISCRETIONARY_SPEND');
    expect(diningOpp).toBeDefined();
    expect(diningOpp?.title).toContain('Food Delivery & Dining Out');
    expect(diningOpp?.observedSpending?.paise).toBe(200000n); // ₹2,000 total
    expect(diningOpp?.potentialMonthlySaving?.paise).toBe(50000n); // 25% = ₹500
    expect(diningOpp?.evidence.sourceTransactionIds.length).toBe(4);
    expect(diningOpp?.recommendedAction).toContain('weekly takeout cap');
  });

  it('detects work expense optimization without suggesting eliminating essential transit', () => {
    const txs: NormalizedTransaction[] = [
      makeTx('1', '2024-01-01', '30000', 'Uber Driver Payout', 'INCOME', 'INCOME'),
      makeTx('2', '2024-01-05', '1200', 'INDIAN OIL PETROL', 'EXPENSE', 'WORK_FUEL_TRANSIT'),
      makeTx('3', '2024-01-12', '1200', 'HPCL PETROL PUMP', 'EXPENSE', 'WORK_FUEL_TRANSIT'),
      makeTx('4', '2024-01-19', '1200', 'BPCL PETROL', 'EXPENSE', 'WORK_FUEL_TRANSIT'),
      makeTx('5', '2024-01-26', '1200', 'SHELL PETROL', 'EXPENSE', 'WORK_FUEL_TRANSIT'),
    ];

    const income = analyzeIncome(txs);
    const expenses = analyzeExpenses(txs);

    const opportunities = detectSavingsOpportunities({ incomeAnalysis: income, expenseAnalysis: expenses, transactions: txs });
    const workOpp = opportunities.find((o) => o.category === 'WORK_EXPENSE_OPTIMIZATION');
    expect(workOpp).toBeDefined();
    expect(workOpp?.title).toContain('Fuel Cashback');
    expect(workOpp?.recommendedAction).toContain('IOCL');
    expect(workOpp?.description).toContain('essential to your livelihood');
  });
});

