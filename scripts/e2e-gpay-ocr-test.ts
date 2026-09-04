import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createWorker } from 'tesseract.js';
import { parseGPayAndMobileScreenshots, parseGPaySpatialBlocks } from '../src/lib/statement-extractor';
import { runFinancialAnalysis, serializeFinancialAnalysisResult } from '../src/domain/analysis';
import { NormalizedTransaction } from '../src/domain/transactions';
import { moneyFromPaise } from '../src/domain/money';

async function runGPayE2ETest() {
  console.log('🚀 Starting E2E GPay Screenshot OCR & Financial Engine Integration Test...');

  const tempSvgPath = path.resolve(process.cwd(), 'scripts/temp_gpay_e2e.svg');
  const tempPngPath = path.resolve(process.cwd(), 'scripts/temp_gpay_e2e.png');

  try {
    // 1. Generate realistic GPay screenshot image (non-sensitive synthetic test data)
    const svgContent = `
<svg width='600' height='900' xmlns='http://www.w3.org/2000/svg'>
  <rect width='100%' height='100%' fill='#FFFFFF'/>
  <text x='40' y='60' font-family='Arial, sans-serif' font-size='24' font-weight='bold' fill='#0F2747'>August 2026</text>

  <!-- Transaction 1: Swiggy Expense -->
  <text x='40' y='130' font-family='Arial, sans-serif' font-size='16' fill='#64748B'>14 Aug</text>
  <text x='40' y='165' font-family='Arial, sans-serif' font-size='22' font-weight='bold' fill='#1E293B'>Swiggy Instamart</text>
  <text x='40' y='200' font-family='Arial, sans-serif' font-size='20' fill='#1E293B'>Paid Rs. 420</text>
  <text x='40' y='230' font-family='Arial, sans-serif' font-size='14' fill='#10B981'>Completed</text>

  <!-- Transaction 2: Income from Rahul -->
  <text x='40' y='310' font-family='Arial, sans-serif' font-size='16' fill='#64748B'>12 Aug</text>
  <text x='40' y='345' font-family='Arial, sans-serif' font-size='22' font-weight='bold' fill='#1E293B'>Rahul Sharma</text>
  <text x='40' y='380' font-family='Arial, sans-serif' font-size='20' fill='#059669'>Received Rs. 15,000</text>
  <text x='40' y='410' font-family='Arial, sans-serif' font-size='14' fill='#10B981'>Completed</text>

  <!-- Transaction 3: Utility Bill -->
  <text x='40' y='490' font-family='Arial, sans-serif' font-size='16' fill='#64748B'>10 Aug</text>
  <text x='40' y='525' font-family='Arial, sans-serif' font-size='22' font-weight='bold' fill='#1E293B'>Payment to Airtel</text>
  <text x='40' y='560' font-family='Arial, sans-serif' font-size='20' fill='#1E293B'>Rs. 299</text>
  <text x='40' y='590' font-family='Arial, sans-serif' font-size='14' fill='#10B981'>Completed</text>

  <!-- Transaction 4: Fuel Expense -->
  <text x='40' y='670' font-family='Arial, sans-serif' font-size='16' fill='#64748B'>08 Aug</text>
  <text x='40' y='705' font-family='Arial, sans-serif' font-size='22' font-weight='bold' fill='#1E293B'>Indian Oil Petrol</text>
  <text x='40' y='740' font-family='Arial, sans-serif' font-size='20' fill='#1E293B'>Paid Rs. 500</text>
  <text x='40' y='770' font-family='Arial, sans-serif' font-size='14' fill='#10B981'>Completed</text>
</svg>
    `;

    fs.writeFileSync(tempSvgPath, svgContent);
    execSync(`sips -s format png "${tempSvgPath}" --out "${tempPngPath}"`, { stdio: 'ignore' });
    console.log('✅ Generated realistic synthetic GPay screenshot PNG.');

    // 2. Run real Tesseract OCR on the screenshot
    console.log('🔍 Running Tesseract OCR on screenshot...');
    const imageBuffer = fs.readFileSync(tempPngPath);
    const worker = await createWorker('eng');
    const ocrResult: any = await worker.recognize(imageBuffer);
    await worker.terminate();

    const rawOcrText = ocrResult?.data?.text || '';
    const spatialLines = (ocrResult?.data?.lines || []).map((l: any) => ({
      text: l.text || '',
      bbox: l.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
      confidence: typeof l.confidence === 'number' ? l.confidence : 80,
    }));
    console.log(`✅ Tesseract OCR finished (${spatialLines.length} spatial lines detected). Processing with GPay layout extractor...`);

    // 3. Extract transactions using spatial layout
    const extraction = parseGPaySpatialBlocks(spatialLines, rawOcrText);

    if (!extraction.success || extraction.transactions.length === 0) {
      throw new Error(`Failed to extract transactions from GPay screenshot: ${extraction.errorMessage}`);
    }

    console.log(`✅ Successfully extracted ${extraction.transactions.length} transactions from GPay screenshot:`);
    for (const tx of extraction.transactions) {
      const rupees = (Number(tx.amountPaise) / 100).toFixed(2);
      console.log(`   • ${tx.date} | ${tx.description} | ${tx.type} | ₹${rupees} (${tx.confidence})`);
    }

    // Assert expected transactions
    if (extraction.transactions.length < 3) {
      throw new Error(`Expected at least 3 transactions, got ${extraction.transactions.length}`);
    }

    const incomeTx = extraction.transactions.find((t) => t.type === 'CREDIT');
    if (!incomeTx || incomeTx.amountPaise !== '1500000') {
      throw new Error(`Expected income transaction of ₹15,000 (1500000 paise), got ${JSON.stringify(incomeTx)}`);
    }

    const swiggyTx = extraction.transactions.find((t) => t.description.toLowerCase().includes('swiggy'));
    if (!swiggyTx || swiggyTx.type !== 'DEBIT' || swiggyTx.amountPaise !== '42000') {
      throw new Error(`Expected Swiggy debit of ₹420 (42000 paise), got ${JSON.stringify(swiggyTx)}`);
    }

    // 4. Verify downstream connection to the deterministic financial engine
    console.log('⚡ Verifying pipeline to the financial engine...');
    const normalizedTransactions: NormalizedTransaction[] = extraction.transactions.map((tx, idx) => ({
      id: tx.id,
      date: tx.date,
      amount: moneyFromPaise(BigInt(tx.amountPaise)),
      type: tx.type === 'CREDIT' ? 'INCOME' : 'EXPENSE',
      category: tx.type === 'CREDIT' ? 'INCOME' : 'ESSENTIAL_GROCERIES',
      rawDescription: tx.description,
      normalizedMerchant: tx.description,
      sourceReference: 'gpay_screenshot.png',
      sourceRowNumber: idx + 1,
      confidence: tx.confidence === 'HIGH' ? 0.95 : 0.7,
    }));

    const analysis = runFinancialAnalysis({
      transactions: normalizedTransactions,
      profile: {
        workerType: 'DELIVERY_WORKER',
        jurisdiction: 'Karnataka',
        state: 'Karnataka',
        city: 'Bengaluru',
        dependents: 1,
        hasBankAccount: true,
        isCoveredUnderEPFO_ESIC: false,
      },
      currentCashPaise: '500000', // Available cash: ₹5,000 (500,000 paise)
    });

    const serialized = serializeFinancialAnalysisResult(analysis);
    console.log('✅ Financial Analysis Completed Successfully:');
    console.log(`   • Total Income: ₹${serialized.incomeAnalysis.totalIncome.decimalAmount}`);
    console.log(`   • Total Expenses: ₹${serialized.expenseAnalysis.totalExpenses.decimalAmount}`);
    console.log(`   • Monthly Savings Capacity: ₹${serialized.savingsCapacity.conservativeMonthlyReference.decimalAmount}`);
    console.log(`   • Runway Days: ${serialized.resilienceAnalysis.bufferCoverageDays ?? 'N/A'} days`);
    console.log(`   • Stress Level: ${serialized.stressIndicators.overallStressLevel}`);

    console.log('🎉 ALL GPay E2E OCR & Engine Integration checks PASSED!');
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(tempSvgPath)) fs.unlinkSync(tempSvgPath);
      if (fs.existsSync(tempPngPath)) fs.unlinkSync(tempPngPath);
    } catch {}
  }
}

runGPayE2ETest().catch((err) => {
  console.error('❌ E2E GPay test failed:', err);
  process.exit(1);
});
