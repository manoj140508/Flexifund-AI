import { describe, it, expect } from 'vitest';
import {
  normalizeDateString,
  parseCleanAmount,
  parseBankStatementText,
} from '../lib/statement-extractor';

describe('Statement Extractor Unit Tests', () => {
  describe('normalizeDateString', () => {
    it('normalizes DD/MM/YYYY to YYYY-MM-DD', () => {
      expect(normalizeDateString('15/08/2024')).toBe('2024-08-15');
      expect(normalizeDateString('01/01/2024')).toBe('2024-01-01');
    });

    it('normalizes DD-MM-YYYY to YYYY-MM-DD', () => {
      expect(normalizeDateString('22-10-2024')).toBe('2024-10-22');
    });

    it('normalizes DD Mon YYYY to YYYY-MM-DD', () => {
      expect(normalizeDateString('14 Aug 2024')).toBe('2024-08-14');
      expect(normalizeDateString('03 Jan 2024')).toBe('2024-01-03');
    });

    it('preserves already ISO formatted dates', () => {
      expect(normalizeDateString('2024-05-20')).toBe('2024-05-20');
    });
  });

  describe('parseCleanAmount', () => {
    it('cleans amounts with currency symbols and Indian commas', () => {
      expect(parseCleanAmount('₹1,250.50')).toBe(125050n);
      expect(parseCleanAmount('Rs. 5,000')).toBe(500000n);
      expect(parseCleanAmount('12,34,567.89')).toBe(123456789n);
    });

    it('handles simple integer amounts', () => {
      expect(parseCleanAmount('500')).toBe(50000n);
    });

    it('returns null for unparseable amounts', () => {
      expect(parseCleanAmount('invalid')).toBeNull();
      expect(parseCleanAmount('')).toBeNull();
    });
  });

  describe('parseBankStatementText', () => {
    it('extracts tabular bank statement rows correctly', () => {
      const sampleText = `
        STATE BANK OF INDIA - STATEMENT OF ACCOUNT
        Date Description Debit Credit Balance
        01/08/2024 Zomato Payout 12500.00 15200.00
        03/08/2024 HP Petrol Bunk 450.00 14750.00
        05/08/2024 Swiggy Weekly Payout 9800.00 24550.00
        10/08/2024 D-Mart Groceries 2100.00 22450.00
        Closing Balance: 22450.00
      `;

      const result = parseBankStatementText(sampleText, 'PDF');

      expect(result.success).toBe(true);
      expect(result.transactions.length).toBeGreaterThanOrEqual(4);
      expect(result.sourceType).toBe('PDF');

      // Check extracted closing balance
      expect(result.closingBalancePaise).toBe('2245000');

      // First transaction check
      const zomatoTx = result.transactions.find((t) => t.description.toLowerCase().includes('zomato'));
      expect(zomatoTx).toBeDefined();
      expect(zomatoTx?.type).toBe('CREDIT');
      expect(zomatoTx?.amountPaise).toBe('1250000');

      // Petrol bunk check
      const petrolTx = result.transactions.find((t) => t.description.toLowerCase().includes('petrol'));
      expect(petrolTx).toBeDefined();
      expect(petrolTx?.type).toBe('DEBIT');
      expect(petrolTx?.amountPaise).toBe('45000');
    });

    it('fails safely with zero hallucination when text has no transaction rows', () => {
      const unreadableText = `
        Dear Customer,
        Thank you for choosing our banking services.
        Terms and conditions apply.
        Please visit our branch for further queries.
      `;

      const result = parseBankStatementText(unreadableText, 'PDF');
      expect(result.success).toBe(false);
      expect(result.transactions.length).toBe(0);
      expect(result.errorMessage).toContain("couldn't reliably read the transaction table");
    });
  });
});
