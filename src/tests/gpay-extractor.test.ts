import { describe, it, expect } from 'vitest';
import {
  parseBankStatementText,
  parseGPayAndMobileScreenshots,
  parseGPaySpatialBlocks,
  parseDateWithMetadata,
  extractCandidateAmounts,
  preprocessOcrLine,
  deduplicateExtractedTransactions,
  ExtractedStatementTransaction,
  SpatialOcrLine,
} from '@/lib/statement-extractor';

describe('GPay Screenshot Spatial Extractor & Accuracy Tests', () => {
  describe('Date Parsing & Metadata', () => {
    it('accurately identifies explicit vs omitted year', () => {
      const withYear = parseDateWithMetadata('14 Aug 2026');
      expect(withYear?.isoDate).toBe('2026-08-14');
      expect(withYear?.hasExplicitYear).toBe(true);

      const dmy = parseDateWithMetadata('14/08/2026');
      expect(dmy?.isoDate).toBe('2026-08-14');
      expect(dmy?.hasExplicitYear).toBe(true);

      const currentYear = new Date().getFullYear();
      const withoutYear = parseDateWithMetadata('14 Aug');
      expect(withoutYear?.isoDate).toBe(`${currentYear}-08-14`);
      expect(withoutYear?.hasExplicitYear).toBe(false);

      const monthDayWithoutYear = parseDateWithMetadata('Aug 14');
      expect(monthDayWithoutYear?.isoDate).toBe(`${currentYear}-08-14`);
      expect(monthDayWithoutYear?.hasExplicitYear).toBe(false);
    });

    it('handles embedded timestamps and status prefixes in real GPay dates', () => {
      const withTime = parseDateWithMetadata('12 Aug 2026, 8:45 PM');
      expect(withTime?.isoDate).toBe('2026-08-12');
      expect(withTime?.hasExplicitYear).toBe(true);

      const withStatus = parseDateWithMetadata('Completed • 12 Aug 2026');
      expect(withStatus?.isoDate).toBe('2026-08-12');
      expect(withStatus?.hasExplicitYear).toBe(true);

      const timeNoYear = parseDateWithMetadata('12 Aug, 8:45 PM');
      const currentYear = new Date().getFullYear();
      expect(timeNoYear?.isoDate).toBe(`${currentYear}-08-12`);
      expect(timeNoYear?.hasExplicitYear).toBe(false);
    });

    it('flags dateNeedsReview when year is omitted and no global year exists (Requirement 7)', () => {
      const textWithoutYearHeader = `
14 Aug
Swiggy
Paid ₹420
Completed
`;
      const result = parseGPayAndMobileScreenshots(textWithoutYearHeader);
      expect(result.success).toBe(true);
      expect(result.transactions.length).toBe(1);

      const tx = result.transactions[0];
      expect(tx.dateNeedsReview).toBe(true);
      expect(tx.uncertainFields).toContain('date');
    });

    it('does not flag dateNeedsReview when global year header exists', () => {
      const textWithYearHeader = `
August 2026

14 Aug
Swiggy
Paid ₹420
Completed
`;
      const result = parseGPayAndMobileScreenshots(textWithYearHeader);
      expect(result.success).toBe(true);
      expect(result.transactions.length).toBe(1);

      const tx = result.transactions[0];
      expect(tx.date).toBe('2026-08-14');
      expect(tx.dateNeedsReview).toBe(false);
      expect(tx.uncertainFields || []).not.toContain('date');
    });
  });

  describe('Strict Amount Extraction & OCR Currency Glyph Handling (Requirement 4 & 18)', () => {
    it('correctly extracts varied Indian currency formats', () => {
      expect(extractCandidateAmounts('Paid ₹500', undefined, true)).toEqual(['500']);
      expect(extractCandidateAmounts('Sent ₹1,200 to Ramesh', undefined, true)).toEqual(['1200']);
      expect(extractCandidateAmounts('Received ₹2,500.50', undefined, true)).toEqual(['2500.50']);
      expect(extractCandidateAmounts('Client payout ₹1,25,000', undefined, true)).toEqual(['125000']);
      expect(extractCandidateAmounts('Paid Rs 500 for fuel', undefined, true)).toEqual(['500']);
      expect(extractCandidateAmounts('Paid Rs. 500', undefined, true)).toEqual(['500']);
      expect(extractCandidateAmounts('Paid ₹ 500', undefined, true)).toEqual(['500']);
      expect(extractCandidateAmounts('+₹1,500 cashback', undefined, true)).toEqual(['1500']);
      expect(extractCandidateAmounts('-₹420 debited', undefined, true)).toEqual(['420']);
    });

    it('recovers common OCR currency glyph misrecognitions (₹ as 3, ¥, £, €)', () => {
      expect(preprocessOcrLine('Paid 3420').cleanedText).toBe('Paid ₹420');
      expect(preprocessOcrLine('Received 315000').cleanedText).toBe('Received ₹15000');
      expect(preprocessOcrLine('+31500').cleanedText).toBe('+ ₹1500');
      expect(preprocessOcrLine('-3420').cleanedText).toBe('- ₹420');
      expect(preprocessOcrLine('Paid ¥420').cleanedText).toBe('Paid ₹420');
      expect(preprocessOcrLine('Paid £1,200').cleanedText).toBe('Paid ₹1,200');
    });

    it('strictly rejects non-monetary numbers (phone, UPI ref, battery, timestamp)', () => {
      expect(extractCandidateAmounts('Battery 85% at 10:45 AM', undefined, true)).toEqual([]);
      expect(extractCandidateAmounts('UPI Ref 423456789012', undefined, true)).toEqual([]);
      expect(extractCandidateAmounts('Call 9876543210', undefined, true)).toEqual([]);

      const line = 'UPI Ref 423456789012 to 9876543210 at 10:45 AM for Paid ₹350';
      const amounts = extractCandidateAmounts(line, undefined, true);
      expect(amounts).toEqual(['350']);
    });
  });

  describe('Direction Detection (Requirement 5 & 10)', () => {
    it('classifies explicit expenses as DEBIT without needing review', () => {
      const text = `
August 2026
14 Aug
Swiggy
Paid to Swiggy
₹420
`;
      const result = parseGPayAndMobileScreenshots(text);
      expect(result.transactions[0].type).toBe('DEBIT');
      expect(result.transactions[0].uncertainFields || []).not.toContain('type');
    });

    it('classifies explicit incomes as CREDIT without needing review', () => {
      const text = `
August 2026
12 Aug
Rahul Sharma
Received from Rahul
₹2,000
`;
      const result = parseGPayAndMobileScreenshots(text);
      expect(result.transactions[0].type).toBe('CREDIT');
      expect(result.transactions[0].uncertainFields || []).not.toContain('type');
    });

    it('extracts transaction without the word "Paid" and marks direction for review (Requirement 10)', () => {
      const textWithoutWordPaid = `
August 2026
10 Aug
Zomato
₹350
Completed
`;
      const result = parseGPayAndMobileScreenshots(textWithoutWordPaid);
      expect(result.success).toBe(true);
      expect(result.transactions.length).toBe(1);

      const tx = result.transactions[0];
      expect(tx.description).toBe('Zomato');
      expect(tx.amountPaise).toBe('35000');
      expect(tx.needsReview).toBe(true);
      expect(tx.uncertainFields).toContain('type');
    });
  });

  describe('Individual GPay Transaction Screen Parsing (Requirement 11)', () => {
    it('successfully extracts individual payment detail screen', () => {
      const individualScreenText = `
Google Pay
Swiggy Instamart
₹500.00
Payment successful
12 Aug 2026, 8:45 PM
UPI transaction ID 423456789012
To: State Bank of India •••• 1234
From: HDFC Bank •••• 5678
`;
      const result = parseGPayAndMobileScreenshots(individualScreenText);
      expect(result.success).toBe(true);
      expect(result.transactions.length).toBe(1);

      const tx = result.transactions[0];
      expect(tx.description).toBe('Swiggy Instamart');
      expect(tx.amountPaise).toBe('50000');
      expect(tx.date).toBe('2026-08-12');
      expect(tx.dateNeedsReview).toBe(false);
    });
  });

  describe('Spatial Block Parsing with Bounding Boxes (Requirement 3)', () => {
    it('accurately groups spatial lines based on vertical coordinates and prevents cross-merging', () => {
      const spatialLines: SpatialOcrLine[] = [
        // Header
        { text: 'August 2026', bbox: { x0: 30, y0: 40, x1: 200, y1: 65 }, confidence: 95 },

        // Card 1 (y: 100 - 200)
        { text: '14 Aug', bbox: { x0: 30, y0: 100, x1: 90, y1: 120 }, confidence: 92 },
        { text: 'Swiggy Instamart', bbox: { x0: 30, y0: 130, x1: 250, y1: 155 }, confidence: 96 },
        { text: 'Paid ₹420', bbox: { x0: 30, y0: 165, x1: 150, y1: 190 }, confidence: 94 },
        { text: 'Completed', bbox: { x0: 30, y0: 195, x1: 110, y1: 215 }, confidence: 90 },

        // Card 2 (y: 280 - 380)
        { text: '12 Aug', bbox: { x0: 30, y0: 280, x1: 90, y1: 300 }, confidence: 93 },
        { text: 'Rahul Sharma', bbox: { x0: 30, y0: 310, x1: 220, y1: 335 }, confidence: 95 },
        { text: 'Received ₹2,000', bbox: { x0: 30, y0: 345, x1: 180, y1: 370 }, confidence: 96 },
        { text: 'Completed', bbox: { x0: 30, y0: 375, x1: 110, y1: 395 }, confidence: 91 },
      ];

      const result = parseGPaySpatialBlocks(spatialLines);
      expect(result.success).toBe(true);
      expect(result.transactions.length).toBe(2);

      const t1 = result.transactions.find((t) => t.description.includes('Swiggy'));
      expect(t1).toBeDefined();
      expect(t1?.date).toBe('2026-08-14');
      expect(t1?.amountPaise).toBe('42000');
      expect(t1?.type).toBe('DEBIT');
      expect(t1?.confidence).toBe('HIGH');

      const t2 = result.transactions.find((t) => t.description.includes('Rahul'));
      expect(t2).toBeDefined();
      expect(t2?.date).toBe('2026-08-12');
      expect(t2?.amountPaise).toBe('200000');
      expect(t2?.type).toBe('CREDIT');
      expect(t2?.confidence).toBe('HIGH');
    });
  });

  describe('Unclear Merchant Name Fallback (Requirement 8)', () => {
    it('sets description to "Unclear merchant" instead of hallucinating', () => {
      const textWithGarbledMerchant = `
August 2026
10 Aug
???...
Paid ₹150
Completed
`;
      const result = parseGPayAndMobileScreenshots(textWithGarbledMerchant);
      expect(result.success).toBe(true);
      expect(result.transactions.length).toBe(1);

      const tx = result.transactions[0];
      expect(tx.description).toBe('Unclear merchant');
      expect(tx.uncertainFields).toContain('description');
      expect(tx.needsReview).toBe(true);
    });
  });

  describe('Deduplication Across Overlapping Screenshots (Requirement 13)', () => {
    it('deduplicates identical transactions while prioritizing the one with fewer uncertain fields', () => {
      const txs: ExtractedStatementTransaction[] = [
        {
          id: '1',
          date: '2026-08-14',
          description: 'Swiggy',
          amountPaise: '42000',
          type: 'DEBIT',
          confidence: 'LOW',
          uncertainFields: ['type'],
          needsReview: true,
        },
        {
          id: '2',
          date: '2026-08-14',
          description: 'Swiggy',
          amountPaise: '42000',
          type: 'DEBIT',
          confidence: 'HIGH',
          uncertainFields: [],
          needsReview: false,
        },
      ];

      const deduped = deduplicateExtractedTransactions(txs);
      expect(deduped.length).toBe(1);
      expect(deduped[0].confidence).toBe('HIGH');
      expect(deduped[0].uncertainFields?.length || 0).toBe(0);
    });
  });

  describe('Unreadable Image Safety (Requirement 22 & 23)', () => {
    it('fails cleanly with friendly error and zero fake transactions', () => {
      const unreadableText = `
Wi-Fi connected
Settings
Battery 100%
`;
      const result = parseBankStatementText(unreadableText, 'IMAGE');
      expect(result.success).toBe(false);
      expect(result.transactions.length).toBe(0);
      expect(result.errorMessage).toContain("We couldn't read the transactions in this screenshot");
    });
  });
});
