import { describe, it, expect } from 'vitest';
import { parseTransactionCSV, normalizeDate, parseAmountToPaise } from '../lib/csv-parser';

describe('CSV Ingestion & Normalization Module', () => {
  it('parses standard signed Amount CSV correctly', () => {
    const csv = `Date,Description,Amount
15/01/2024,Swiggy Partner Payout,12500.00
16/01/2024,IOCL Fuel Station,-450.50
17/01/2024,D-Mart Groceries,-1200.00`;

    const result = parseTransactionCSV(csv, 'test.csv');
    expect(result.validTransactions.length).toBe(3);
    expect(result.rejectedRows.length).toBe(0);

    const tx0 = result.validTransactions[0];
    expect(tx0.date).toBe('2024-01-15');
    expect(tx0.type).toBe('INCOME');
    expect(tx0.amount.paise).toBe(1250000n);
    expect(tx0.category).toBe('INCOME');

    const tx1 = result.validTransactions[1];
    expect(tx1.type).toBe('EXPENSE');
    expect(tx1.amount.paise).toBe(45050n);
    expect(tx1.category).toBe('WORK_FUEL_TRANSIT');
  });

  it('parses separate Debit / Credit format CSV', () => {
    const csv = `Txn Date,Narration,Debit,Credit
2024-02-01,Zomato Payout,,18400.00
2024-02-02,HP Petrol Pump,350.00,
2024-02-03,Bajaj Finance EMI,2500.00,`;

    const result = parseTransactionCSV(csv);
    expect(result.validTransactions.length).toBe(3);
    expect(result.validTransactions[0].type).toBe('INCOME');
    expect(result.validTransactions[0].amount.paise).toBe(1840000n);
    expect(result.validTransactions[1].type).toBe('EXPENSE');
    expect(result.validTransactions[1].category).toBe('WORK_FUEL_TRANSIT');
    expect(result.validTransactions[2].category).toBe('DEBT_REPAYMENT');
  });

  it('handles malformed rows and records explicit rejection reasons', () => {
    const csv = `Date,Description,Amount
2024-03-01,Valid Income,5000
invalid-date,Bad Date Transaction,100
2024-03-03,Bad Amount,not-a-number
2024-03-04,Zero Amount,0`;

    const result = parseTransactionCSV(csv);
    expect(result.validTransactions.length).toBe(1);
    expect(result.rejectedRows.length).toBe(3);

    expect(result.rejectedRows[0].rowNumber).toBe(3); // 1-indexed
    expect(result.rejectedRows[0].reason).toContain('Invalid or unparseable date');

    expect(result.rejectedRows[1].rowNumber).toBe(4);
    expect(result.rejectedRows[1].reason).toContain('Invalid or zero amount');

    expect(result.rejectedRows[2].rowNumber).toBe(5);
    expect(result.rejectedRows[2].reason).toContain('Invalid or zero amount');
  });

  it('detects duplicate transactions and issues warnings', () => {
    const csv = `Date,Description,Amount
10/04/2024,Chai Stall,20.00
10/04/2024,Chai Stall,20.00`;

    const result = parseTransactionCSV(csv);
    expect(result.validTransactions.length).toBe(2);
    expect(result.warnings.some((w) => w.code === 'DUPLICATE_SUSPECTED')).toBe(true);
    expect(result.validTransactions[1].isDuplicateSuspected).toBe(true);
  });

  it('rejects CSV with missing required columns', () => {
    const noDate = `Particulars,Amount
Some item,500`;
    const resNoDate = parseTransactionCSV(noDate);
    expect(resNoDate.validTransactions.length).toBe(0);
    expect(resNoDate.rejectedRows[0].reason).toContain('Missing required "Date" column');

    const noAmount = `Date,Description
2024-01-01,Test without amount`;
    const resNoAmount = parseTransactionCSV(noAmount);
    expect(resNoAmount.validTransactions.length).toBe(0);
    expect(resNoAmount.rejectedRows[0].reason).toContain('must contain an "Amount" column');
  });

  it('handles empty input cleanly', () => {
    const result = parseTransactionCSV('');
    expect(result.validTransactions.length).toBe(0);
    expect(result.rejectedRows[0].reason).toContain('Empty file');
  });

  it('normalizes various Indian date formats', () => {
    expect(normalizeDate('25/12/2023')).toBe('2023-12-25');
    expect(normalizeDate('25-12-2023')).toBe('2023-12-25');
    expect(normalizeDate('2023-12-25')).toBe('2023-12-25');
    expect(normalizeDate('25/12/23')).toBe('2023-12-25');
    expect(normalizeDate('invalid')).toBe(null);
  });

  it('parses currency strings with symbols, commas, and parentheses', () => {
    expect(parseAmountToPaise('₹1,25,000.50')?.paise).toBe(12500050n);
    expect(parseAmountToPaise('Rs. 500')?.paise).toBe(50000n);
    expect(parseAmountToPaise('(250.00)')?.isExplicitNegative).toBe(true);
    expect(parseAmountToPaise('(250.00)')?.paise).toBe(25000n);
  });
});
