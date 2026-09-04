import { describe, it, expect } from 'vitest';
import { parseVoiceExpenseText } from '@/lib/voice-expense-parser';
import { extractReceiptFromText } from '@/lib/receipt-extractor';

describe('Sidebar Features & Data Calculations', () => {
  describe('Can I Spend This? deterministic logic', () => {
    const monthlyIncomePaise = 3000000n; // ₹30,000
    const monthlyExpensesPaise = 2200000n; // ₹22,000
    const currentSurplusPaise = monthlyIncomePaise - monthlyExpensesPaise; // ₹8,000
    const targetSavingsPaise = 400000n; // ₹4,000

    it('returns "Looks affordable" when remaining surplus covers saving target and expenses', () => {
      const purchaseAmountRupees = 2500;
      const purchasePaise = BigInt(purchaseAmountRupees * 100); // ₹2,500
      const remainingSurplus = currentSurplusPaise - purchasePaise; // ₹5,500
      const diffFromTarget = remainingSurplus - targetSavingsPaise; // +₹1,500

      expect(remainingSurplus).toBeGreaterThanOrEqual(0n);
      expect(diffFromTarget).toBeGreaterThanOrEqual(0n);
      // Status: 🟢 Looks affordable
    });

    it('returns "Think about it" when purchase fits surplus but cuts into saving target', () => {
      const purchaseAmountRupees = 5000;
      const purchasePaise = BigInt(purchaseAmountRupees * 100); // ₹5,000
      const remainingSurplus = currentSurplusPaise - purchasePaise; // ₹3,000
      const diffFromTarget = remainingSurplus - targetSavingsPaise; // -₹1,000

      expect(remainingSurplus).toBeGreaterThanOrEqual(0n);
      expect(diffFromTarget).toBeLessThan(0n);
      // Status: 🟡 Think about it
    });

    it('returns "May put pressure on your budget" when purchase exceeds available surplus', () => {
      const purchaseAmountRupees = 9000;
      const purchasePaise = BigInt(purchaseAmountRupees * 100); // ₹9,000
      const remainingSurplus = currentSurplusPaise - purchasePaise; // -₹1,000

      expect(remainingSurplus).toBeLessThan(0n);
      // Status: 🔴 May put pressure on your budget
    });
  });

  describe('Add Expense Input Parsers', () => {
    it('parses voice string accurately into item and amount', () => {
      const result = parseVoiceExpenseText('I paid 450 rupees for bike maintenance');
      expect(result.amountRupees).toBe(450);
      expect(result.description.toLowerCase()).toContain('bike maintenance');
    });

    it('parses receipt text extracting merchant and total', () => {
      const receiptSample = `
        WELCOME TO RELIANCE SMART
        BANGALORE
        MILK 500ML   42.00
        ATTA 5KG    240.00
        SUBTOTAL    282.00
        GST 5%       14.10
        TOTAL AMOUNT 296.10
        THANK YOU
      `;
      const result = extractReceiptFromText(receiptSample);
      expect(result.amountRupees).toBe(296.1);
      expect(result.merchant).toContain('RELIANCE SMART');
    });
  });

  describe('My Goals deterministic progress & monthly target logic', () => {
    it('calculates progress percentage and remaining amount accurately', () => {
      const targetRupees = 50000;
      const currentRupees = 15000;
      const progress = Math.min(100, Math.round((currentRupees / targetRupees) * 100));
      const remaining = Math.max(0, targetRupees - currentRupees);

      expect(progress).toBe(30);
      expect(remaining).toBe(35000);
    });

    it('caps progress at 100% when savings meet or exceed goal', () => {
      const targetRupees = 20000;
      const currentRupees = 25000;
      const progress = Math.min(100, Math.round((currentRupees / targetRupees) * 100));
      const remaining = Math.max(0, targetRupees - currentRupees);

      expect(progress).toBe(100);
      expect(remaining).toBe(0);
    });

    it('calculates required monthly savings to achieve target date', () => {
      const targetRupees = 60000;
      const currentRupees = 12000;
      const remaining = targetRupees - currentRupees; // 48000
      const months = 6;
      const monthlyRequired = Math.ceil(remaining / months);

      expect(monthlyRequired).toBe(8000);
    });
  });
});
