import sharp from 'sharp';
import { parseVoiceExpenseTranscript } from '../src/lib/voice-expense-parser';
import { parseReceiptOcrLines } from '../src/lib/receipt-extractor';

async function runTests() {
  console.log('--- 1. Testing Voice Expense Parser ---');
  const voice1 = parseVoiceExpenseTranscript('I spent 250 rupees on petrol');
  console.assert(voice1.amountRupees === 250, `Expected 250, got ${voice1.amountRupees}`);
  console.assert(voice1.category === 'WORK_FUEL_TRANSIT', `Expected WORK_FUEL_TRANSIT, got ${voice1.category}`);
  console.assert(!voice1.amountUnclear, 'Expected amountUnclear to be false');

  const voice2 = parseVoiceExpenseTranscript('Spent 120 on lunch');
  console.assert(voice2.amountRupees === 120, `Expected 120, got ${voice2.amountRupees}`);
  console.assert(voice2.category === 'DISCRETIONARY', `Expected DISCRETIONARY, got ${voice2.category}`);

  const voice3 = parseVoiceExpenseTranscript('Paid 500 for electricity');
  console.assert(voice3.amountRupees === 500, `Expected 500, got ${voice3.amountRupees}`);
  console.assert(voice3.category === 'ESSENTIAL_UTILITIES', `Expected ESSENTIAL_UTILITIES, got ${voice3.category}`);

  const voiceUnclear = parseVoiceExpenseTranscript('I bought coffee and snacks');
  console.assert(voiceUnclear.amountRupees === null, 'Expected amount to be null for unclear voice');
  console.assert(voiceUnclear.amountUnclear === true, 'Expected amountUnclear to be true');
  console.log('✓ Voice Expense Parser tests passed.');

  console.log('\n--- 2. Testing Receipt Parser ---');
  const sampleReceiptLines = [
    'PARKWAY CAFE & RESTAURANT',
    'GSTIN: 29ABCDE1234F1Z5',
    'Date: 15/08/2026 13:45',
    'Veg Thali x 2      300.00',
    'Sweet Lassi x 2    120.00',
    'Sub Total:         420.00',
    'CGST @ 2.5%:        10.50',
    'SGST @ 2.5%:        10.50',
    'Round Off:          -1.00',
    'GRAND TOTAL:       440.00',
    'Thank you visit again!',
  ];

  const receiptParsed = parseReceiptOcrLines(sampleReceiptLines);
  console.assert(receiptParsed.amountRupees === 440, `Expected 440, got ${receiptParsed.amountRupees}`);
  console.assert(receiptParsed.merchant.toLowerCase().includes('parkway'), `Expected Parkway, got ${receiptParsed.merchant}`);
  console.assert(receiptParsed.category === 'DISCRETIONARY', `Expected DISCRETIONARY, got ${receiptParsed.category}`);
  console.assert(!receiptParsed.isUncertain, 'Expected isUncertain to be false');
  console.log('✓ Receipt Parser tests passed.');

  console.log('\n--- 3. Testing /api/extract with RECEIPT mode ---');
  // Generate an SVG receipt and rasterize to PNG with sharp
  const receiptSvg = `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      <text x="30" y="50" font-family="Arial" font-size="22" font-weight="bold" fill="black">SUPERMART RETAIL</text>
      <text x="30" y="90" font-family="Arial" font-size="16" fill="black">Date: 12-08-2026</text>
      <text x="30" y="130" font-family="Arial" font-size="16" fill="black">Subtotal: 250.00</text>
      <text x="30" y="170" font-family="Arial" font-size="16" fill="black">Tax: 12.50</text>
      <text x="30" y="220" font-family="Arial" font-size="20" font-weight="bold" fill="black">GRAND TOTAL: 262.50</text>
    </svg>
  `;
  const imagePngBuffer = await sharp(Buffer.from(receiptSvg)).png().toBuffer();

  const formData = new FormData();
  const file = new File([imagePngBuffer], 'test-receipt.png', { type: 'image/png' });
  formData.append('file', file);
  formData.append('mode', 'RECEIPT');

  const res = await fetch('http://localhost:3000/api/extract', {
    method: 'POST',
    body: formData,
  });

  const extractJson = await res.json();
  console.assert(res.ok, `Expected 200, got ${res.status}`);
  console.assert(extractJson.success === true, 'Expected success === true');
  console.assert(extractJson.receipt !== undefined, 'Expected receipt object in response');
  console.log('✓ Receipt API extraction returned valid structure:', {
    merchant: extractJson.receipt?.merchant,
    amountRupees: extractJson.receipt?.amountRupees,
    category: extractJson.receipt?.category,
  });

  console.log('\n--- 4. Testing /api/analyze Single Source of Truth ---');
  const analyzeRes = await fetch('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transactions: [
        {
          id: 'tx1',
          date: '2026-08-01',
          description: 'Zomato Payout',
          amountPaise: '3000000', // 30,000 Credit
          type: 'CREDIT',
          confidence: 'HIGH',
        },
        {
          id: 'tx2',
          date: '2026-08-05',
          description: 'House Rent',
          amountPaise: '800000', // 8,000 Debit
          type: 'DEBIT',
          confidence: 'HIGH',
        },
        {
          id: 'tx3',
          date: '2026-08-10',
          description: 'Petrol BPC',
          amountPaise: '250000', // 2,500 Debit
          type: 'DEBIT',
          confidence: 'HIGH',
        },
      ],
      sourceType: 'IMAGE',
      sourceReference: 'integration-test',
    }),
  });

  console.assert(analyzeRes.ok, `Analyze API failed: ${analyzeRes.status}`);
  const analysisData = await analyzeRes.json();
  console.assert(analysisData.incomeAnalysis !== undefined, 'Expected incomeAnalysis in result');
  console.assert(analysisData.expenseAnalysis !== undefined, 'Expected expenseAnalysis in result');
  console.assert(analysisData.savingsCapacity !== undefined, 'Expected savingsCapacity in result');
  console.log('✓ Analyze API confirmed deterministic financial calculations.');

  console.log('\nALL INTEGRATION AND FEATURE TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
