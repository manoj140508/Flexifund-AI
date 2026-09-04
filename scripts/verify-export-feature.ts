/**
 * Automated Verification Script for FlexiFund AI "Export My Plan" Feature
 * Tests all requirements from prompt:
 * - PDF Generation with real analyzed data
 * - Missing cash handling ("Current available cash: Not provided")
 * - Savings opportunities present vs empty handling
 * - Scenario selected vs no scenario handling
 * - Things to Watch section
 * - 3 Next Steps (Action / Why / Potential impact)
 * - HTTP endpoint /api/export headers (Content-Type: application/pdf, Content-Disposition: attachment)
 * - PDF binary header validation (%PDF-)
 * - Uses PDFParse for authentic decoded PDF text inspection
 */

import { runFinancialAnalysis, serializeFinancialAnalysisResult } from '../src/domain/analysis';
import { buildPdfDoc } from '../src/lib/export-generators';
import { NormalizedTransaction } from '../src/domain/transactions';
import { PDFParse } from 'pdf-parse';

async function extractPdfText(doc: any): Promise<string> {
  const buf = Buffer.from(doc.output('arraybuffer'));
  const parsed = await new PDFParse({ data: buf }).getText();
  return parsed.text;
}

async function runExportVerification() {
  console.log('========================================================');
  console.log('FlexiFund AI — "Export My Plan" Verification Suite');
  console.log('========================================================');

  let passed = 0;
  let total = 0;

  // Sample real transactions
  const txs: NormalizedTransaction[] = [
    {
      id: 'tx-1',
      date: '2026-08-01',
      amountPaise: 1500000n, // ₹15,000 credit
      type: 'CREDIT',
      category: 'INCOME',
      description: 'SWIGGY PAYOUT WK1',
      confidence: 'HIGH',
      isRecurring: false,
    },
    {
      id: 'tx-2',
      date: '2026-08-08',
      amountPaise: 1450000n, // ₹14,500 credit
      type: 'CREDIT',
      category: 'INCOME',
      description: 'SWIGGY PAYOUT WK2',
      confidence: 'HIGH',
      isRecurring: false,
    },
    {
      id: 'tx-3',
      date: '2026-08-02',
      amountPaise: 600000n, // ₹6,000 debit
      type: 'DEBIT',
      category: 'ESSENTIAL_HOUSING',
      description: 'HOUSE RENT UPI',
      confidence: 'HIGH',
      isRecurring: true,
    },
    {
      id: 'tx-4',
      date: '2026-08-05',
      amountPaise: 120000n, // ₹1,200 debit
      type: 'DEBIT',
      category: 'DISCRETIONARY',
      description: 'ZOMATO ORDER RESTAURANT',
      confidence: 'HIGH',
      isRecurring: false,
    },
    {
      id: 'tx-5',
      date: '2026-08-10',
      amountPaise: 50000n, // ₹500 debit
      type: 'DEBIT',
      category: 'DISCRETIONARY',
      description: 'ZOMATO ONLINE DELIVERY',
      confidence: 'HIGH',
      isRecurring: false,
    },
  ];

  const analysis = serializeFinancialAnalysisResult(
    runFinancialAnalysis({ transactions: txs })
  );

  // TEST 1: PDF Generation without Current Cash
  total++;
  console.log('\n[TEST 1] PDF Generation without Confirmed Cash (No Cash Assumption)...');
  const docNoCash = buildPdfDoc(analysis, {
    workerType: 'DELIVERY_WORKER',
    jurisdiction: 'Karnataka',
    state: 'Karnataka',
    city: 'Bengaluru',
    age: 27,
    currentCashBalanceRupees: '', // Explicitly empty
    financialGoal: 'Build emergency savings',
    primaryConcern: 'Income changes',
    hasBankAccount: true,
    isCoveredUnderEPFO_ESIC: false,
  });

  const pdfNoCashArray = docNoCash.output('arraybuffer');
  const pdfNoCashHeader = Buffer.from(pdfNoCashArray).subarray(0, 5).toString('ascii');
  const pdfNoCashText = await extractPdfText(docNoCash);

  if (
    pdfNoCashHeader === '%PDF-' &&
    pdfNoCashText.includes('Current available cash: Not provided') &&
    pdfNoCashText.includes('Add your available cash')
  ) {
    console.log('  ✓ Generated valid PDF (%PDF- header present).');
    console.log('  ✓ Strictly outputs: "Current available cash: Not provided".');
    console.log('  ✓ Includes helpful prompt: "Add your available cash in FlexiFund to calculate your safety-cushion coverage."');
    passed++;
  } else {
    console.error('  ✗ Missing cash test failed:', {
      header: pdfNoCashHeader,
      hasNotProvided: pdfNoCashText.includes('Current available cash: Not provided'),
      hasAddCash: pdfNoCashText.includes('Add your available cash'),
    });
  }

  // TEST 2: PDF Generation with Confirmed Cash
  total++;
  console.log('\n[TEST 2] PDF Generation with Confirmed Cash Balance (₹12,000)...');
  const docWithCash = buildPdfDoc(
    analysis,
    {
      workerType: 'DELIVERY_WORKER',
      jurisdiction: 'Karnataka',
      state: 'Karnataka',
      city: 'Bengaluru',
      age: 27,
      currentCashBalanceRupees: '12000',
      financialGoal: 'Build emergency savings',
      primaryConcern: 'Income changes',
      hasBankAccount: true,
      isCoveredUnderEPFO_ESIC: false,
    }
  );

  const pdfWithCashText = await extractPdfText(docWithCash);
  if (pdfWithCashText.includes('Current available cash:') && pdfWithCashText.includes('days of essential living expenses')) {
    console.log('  ✓ Outputs confirmed cash and calculates essential expenses coverage days.');
    passed++;
  } else {
    console.error('  ✗ Confirmed cash test failed');
  }

  // TEST 3: Savings Opportunities Present vs Empty
  total++;
  console.log('\n[TEST 3] Savings Opportunities Section Formatting...');
  if (pdfNoCashText.includes('Where I May Be Able to Save')) {
    if (analysis.savingsOpportunities && analysis.savingsOpportunities.length > 0) {
      if (pdfNoCashText.includes('Potential saving')) {
        console.log(`  ✓ Successfully formatted opportunities with "Potential saving" label.`);
        passed++;
      } else {
        console.error('  ✗ Opportunities label format mismatch');
      }
    } else {
      if (pdfNoCashText.includes('No high-confidence savings opportunities were detected')) {
        console.log('  ✓ Correctly displays "No high-confidence savings opportunities were detected".');
        passed++;
      } else {
        console.error('  ✗ Empty opportunities format mismatch');
      }
    }
  } else {
    console.error('  ✗ Section 4 heading missing');
  }

  // TEST 4: Scenario Selected vs No Scenario Selected
  total++;
  console.log('\n[TEST 4] What If Scenario Formatting (Active vs None)...');
  const docWithScenario = buildPdfDoc(analysis, undefined, {
    scenario: {
      incomeDropPct: 20,
      scenarioLeft: 8000,
      isScenarioSolvent: true,
    },
  });
  const pdfScenarioText = await extractPdfText(docWithScenario);

  const test4A = pdfScenarioText.includes('Income change tested: -20%') && pdfScenarioText.includes('Planning scenario — not a prediction.');
  const test4B = pdfNoCashText.includes('No scenario selected yet.');

  if (test4A && test4B) {
    console.log('  ✓ Tested scenario displays: "Income change tested: -20%" & "Planning scenario — not a prediction."');
    console.log('  ✓ Default state cleanly displays: "No scenario selected yet." (Zero fake scenario numbers).');
    passed++;
  } else {
    console.error('  ✗ Scenario verification failed. test4A:', test4A, 'test4B:', test4B);
  }

  // TEST 5: Top 3 Next Steps Formatting
  total++;
  console.log('\n[TEST 5] Next 3 Steps Formatting (Action / Why / Potential impact)...');
  if (
    pdfNoCashText.includes('My Next 3 Steps') &&
    pdfNoCashText.includes('Why it matters:') &&
    pdfNoCashText.includes('Potential impact:')
  ) {
    console.log('  ✓ Steps formatted strictly with Action, Why it matters, and Potential impact.');
    passed++;
  } else {
    console.error('  ✗ 3 steps format mismatch');
  }

  // TEST 6: Things to Watch Section (Stress Indicators)
  total++;
  console.log('\n[TEST 6] Things to Watch Section Formatting...');
  if (pdfNoCashText.includes('Things to Watch')) {
    console.log('  ✓ Section 8 "Things to Watch" is present and formatted.');
    passed++;
  } else {
    console.error('  ✗ Section 8 "Things to Watch" missing');
  }

  // TEST 7: Page Numbers & Footer Presence
  total++;
  console.log('\n[TEST 7] Page Numbers & Footer Verification...');
  const totalPages = docNoCash.getNumberOfPages();
  if (totalPages >= 2 && pdfNoCashText.includes('Page 1 of') && pdfNoCashText.includes(`Page ${totalPages} of ${totalPages}`)) {
    console.log(`  ✓ Document paginated across ${totalPages} pages with "Page X of ${totalPages}" running footers.`);
    passed++;
  } else {
    console.error('  ✗ Pagination / footer check failed:', { totalPages, hasFooter: pdfNoCashText.includes('Page 1 of') });
  }

  // TEST 8: API Route /api/export Binary Stream Verification
  total++;
  console.log('\n[TEST 8] /api/export Route Verification...');
  try {
    const res = await fetch('http://localhost:3000/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysisData: analysis,
        format: 'pdf',
      }),
    });

    const contentType = res.headers.get('content-type');
    const contentDisposition = res.headers.get('content-disposition');
    const buf = await res.arrayBuffer();
    const isPdfHeader = Buffer.from(buf).subarray(0, 4).toString() === '%PDF';

    if (
      res.status === 200 &&
      contentType?.includes('application/pdf') &&
      contentDisposition?.includes('attachment') &&
      isPdfHeader
    ) {
      console.log(`  ✓ Status: 200 OK (${buf.byteLength} bytes)`);
      console.log(`  ✓ Content-Type: ${contentType}`);
      console.log(`  ✓ Content-Disposition: ${contentDisposition}`);
      console.log('  ✓ Valid binary %PDF header confirmed.');
      passed++;
    } else {
      console.error('  ✗ /api/export response mismatch:', {
        status: res.status,
        contentType,
        contentDisposition,
        isPdfHeader,
      });
    }
  } catch (err: any) {
    console.error('  ✗ /api/export network error:', err.message);
  }

  console.log('\n========================================================');
  console.log(`Verification Results: ${passed}/${total} Passed`);
  console.log('========================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runExportVerification().catch((err) => {
  console.error('Fatal error in export verification:', err);
  process.exit(1);
});
