import http from 'http';

function request(options: http.RequestOptions, body?: any): Promise<{ status: number; headers: http.IncomingHttpHeaders; data: string }> {
  return new Promise((resolve, reject) => {
    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const headers = { ...options.headers };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request({ ...options, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, data }));
    });
    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function run() {
  console.log('Testing Add Expense Persistence & Append Guarantees E2E...');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  // 1. Initial Upload of Statement (Income: ₹30,000, Expenses: ₹12,000)
  const statementCsv = [
    'Date,Description,Amount,Type',
    '2026-08-01,Zomato Delivery Payout,30000.00,Credit',
    '2026-08-05,Room Rent,8000.00,Debit',
    '2026-08-10,Grocery Store,4000.00,Debit',
  ].join('\n');

  const uploadRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/analyze',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      csvContent: statementCsv,
      sourceReference: 'august_statement.csv',
      sourceType: 'CSV',
    }
  );

  assert(uploadRes.status === 200, `Initial CSV upload succeeded (Status: ${uploadRes.status})`);
  const initialData = JSON.parse(uploadRes.data);

  assert(Array.isArray(initialData.transactions) && initialData.transactions.length === 3, 'CSV upload returns canonical transactions array');
  assert(initialData.incomeAnalysis.totalIncome.paise === '3000000', 'Initial total income is ₹30,000');
  assert(initialData.expenseAnalysis.totalExpenses.paise === '1200000', 'Initial total expenses is ₹12,000');

  // 2. User Adds Expense: "Petrol" ₹300
  const petrolTx = {
    id: `expense_${Date.now()}_petrol`,
    date: '2026-08-15',
    description: 'Petrol',
    amountPaise: '30000', // ₹300
    type: 'DEBIT' as const,
    category: 'ESSENTIAL_TRANSPORT',
    source: 'Manual',
  };

  // Append: existing 3 transactions + new expense
  const step2Txs = [...initialData.transactions, petrolTx];

  const addExpenseRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/analyze',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      transactions: step2Txs,
      sourceReference: 'user-added-expense',
    }
  );

  assert(addExpenseRes.status === 200, `Add Expense succeeded (Status: ${addExpenseRes.status})`);
  const step2Data = JSON.parse(addExpenseRes.data);

  assert(step2Data.transactions.length === 4, 'Complete transactions list now has 4 transactions (appended, not replaced)');
  assert(step2Data.incomeAnalysis.totalIncome.paise === '3000000', 'Original ₹30,000 income remains completely intact');
  assert(step2Data.expenseAnalysis.totalExpenses.paise === '1230000', 'Total expenses updated to ₹12,300 (₹12,000 + ₹300)');

  // Net surplus check: ₹30,000 - ₹12,300 = ₹17,700
  const netPaise = BigInt(step2Data.incomeAnalysis.totalIncome.paise) - BigInt(step2Data.expenseAnalysis.totalExpenses.paise);
  assert(netPaise === 1770000n, 'Net surplus accurately calculated as ₹17,700');

  // 3. User Adds another Expense via Receipt: "Medical Pharmacy" ₹450
  const receiptTx = {
    id: `expense_${Date.now()}_receipt`,
    date: '2026-08-18',
    description: 'Apollo Pharmacy',
    amountPaise: '45000', // ₹450
    type: 'DEBIT' as const,
    category: 'HEALTHCARE',
    source: 'Receipt',
  };

  const step3Txs = [...step2Data.transactions, receiptTx];

  const receiptRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/analyze',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      transactions: step3Txs,
      sourceReference: 'user-added-expense',
    }
  );

  const step3Data = JSON.parse(receiptRes.data);
  assert(step3Data.transactions.length === 5, 'All 5 transactions preserved after receipt addition');
  assert(step3Data.incomeAnalysis.totalIncome.paise === '3000000', 'Original income is still ₹30,000');
  assert(step3Data.expenseAnalysis.totalExpenses.paise === '1275000', 'Total expenses is now ₹12,750 (₹12,300 + ₹450)');

  // 4. Source Tracking Verification
  const sources = step3Data.transactions.map((t: any) => t.source);
  assert(sources.includes('CSV') || sources.includes('august_statement.csv'), 'Original CSV statement source preserved');
  assert(sources.includes('Manual'), 'Manual expense source preserved');
  assert(sources.includes('Receipt'), 'Receipt expense source preserved');

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
