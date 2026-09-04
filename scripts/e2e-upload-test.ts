import fs from 'fs';
import path from 'path';

// Helper to build valid PDF binary buffer
function buildPdfBuffer(pagesLines: string[][]): Buffer {
  let objects: string[] = [];
  let pageObjectIds: number[] = [];
  
  // 1: Catalog, 2: Pages
  // 3..N: Page objects, Content objects, Font object
  let currentId = 3;
  const pageContents: { pageId: number; contentId: number; content: string }[] = [];

  for (const pageLines of pagesLines) {
    const pageId = currentId++;
    const contentId = currentId++;
    pageObjectIds.push(pageId);
    const content = pageLines.map((l, i) => `BT /F1 10 Tf 50 ${720 - i * 20} Td (${l}) Tj ET`).join('\n');
    pageContents.push({ pageId, contentId, content });
  }

  const fontId = currentId++;

  let body = `%PDF-1.4\n`;
  const offsets: number[] = [0];

  function addObj(id: number, str: string) {
    offsets[id] = Buffer.byteLength(body);
    body += `${id} 0 obj\n${str}\nendobj\n`;
  }

  // Catalog
  addObj(1, `<< /Type /Catalog /Pages 2 0 R >>`);
  // Pages
  addObj(2, `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`);

  for (const item of pageContents) {
    addObj(item.pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${item.contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`);
    addObj(item.contentId, `<< /Length ${Buffer.byteLength(item.content)} >>\nstream\n${item.content}\nendstream`);
  }

  addObj(fontId, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);

  const startxref = Buffer.byteLength(body);
  body += `xref\n0 ${currentId}\n0000000000 65535 f \n`;
  for (let i = 1; i < currentId; i++) {
    body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${currentId} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;

  return Buffer.from(body);
}

// 1x1 transparent PNG for unreadable test
const MINIMAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

async function runE2ETests() {
  console.log('========================================================');
  console.log('FlexiFund AI — End-to-End Statement Upload Pipeline Test');
  console.log('========================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  async function postExtract(filename: string, buffer: Buffer, mimeType: string) {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    formData.append('file', blob, filename);

    const res = await fetch('http://localhost:3000/api/extract', {
      method: 'POST',
      body: formData,
    });
    const status = res.status;
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { status, json };
  }

  async function postAnalyze(transactions: any[]) {
    const res = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions }),
    });
    const status = res.status;
    const json = await res.json();
    return { status, json };
  }

  // TEST 1: Real text-based bank statement PDF
  totalTests++;
  console.log(`[TEST 1] Single-Page Text PDF Bank Statement...`);
  const singlePagePdf = buildPdfBuffer([[
    '01/01/2026 SWIGGY PAYOUT 12500.00 12500.00',
    '03/01/2026 HPCL PETROL PUMP 450.00 12050.00',
    '08/01/2026 ZOMATO PAYOUT 14200.00 26250.00',
    '15/01/2026 HOUSE RENT TRANSFER 6000.00 20250.00',
    '22/01/2026 GROCERY STORE 1800.00 18450.00'
  ]]);

  const res1 = await postExtract('hdfc_bank_statement.pdf', singlePagePdf, 'application/pdf');
  if (res1.status === 200 && res1.json.transactions?.length >= 3) {
    console.log(`  ✓ Extracted ${res1.json.transactions.length} transactions from PDF.`);
    
    // Now pass to analysis
    const analyze1 = await postAnalyze(res1.json.transactions);
    const resResult1 = analyze1.json.resilienceAnalysis || analyze1.json.analysis?.resilienceAnalysis;
    if (analyze1.status === 200 && resResult1) {
      console.log(`  ✓ Deterministic Analysis Succeeded: Score = ${resResult1.resilienceScore}/100, Burn = ₹${Number(analyze1.json.expenseAnalysis.essentialMonthlyBurn.paise)/100}`);
      passedTests++;
    } else {
      console.error(`  ✗ Analysis failed for PDF:`, analyze1.json);
    }
  } else {
    console.error(`  ✗ PDF Extraction failed:`, res1.status, res1.json);
  }

  // TEST 2: Multi-Page Bank Statement PDF
  totalTests++;
  console.log(`\n[TEST 2] Multi-Page Bank Statement PDF...`);
  const multiPagePdf = buildPdfBuffer([
    [
      '01/01/2026 UBER INDIA DRIVER PAYOUT 15000.00 15000.00',
      '05/01/2026 INDIAN OIL CNG 650.00 14350.00'
    ],
    [
      '12/01/2026 RAPIDO RIDER EARNINGS 8500.00 22850.00',
      '18/01/2026 VEHICLE EMI BAJAJ AUTO 4200.00 18650.00',
      '28/01/2026 MOBILE RECHARGE AIRTEL 399.00 18251.00'
    ]
  ]);

  const res2 = await postExtract('multi_page_icici.pdf', multiPagePdf, 'application/pdf');
  if (res2.status === 200 && res2.json.transactions?.length >= 4) {
    console.log(`  ✓ Extracted ${res2.json.transactions.length} transactions across 2 pages.`);
    const analyze2 = await postAnalyze(res2.json.transactions);
    const resResult2 = analyze2.json.resilienceAnalysis || analyze2.json.analysis?.resilienceAnalysis;
    if (analyze2.status === 200 && resResult2) {
      console.log(`  ✓ Multi-Page Analysis Succeeded: Score = ${resResult2.resilienceScore}/100`);
      passedTests++;
    } else {
      console.error(`  ✗ Multi-page analysis failed:`, analyze2.json);
    }
  } else {
    console.error(`  ✗ Multi-page PDF extraction failed:`, res2.status, res2.json);
  }

  // TEST 3: CSV Statement
  totalTests++;
  console.log(`\n[TEST 3] Real CSV Statement...`);
  const csvContent = `Date,Description,Amount,Type
2026-01-02,URBAN COMPANY PAYOUT,18000.00,CREDIT
2026-01-05,APOLLO PHARMACY,620.00,DEBIT
2026-01-10,DMART GROCERIES,2400.00,DEBIT
2026-01-16,URBAN COMPANY PAYOUT,16500.00,CREDIT
2026-01-20,ROOM RENT PAYMENT,7000.00,DEBIT
2026-01-25,ELECTRICITY BILL,850.00,DEBIT`;

  const res3 = await postExtract('user_statement.csv', Buffer.from(csvContent), 'text/csv');
  if (res3.status === 200 && res3.json.transactions?.length === 6) {
    console.log(`  ✓ Extracted ${res3.json.transactions.length} transactions from CSV.`);
    const analyze3 = await postAnalyze(res3.json.transactions);
    const resResult3 = analyze3.json.resilienceAnalysis || analyze3.json.analysis?.resilienceAnalysis;
    if (analyze3.status === 200 && resResult3) {
      console.log(`  ✓ CSV Analysis Succeeded: Score = ${resResult3.resilienceScore}/100`);
      passedTests++;
    } else {
      console.error(`  ✗ CSV analysis failed:`, analyze3.json);
    }
  } else {
    console.error(`  ✗ CSV extraction failed:`, res3.status, res3.json);
  }

  // TEST 4: Unreadable / Poor Quality Image
  totalTests++;
  console.log(`\n[TEST 4] Unreadable / Blank Image (Graceful Rejection)...`);
  const res4 = await postExtract('blank_screenshot.png', MINIMAL_PNG, 'image/png');
  const err4 = res4.json.errorMessage || res4.json.error || '';
  if (res4.status === 422 && err4.includes('could not be read reliably')) {
    console.log(`  ✓ Properly rejected unreadable image with 422: "${err4}"`);
    passedTests++;
  } else if (res4.status === 422) {
    console.log(`  ✓ Rejected with 422: "${err4}"`);
    passedTests++;
  } else {
    console.error(`  ✗ Test 4 failed:`, res4.status, res4.json);
  }

  // TEST 5: Invalid File Type (e.g. .txt or rejected format)
  totalTests++;
  console.log(`\n[TEST 5] Invalid File Type (.txt file)...`);
  const res5 = await postExtract('notes.txt', Buffer.from('just a random note'), 'text/plain');
  if (res5.status === 400 && res5.json.error?.includes('Unsupported file type')) {
    console.log(`  ✓ Properly rejected unsupported file type with 400: "${res5.json.error}"`);
    passedTests++;
  } else {
    console.error(`  ✗ Unexpected result for invalid file:`, res5.status, res5.json);
  }

  // TEST 6: Empty File
  totalTests++;
  console.log(`\n[TEST 6] Empty File Handling...`);
  const res6 = await postExtract('empty.csv', Buffer.from(''), 'text/csv');
  if (res6.status === 400 && res6.json.error?.includes('empty')) {
    console.log(`  ✓ Properly rejected empty file with 400: "${res6.json.error}"`);
    passedTests++;
  } else {
    console.log(`  Result: status=${res6.status}, response=`, res6.json);
    if (res6.status === 400 || res6.status === 422) {
      passedTests++;
    }
  }

  console.log(`\n========================================================`);
  console.log(`E2E Pipeline Test Results: ${passedTests}/${totalTests} Passed`);
  console.log('========================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error('Fatal error during E2E tests:', err);
  process.exit(1);
});
