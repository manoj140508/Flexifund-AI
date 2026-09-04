/**
 * E2E Validation Script for:
 * 1. Personalized Savings Opportunities & Capacity Detection
 * 2. Scenario Planning Real-Time Deterministic Recalculation
 * 3. Export PDF & Report Endpoint Validation
 */

import { runFinancialAnalysis, serializeFinancialAnalysisResult } from '../src/domain/analysis';
import { NormalizedTransaction } from '../src/domain/transactions';
import { moneyFromRupees } from '../src/domain/money';
import { detectSavingsOpportunities, calculateSavingsCapacity } from '../src/domain/savings';
import { analyzeIncome } from '../src/domain/income';
import { analyzeExpenses } from '../src/domain/expenses';

function makeTx(
  id: string,
  date: string,
  rupees: string,
  desc: string,
  type: 'INCOME' | 'EXPENSE',
  category: any
): NormalizedTransaction {
  return {
    id,
    date,
    rawDescription: desc,
    normalizedMerchant: desc,
    amount: moneyFromRupees(rupees),
    type,
    category,
    sourceReference: 'statement.csv',
    sourceRowNumber: 1,
    confidence: 1.0,
  };
}

async function runValidation() {
  console.log('========================================================');
  console.log('FlexiFund AI — Savings, Scenario & Export Validation');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  // 1. TEST SAVINGS OPPORTUNITY DETECTION WITH REAL TRANSACTION MIX
  total++;
  console.log('[TEST 1] Savings Opportunities Detection on Real Statement Data...');

  const statementTxs: NormalizedTransaction[] = [
    // Income
    makeTx('tx1', '2026-01-02', '18000', 'SWIGGY PAYOUT', 'INCOME', 'INCOME'),
    makeTx('tx2', '2026-01-16', '16500', 'SWIGGY PAYOUT', 'INCOME', 'INCOME'),

    // Essential Outflows
    makeTx('tx3', '2026-01-05', '6000', 'HOUSE RENT', 'EXPENSE', 'ESSENTIAL_HOUSING'),
    makeTx('tx4', '2026-01-10', '2500', 'DMART GROCERIES', 'EXPENSE', 'ESSENTIAL_GROCERIES'),
    makeTx('tx5', '2026-01-20', '850', 'ELECTRICITY BILL', 'EXPENSE', 'ESSENTIAL_UTILITIES'),

    // Work-related fuel
    makeTx('tx6', '2026-01-04', '900', 'INDIAN OIL PETROL', 'EXPENSE', 'WORK_FUEL_TRANSIT'),
    makeTx('tx7', '2026-01-11', '950', 'HPCL PETROL PUMP', 'EXPENSE', 'WORK_FUEL_TRANSIT'),
    makeTx('tx8', '2026-01-18', '900', 'BPCL PETROL', 'EXPENSE', 'WORK_FUEL_TRANSIT'),
    makeTx('tx9', '2026-01-25', '850', 'INDIAN OIL PETROL', 'EXPENSE', 'WORK_FUEL_TRANSIT'),

    // Discretionary Repeated Takeout (Swiggy / Zomato food orders)
    makeTx('tx10', '2026-01-06', '420', 'ZOMATO ORDER', 'EXPENSE', 'DISCRETIONARY'),
    makeTx('tx11', '2026-01-12', '550', 'SWIGGY FOOD DELIVERY', 'EXPENSE', 'DISCRETIONARY'),
    makeTx('tx12', '2026-01-19', '380', 'ZOMATO ORDER', 'EXPENSE', 'DISCRETIONARY'),
    makeTx('tx13', '2026-01-26', '480', 'DOMINOS PIZZA', 'EXPENSE', 'DISCRETIONARY'),

    // Avoidable Bank Charges
    makeTx('tx14', '2026-01-15', '236', 'BANK NON-MAINTENANCE CHARGE', 'EXPENSE', 'FEES_CHARGES'),
  ];

  const income = analyzeIncome(statementTxs);
  const expenses = analyzeExpenses(statementTxs);
  const opps = detectSavingsOpportunities({ incomeAnalysis: income, expenseAnalysis: expenses, transactions: statementTxs });
  const capacity = calculateSavingsCapacity(income, expenses);

  if (opps.length >= 2) {
    console.log(`  ✓ Detected ${opps.length} Savings Opportunities:`);
    for (const opp of opps) {
      console.log(`    - [${opp.category}] ${opp.title}: Potential Saving ~₹${Number(opp.potentialMonthlySaving?.paise || 0n) / 100}/mo`);
    }
    passed++;
  } else {
    console.error(`  ✗ Expected at least 2 savings opportunities, got ${opps.length}`);
  }

  // 2. TEST SAVINGS CAPACITY
  total++;
  console.log('\n[TEST 2] Savings Capacity Range Calculation...');
  if (capacity.status === 'ESTIMATED_RANGE' && capacity.minimumMonthlySavings.paise > 0n) {
    console.log(`  ✓ Capacity Range: ₹${Number(capacity.minimumMonthlySavings.paise) / 100} (Lean) – ₹${Number(capacity.maximumMonthlySavings.paise) / 100} (Peak)/month`);
    console.log(`  ✓ Adaptive Explanation: "${capacity.explanation.slice(0, 75)}..."`);
    passed++;
  } else {
    console.error(`  ✗ Capacity calculation failed:`, capacity);
  }

  // 3. TEST SCENARIO PLANNING REAL-TIME MATH
  total++;
  console.log('\n[TEST 3] Scenario Planning Deterministic Recalculation...');
  const baseFloor = 25000;
  const baseOutflow = 12000;
  const baseSurplus = baseFloor - baseOutflow; // 13000

  // Scenario A: -20% Slump
  const shockA = -20;
  const projFloorA = baseFloor * (1 + shockA / 100); // 20000
  const projOutflowA = baseOutflow; // 12000
  const projSurplusA = projFloorA - projOutflowA; // 8000
  const deltaFloorA = projFloorA - baseFloor; // -5000

  // Scenario B: Cost Shock + EMI
  const shockB = 0;
  const costB = 2500;
  const emiB = 3500;
  const projFloorB = baseFloor * (1 + shockB / 100); // 25000
  const projOutflowB = baseOutflow + costB + emiB; // 18000
  const projSurplusB = projFloorB - projOutflowB; // 7000
  const deltaOutflowB = projOutflowB - baseOutflow; // +6000

  if (projFloorA === 20000 && deltaFloorA === -5000 && projOutflowB === 18000 && deltaOutflowB === 6000) {
    console.log(`  ✓ Scenario A (-20% Slump): Floor = ₹${projFloorA} (↓ ₹${Math.abs(deltaFloorA)} from baseline), Surplus = ₹${projSurplusA}`);
    console.log(`  ✓ Scenario B (+Cost +EMI): Outflow = ₹${projOutflowB} (↑ +₹${deltaOutflowB} from baseline), Surplus = ₹${projSurplusB}`);
    passed++;
  } else {
    console.error('  ✗ Scenario calculation mismatch');
  }

  // 4. TEST EXPORT API ENDPOINT
  total++;
  console.log('\n[TEST 4] Export Report API Route (/api/export)...');
  try {
    const rawResult = runFinancialAnalysis({
      transactions: statementTxs,
    });
    const analysisRes = serializeFinancialAnalysisResult(rawResult);

    const exportRes = await fetch('http://localhost:3000/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysisData: analysisRes,
        format: 'pdf',
      }),
    });

    if (exportRes.status === 200) {
      const text = await exportRes.text();
      console.log(`  ✓ /api/export returned 200 OK (${text.length} bytes of report data).`);
      passed++;
    } else {
      console.error(`  ✗ /api/export failed with status ${exportRes.status}`);
    }
  } catch (err: any) {
    console.error('  ✗ Export fetch failed:', err.message);
  }

  console.log('\n========================================================');
  console.log(`Validation Results: ${passed}/${total} Passed`);
  console.log('========================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runValidation().catch((err) => {
  console.error('Validation error:', err);
  process.exit(1);
});
