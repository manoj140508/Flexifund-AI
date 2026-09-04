import { describe, it, expect } from 'vitest';
import { parseVoiceExpenseTranscript } from '../lib/voice-expense-parser';
import { parseReceiptOcrLines } from '../lib/receipt-extractor';

describe('Voice Expense Parser', () => {
  it('parses "I spent 250 rupees on petrol" accurately', () => {
    const res = parseVoiceExpenseTranscript('I spent 250 rupees on petrol');
    expect(res.amountRupees).toBe(250);
    expect(res.description.toLowerCase()).toContain('petrol');
    expect(res.category).toBe('WORK_FUEL_TRANSIT');
    expect(res.amountUnclear).toBe(false);
  });

  it('parses "Spent 120 on lunch" accurately', () => {
    const res = parseVoiceExpenseTranscript('Spent 120 on lunch');
    expect(res.amountRupees).toBe(120);
    expect(res.description.toLowerCase()).toContain('lunch');
    expect(res.category).toBe('DISCRETIONARY');
    expect(res.amountUnclear).toBe(false);
  });

  it('parses "Paid 500 for electricity" accurately', () => {
    const res = parseVoiceExpenseTranscript('Paid 500 for electricity');
    expect(res.amountRupees).toBe(500);
    expect(res.description.toLowerCase()).toContain('electricity');
    expect(res.category).toBe('ESSENTIAL_UTILITIES');
    expect(res.amountUnclear).toBe(false);
  });

  it('parses "Bought groceries for 850 rupees" accurately', () => {
    const res = parseVoiceExpenseTranscript('Bought groceries for 850 rupees');
    expect(res.amountRupees).toBe(850);
    expect(res.description.toLowerCase()).toContain('groceries');
    expect(res.category).toBe('ESSENTIAL_GROCERIES');
    expect(res.amountUnclear).toBe(false);
  });

  it('flags amountUnclear when no number is spoken and does NOT guess', () => {
    const res = parseVoiceExpenseTranscript('I bought some snacks for tea');
    expect(res.amountRupees).toBeNull();
    expect(res.amountUnclear).toBe(true);
    expect(res.confidenceMessage).toContain("I'm not sure about the amount");
  });

  it('handles currency symbol prefix like "₹350 for mobile recharge"', () => {
    const res = parseVoiceExpenseTranscript('₹350 for mobile recharge');
    expect(res.amountRupees).toBe(350);
    expect(res.category).toBe('ESSENTIAL_UTILITIES');
  });
});

describe('Receipt Extractor', () => {
  it('extracts Grand Total and ignores Subtotal and CGST/SGST taxes', () => {
    const ocrLines = [
      'SRI KRISHNA BHAVAN',
      'RESTAURANT & CAFE',
      'Date: 14/08/2026',
      '1 Masala Dosa  80.00',
      '1 Filter Coffee 30.00',
      'SUBTOTAL  110.00',
      'CGST 2.5%  2.75',
      'SGST 2.5%  2.75',
      'ROUND OFF  0.50',
      'GRAND TOTAL  116.00',
      'THANK YOU VISIT AGAIN',
    ];

    const result = parseReceiptOcrLines(ocrLines);
    expect(result.merchant).toContain('KRISHNA BHAVAN');
    expect(result.amountRupees).toBe(116);
    expect(result.category).toBe('DISCRETIONARY');
    expect(result.isUncertain).toBe(false);
  });

  it('extracts NET PAYABLE accurately from grocery supermarket bill', () => {
    const ocrLines = [
      'DMART RETAIL LTD',
      'TAX INVOICE',
      'Date: 10-08-2026',
      'Items Count: 5',
      'SUB TOTAL: 1450.00',
      'TAX: 72.50',
      'DISCOUNT: 100.00',
      'NET PAYABLE: 1422.50',
    ];

    const result = parseReceiptOcrLines(ocrLines);
    expect(result.merchant).toContain('DMART');
    expect(result.amountRupees).toBe(1422.5);
    expect(result.category).toBe('ESSENTIAL_GROCERIES');
    expect(result.isUncertain).toBe(false);
  });

  it('extracts TOTAL when on separate or split lines', () => {
    const ocrLines = [
      'BHARAT PETROLEUM',
      'PETROL PUMP #42',
      '12-Aug-2026',
      'PETROL 5.2L',
      'TOTAL AMOUNT',
      '530.00',
    ];

    const result = parseReceiptOcrLines(ocrLines);
    expect(result.merchant).toContain('BHARAT PETROLEUM');
    expect(result.amountRupees).toBe(530);
    expect(result.category).toBe('WORK_FUEL_TRANSIT');
  });

  it('flags isUncertain when receipt total is ambiguous or missing', () => {
    const ocrLines = [
      'WELCOME TO STORE',
      'CUSTOMER COPY',
    ];

    const result = parseReceiptOcrLines(ocrLines);
    expect(result.amountRupees).toBeNull();
    expect(result.isUncertain).toBe(true);
    expect(result.message).toBeDefined();
  });
});
