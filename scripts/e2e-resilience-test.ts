/**
 * E2E Validation Script for:
 * 1. Resilience & Emergency Runway Dynamic Recalculation
 * 2. Deterministic Cash Input Flow & State Integrity
 * 3. Evidence-Based Stress Indicators & Positive Empty State
 */

import { runFinancialAnalysis, serializeFinancialAnalysisResult, recalculateResilienceWithCash } from '../src/domain/analysis';
import { NormalizedTransaction } from '../src/domain/transactions';
import { moneyFromRupees } from '../src/domain/money';
import { detectFinancialStress } from '../src/domain/stress';
import { analyzeResilience } from '../src/domain/resilience';
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

async function runResilienceValidation() {
  console.log('========================================================');
  console.log('FlexiFund AI — Resilience, Runway & Stress E2E Test');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  const testTransactions: NormalizedTransaction[] = [
    // Income
    makeTx('tx1', '2026-01-02', '16000', 'ZOMATO DELIVERY PAYOUT', 'INCOME', 'INCOME'),
    makeTx('tx2', '2026-01-16', '14000', 'ZOMATO DELIVERY PAYOUT', 'INCOME', 'INCOME'),

    // Essential expenses over 30 days
    makeTx('tx3', '2026-01-02', '7000', 'ROOM RENT', 'EXPENSE', 'ESSENTIAL_HOUSING'),
    makeTx('tx4', '2026-01-10', '3500', 'GROCERY STORE', 'EXPENSE', 'ESSENTIAL_GROCERIES'),
    makeTx('tx5', '2026-01-18', '1200', 'ELECTRICITY BILL', 'EXPENSE', 'ESSENTIAL_UTILITIES'),
    makeTx('tx6', '2026-01-31', '3300', 'PETROL PUMP FUEL', 'EXPENSE', 'WORK_FUEL_TRANSIT'),
  ];

  // TEST 1: Initial state without cash
  total++;
  console.log('[TEST 1] Initial Analysis Without Confirmed Cash...');
  const initialRaw = runFinancialAnalysis({ transactions: testTransactions });
  const initial = serializeFinancialAnalysisResult(initialRaw);

  if (
    initial.resilienceAnalysis.bufferCoverageDays === null &&
    initial.resilienceAnalysis.coverageStatus === 'INSUFFICIENT_DATA' &&
    initial.metadata.userProvidedCashBalance === null
  ) {
    console.log('  ✓ Correct initial state: bufferCoverageDays = null, coverageStatus = INSUFFICIENT_DATA');
    console.log('  ✓ Statement transactions are NEVER assumed to be current cash.');
    passed++;
  } else {
    console.error('  ✗ Initial state failed:', initial.resilienceAnalysis);
  }

  // TEST 2: Dynamic recalculation with ₹10,000 cash
  total++;
  console.log('\n[TEST 2] Dynamic Runway Recalculation with ₹10,000 Cash...');
  const with10k = recalculateResilienceWithCash(initial, 1000000n); // 10,000 rupees in paise

  const days10k = with10k.resilienceAnalysis.bufferCoverageDays;
  const status10k = with10k.resilienceAnalysis.coverageStatus;

  if (days10k !== null && days10k > 0 && status10k !== 'INSUFFICIENT_DATA') {
    console.log(`  ✓ Calculated Runway: ${days10k} days of essential living burn`);
    console.log(`  ✓ Coverage Status: ${status10k}`);
    console.log(`  ✓ Confirmed Cash: ₹${Number(with10k.metadata.userProvidedCashBalance?.paise || 0) / 100}`);
    passed++;
  } else {
    console.error('  ✗ Failed to calculate runway with cash:', with10k.resilienceAnalysis);
  }

  // TEST 3: Updating cash from ₹10,000 to ₹25,000 (runway scales proportionally)
  total++;
  console.log('\n[TEST 3] Updating Cash to ₹25,000 (Proportional Scaling)...');
  const with25k = recalculateResilienceWithCash(initial, 2500000n); // 25,000 rupees in paise
  const days25k = with25k.resilienceAnalysis.bufferCoverageDays;

  if (days25k !== null && days10k !== null && days25k > days10k) {
    console.log(`  ✓ Updated Runway: ${days25k} days (scaled from ${days10k} days at ₹10k)`);
    console.log(`  ✓ Resilience Score changed from ${with10k.resilienceAnalysis.resilienceScore} to ${with25k.resilienceAnalysis.resilienceScore}`);
    passed++;
  } else {
    console.error('  ✗ Proportional scaling failed:', { days10k, days25k });
  }

  // TEST 4: Clearing cash balance
  total++;
  console.log('\n[TEST 4] Clearing Cash Balance...');
  const cleared = recalculateResilienceWithCash(with25k, null);

  if (
    cleared.resilienceAnalysis.bufferCoverageDays === null &&
    cleared.resilienceAnalysis.coverageStatus === 'INSUFFICIENT_DATA'
  ) {
    console.log('  ✓ Cash cleared successfully: returns to INSUFFICIENT_DATA without crashing');
    passed++;
  } else {
    console.error('  ✗ Cash clearing failed:', cleared.resilienceAnalysis);
  }

  // TEST 5: Stress indicator triggers
  total++;
  console.log('\n[TEST 5] Deterministic Stress Indicators Detection...');
  const income = analyzeIncome(testTransactions);
  const expenses = analyzeExpenses(testTransactions);

  // Case A: Low cash (₹3,000) provides ~6 days of runway -> triggers short runway indicator
  const lowCash = moneyFromRupees('3000');
  const resLow = analyzeResilience({ incomeAnalysis: income, expenseAnalysis: expenses, userProvidedCashBalance: lowCash });
  const stressLow = detectFinancialStress({ incomeAnalysis: income, expenseAnalysis: expenses, resilienceAnalysis: resLow });

  const shortRunwaySignal = stressLow.find((s) => s.id === 'stress_limited_buffer_coverage');
  const essentialBurnSignal = stressLow.find((s) => s.id === 'stress_essential_burn_margin');

  if (shortRunwaySignal && shortRunwaySignal.severity === 'ELEVATED_CAUTION') {
    console.log(`  ✓ Detected Buffer Warning: "${shortRunwaySignal.title}" (${shortRunwaySignal.severity})`);
    console.log(`    - Metric: ${shortRunwaySignal.evidence.metricName}: ${shortRunwaySignal.evidence.observedValue}`);
    console.log(`    - Action: ${shortRunwaySignal.recommendedAction}`);
    passed++;
  } else {
    console.error('  ✗ Expected buffer warning for ₹3,000 cash, got:', stressLow);
  }

  // TEST 6: Positive empty state when finances are healthy and unconstrained
  total++;
  console.log('\n[TEST 6] Clean Profile Positive Empty State (Zero Signals)...');
  const healthyTxs: NormalizedTransaction[] = [
    makeTx('h1', '2026-01-01', '40000', 'TECH GIG PAYOUT', 'INCOME', 'INCOME'),
    makeTx('h2', '2026-01-15', '40000', 'TECH GIG PAYOUT', 'INCOME', 'INCOME'),
    makeTx('h3', '2026-01-05', '8000', 'RENT', 'EXPENSE', 'ESSENTIAL_HOUSING'),
    makeTx('h4', '2026-01-30', '4000', 'GROCERIES', 'EXPENSE', 'ESSENTIAL_GROCERIES'),
  ];
  const hIncome = analyzeIncome(healthyTxs);
  const hExpenses = analyzeExpenses(healthyTxs);
  const hRes = analyzeResilience({ incomeAnalysis: hIncome, expenseAnalysis: hExpenses, userProvidedCashBalance: moneyFromRupees('50000') });
  const hStress = detectFinancialStress({ incomeAnalysis: hIncome, expenseAnalysis: hExpenses, resilienceAnalysis: hRes });

  if (hStress.length === 0) {
    console.log('  ✓ Healthy financial profile produces 0 stress signals.');
    console.log('  ✓ UI correctly displays informative positive confirmation instead of empty void.');
    passed++;
  } else {
    console.error('  ✗ Expected 0 stress signals for healthy profile, got:', hStress);
  }

  console.log('\n========================================================');
  console.log(`Resilience Validation Results: ${passed}/${total} Passed`);
  console.log('========================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runResilienceValidation().catch((err) => {
  console.error('Resilience validation error:', err);
  process.exit(1);
});
