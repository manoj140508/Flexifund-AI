/**
 * Master Financial Analysis Pipeline & Aggregator
 * 
 * Orchestrates the full deterministic pipeline:
 * Transactions → Income → Expenses → Resilience → Savings → Stress → Credit → Prioritization → Evidence
 * 
 * Provides unified Data Quality grading and JSON-safe boundary serialization.
 */

import { Money, SerializedMoney, serializeMoney, moneyFromPaise } from './money';
import { NormalizedTransaction } from './transactions';
import { IncomeAnalysis, SerializedIncomeAnalysis, analyzeIncome, serializeIncomeAnalysis } from './income';
import { ExpenseAnalysis, SerializedExpenseAnalysis, analyzeExpenses, serializeExpenseAnalysis } from './expenses';
import { ResilienceAnalysis, SerializedResilienceAnalysis, analyzeResilience, serializeResilienceAnalysis } from './resilience';
import {
  SavingsOpportunity,
  SerializedSavingsOpportunity,
  SavingsCapacityResult,
  SerializedSavingsCapacityResult,
  detectSavingsOpportunities,
  calculateSavingsCapacity,
  serializeSavingsOpportunities,
  serializeSavingsCapacity,
} from './savings';
import { FinancialStressIndicator, SerializedStressIndicator, detectFinancialStress, serializeStressIndicators } from './stress';
import {
  ProposedRepaymentEvaluation,
  SerializedProposedRepaymentEvaluation,
  WhatIfScenarioResult,
  SerializedWhatIfScenarioResult,
  evaluateProposedRepayment,
  simulateWhatIfScenario,
  serializeProposedRepaymentEvaluation,
  serializeWhatIfScenarioResult,
} from './credit';
import { ActionItem, SerializedActionItem, CandidateAction, prioritizeActions, serializeActionItems } from './prioritization';
import { RejectedRow, ParsingWarning, ParseStatistics, SerializedParseStatistics } from '../lib/csv-parser';

export interface DataQualityReport {
  scoreGrade: 'A' | 'B' | 'C' | 'D'; // A: >= 90%, B: >= 75%, C: >= 60%, D: < 60%
  totalRows: number;
  validRows: number;
  rejectedRows: number;
  duplicateSuspects: number;
  uncategorizedCount: number;
  uncategorizedPercentage: number;
  startDate: string | null;
  endDate: string | null;
  daysSpan: number;
  observedMonths: number;
  qualityIssues: string[];
}

export interface UnifiedEvidenceRecord {
  id: string;
  sourceModule: 'INCOME' | 'EXPENSES' | 'RESILIENCE' | 'SAVINGS' | 'STRESS' | 'CREDIT';
  metricKey: string;
  observedValue: string;
  calculationInputs: string;
  calculationResult: string;
  sourceTransactionIds: string[];
  sourceRowNumbers: number[];
  explanation: string;
}

export interface FinancialAnalysisResult {
  metadata: {
    analysisId: string;
    generatedAt: string;
    sourceReference: string;
    sourceType?: 'CSV' | 'PDF' | 'IMAGE';
    currency: 'INR';
    userProvidedCashBalance: Money | null;
  };
  transactionStatistics: ParseStatistics;
  dataQuality: DataQualityReport;
  incomeAnalysis: IncomeAnalysis;
  expenseAnalysis: ExpenseAnalysis;
  savingsOpportunities: SavingsOpportunity[];
  savingsCapacity: SavingsCapacityResult;
  resilienceAnalysis: ResilienceAnalysis;
  stressIndicators: FinancialStressIndicator[];
  proposedRepaymentEvaluation: ProposedRepaymentEvaluation | null;
  baselineWhatIfScenario: WhatIfScenarioResult;
  prioritizedActions: ActionItem[];
  evidenceRecords: UnifiedEvidenceRecord[];
  allLimitations: string[];
}

export interface SerializedFinancialAnalysisResult {
  metadata: {
    analysisId: string;
    generatedAt: string;
    sourceReference: string;
    sourceType?: 'CSV' | 'PDF' | 'IMAGE';
    currency: 'INR';
    userProvidedCashBalance: SerializedMoney | null;
  };
  transactionStatistics: SerializedParseStatistics;
  dataQuality: DataQualityReport;
  incomeAnalysis: SerializedIncomeAnalysis;
  expenseAnalysis: SerializedExpenseAnalysis;
  savingsOpportunities: SerializedSavingsOpportunity[];
  savingsCapacity: SerializedSavingsCapacityResult;
  resilienceAnalysis: SerializedResilienceAnalysis;
  stressIndicators: SerializedStressIndicator[];
  proposedRepaymentEvaluation: SerializedProposedRepaymentEvaluation | null;
  baselineWhatIfScenario: SerializedWhatIfScenarioResult;
  prioritizedActions: SerializedActionItem[];
  evidenceRecords: UnifiedEvidenceRecord[];
  allLimitations: string[];
}

export interface RunAnalysisInput {
  transactions: NormalizedTransaction[];
  rejectedRows?: RejectedRow[];
  warnings?: ParsingWarning[];
  statistics?: ParseStatistics;
  userProvidedCashBalance?: Money | null;
  proposedMonthlyRepaymentPaise?: bigint | null;
  sourceReference?: string;
  sourceType?: 'CSV' | 'PDF' | 'IMAGE';
}

/**
 * Executes the complete deterministic financial analysis pipeline.
 */
export function runFinancialAnalysis(input: RunAnalysisInput): FinancialAnalysisResult {
  const {
    transactions,
    rejectedRows = [],
    warnings = [],
    userProvidedCashBalance = null,
    proposedMonthlyRepaymentPaise = null,
    sourceReference = 'statement.csv',
  } = input;

  const analysisId = `ffa_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const generatedAt = new Date().toISOString();

  // 1. Transaction Statistics
  let totalIncomePaise = 0n;
  let totalExpensePaise = 0n;
  let duplicateSuspectCount = 0;
  let uncategorizedCount = 0;

  for (const tx of transactions) {
    if (tx.type === 'INCOME') totalIncomePaise += tx.amount.paise;
    if (tx.type === 'EXPENSE') totalExpensePaise += tx.amount.paise;
    if (tx.isDuplicateSuspected) duplicateSuspectCount += 1;
    if (tx.category === 'UNCATEGORIZED') uncategorizedCount += 1;
  }

  const validCount = transactions.length;
  const rejectedCount = rejectedRows.length;
  const totalRows = validCount + rejectedCount;

  const stats: ParseStatistics = input.statistics ?? {
    totalRowsProcessed: totalRows,
    validCount,
    rejectedCount,
    duplicateSuspectCount,
    totalIncomePaise,
    totalExpensePaise,
  };

  // 2. Data Quality Analysis
  const dates = transactions.map((t) => t.date).sort();
  const startDate = dates.length > 0 ? dates[0] : null;
  const endDate = dates.length > 0 ? dates[dates.length - 1] : null;

  let daysSpan = 0;
  if (startDate && endDate) {
    daysSpan = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }

  const distinctMonths = new Set(transactions.map((t) => t.date.slice(0, 7))).size;
  const uncatPercentage = validCount > 0 ? Math.round((uncategorizedCount / validCount) * 100) : 0;

  const qualityIssues: string[] = [];
  if (rejectedCount > 0) qualityIssues.push(`${rejectedCount} row(s) could not be parsed and were rejected.`);
  if (duplicateSuspectCount > 0) qualityIssues.push(`${duplicateSuspectCount} transaction(s) were flagged as suspected duplicates.`);
  if (warnings.length > 0 && duplicateSuspectCount === 0) qualityIssues.push(`${warnings.length} parsing warning(s) were identified.`);
  if (distinctMonths < 3) qualityIssues.push(`Only ${distinctMonths} month(s) of data available. Statistical confidence is limited.`);
  if (uncatPercentage > 25) qualityIssues.push(`${uncatPercentage}% of transactions could not be confidently categorized.`);

  let qualityGrade: 'A' | 'B' | 'C' | 'D' = 'A';
  if (qualityIssues.length >= 3 || distinctMonths < 2) qualityGrade = 'C';
  else if (qualityIssues.length >= 1) qualityGrade = 'B';
  if (validCount === 0 || rejectedCount > validCount) qualityGrade = 'D';

  const dataQuality: DataQualityReport = {
    scoreGrade: qualityGrade,
    totalRows,
    validRows: validCount,
    rejectedRows: rejectedCount,
    duplicateSuspects: duplicateSuspectCount,
    uncategorizedCount,
    uncategorizedPercentage: uncatPercentage,
    startDate,
    endDate,
    daysSpan,
    observedMonths: distinctMonths,
    qualityIssues,
  };

  // 3. Core Domain Analyses
  const incomeAnalysis = analyzeIncome(transactions);
  const expenseAnalysis = analyzeExpenses(transactions);

  const resilienceAnalysis = analyzeResilience({
    incomeAnalysis,
    expenseAnalysis,
    userProvidedCashBalance,
  });

  const savingsOpportunities = detectSavingsOpportunities({
    incomeAnalysis,
    expenseAnalysis,
    transactions,
  });

  const savingsCapacity = calculateSavingsCapacity(incomeAnalysis, expenseAnalysis);

  const stressIndicators = detectFinancialStress({
    incomeAnalysis,
    expenseAnalysis,
    resilienceAnalysis,
  });

  const simContext = {
    incomeAnalysis,
    expenseAnalysis,
    resilienceAnalysis,
  };

  // 4. Credit Commitment Evaluation (if requested)
  let proposedRepaymentEvaluation: ProposedRepaymentEvaluation | null = null;
  if (proposedMonthlyRepaymentPaise !== null && proposedMonthlyRepaymentPaise > 0n) {
    proposedRepaymentEvaluation = evaluateProposedRepayment(simContext, proposedMonthlyRepaymentPaise);
  }

  // 5. Baseline What-If Simulation
  const baselineWhatIfScenario = simulateWhatIfScenario(simContext, {
    incomeChangePercent: 0,
    essentialExpenseChangePaise: 0n,
  });

  // 6. Assemble Prioritized Actions
  const candidateActions: CandidateAction[] = [];

  // A. Buffer building action
  if (resilienceAnalysis.bufferCoverageDays === null || resilienceAnalysis.bufferCoverageDays < 30) {
    const isCritical = resilienceAnalysis.bufferCoverageDays !== null && resilienceAnalysis.bufferCoverageDays < 7;
    candidateActions.push({
      id: 'action_build_buffer',
      category: 'BUILD_EMERGENCY_BUFFER',
      title: isCritical ? 'Target Initial 7-Day Cash Cushion' : 'Expand Essential Cash Runway to 30 Days',
      description: resilienceAnalysis.isEstimatedFromHistoricalOnly
        ? 'Current bank balance was not provided. Focus on accumulating an emergency reserve in a separate liquid savings account.'
        : `Current buffer covers ~${resilienceAnalysis.bufferCoverageDays} days. Expanding this cushion shields living essentials from seasonal gig dips.`,
      urgency: isCritical ? 'CRITICAL' : 'HIGH',
      effort: 'MEDIUM',
      evidenceStrength: 'HIGH',
      evidence: {
        metricName: 'Coverage Days',
        observedValue: `${resilienceAnalysis.bufferCoverageDays ?? 0} days`,
        benchmarkThreshold: '30 days adequate threshold',
        explanation: `Daily essential burn is ₹${Number(expenseAnalysis.dailyEssentialBurnRate.paise) / 100}/day.`,
      },
      actionUrlOrPrompt: 'Set aside peak gig earnings before discretionary spending.',
    });
  }

  // B. Actions from Savings Opportunities
  for (const opp of savingsOpportunities) {
    if (opp.category === 'RECURRING_DISCRETIONARY_PAYMENT') {
      candidateActions.push({
        id: `action_${opp.id}`,
        category: 'REVIEW_RECURRING_PAYMENTS',
        title: opp.title,
        description: opp.description,
        potentialMonthlySaving: opp.potentialMonthlySaving,
        urgency: 'MODERATE',
        effort: 'LOW',
        evidenceStrength: opp.confidence,
        evidence: {
          metricName: opp.evidence.metricName,
          observedValue: opp.evidence.observedValue,
          benchmarkThreshold: 'Optional discretionary expense',
          sourceTransactionIds: opp.evidence.sourceTransactionIds,
          explanation: opp.evidence.explanation,
        },
        actionUrlOrPrompt: opp.recommendedAction,
      });
    } else if (opp.category === 'AVOIDABLE_FEES_CHARGES') {
      candidateActions.push({
        id: `action_${opp.id}`,
        category: 'ELIMINATE_AVOIDABLE_FEES',
        title: opp.title,
        description: opp.description,
        potentialMonthlySaving: opp.potentialMonthlySaving,
        urgency: 'MODERATE',
        effort: 'LOW',
        evidenceStrength: 'MEDIUM',
        evidence: {
          metricName: opp.evidence.metricName,
          observedValue: opp.evidence.observedValue,
          benchmarkThreshold: 'Zero avoidable fees',
          sourceTransactionIds: opp.evidence.sourceTransactionIds,
          explanation: opp.evidence.explanation,
        },
        actionUrlOrPrompt: opp.recommendedAction,
      });
    } else if (opp.category === 'SURPLUS_CAPTURE_PEAK_PERIOD') {
      candidateActions.push({
        id: `action_${opp.id}`,
        category: 'BUILD_EMERGENCY_BUFFER',
        title: opp.title,
        description: opp.description,
        potentialMonthlySaving: opp.potentialMonthlySaving,
        urgency: 'HIGH',
        effort: 'LOW',
        evidenceStrength: 'HIGH',
        evidence: {
          metricName: opp.evidence.metricName,
          observedValue: opp.evidence.observedValue,
          benchmarkThreshold: 'Peak earnings capture',
          sourceTransactionIds: opp.evidence.sourceTransactionIds,
          explanation: opp.evidence.explanation,
        },
        actionUrlOrPrompt: opp.recommendedAction,
      });
    }
  }

  const prioritizedActions = prioritizeActions(candidateActions, 4);

  // 7. Traceable Evidence Registry
  const evidenceRecords: UnifiedEvidenceRecord[] = [];

  // Income evidence
  if (incomeAnalysis.highestMonth) {
    evidenceRecords.push({
      id: 'ev_income_stats',
      sourceModule: 'INCOME',
      metricKey: 'INCOME_VOLATILITY',
      observedValue: `CV: ${incomeAnalysis.coefficientOfVariation ?? 'N/A'}, Volatility: ${incomeAnalysis.volatilityRating}`,
      calculationInputs: `Monthly average: ₹${Number(incomeAnalysis.monthlyAverage.paise) / 100}, StdDev: ₹${Number(incomeAnalysis.monthlyStandardDeviationPaise) / 100}`,
      calculationResult: `Conservative baseline reference: ₹${Number(incomeAnalysis.conservativeBaselineMonthly.paise) / 100}/mo`,
      sourceTransactionIds: incomeAnalysis.monthlyBreakdown.flatMap((m) => m.transactionIds),
      sourceRowNumbers: [],
      explanation: 'Derived from statistical variance across distinct monthly statement buckets.',
    });
  }

  // Expense burn evidence
  evidenceRecords.push({
    id: 'ev_essential_burn',
    sourceModule: 'EXPENSES',
    metricKey: 'ESSENTIAL_BURN_RATE',
    observedValue: `Essential monthly: ₹${Number(expenseAnalysis.essentialMonthlyBurn.paise) / 100}, Daily: ₹${Number(expenseAnalysis.dailyEssentialBurnRate.paise) / 100}`,
    calculationInputs: `Total expenses: ₹${Number(expenseAnalysis.totalExpenses.paise) / 100} over ${expenseAnalysis.sampleDurationDays} days`,
    calculationResult: `Essential expense ratio: ${(expenseAnalysis.essentialExpenseRatioBasisPoints / 100).toFixed(1)}%`,
    sourceTransactionIds: expenseAnalysis.categoryBreakdown.ESSENTIAL_GROCERIES.transactionIds.concat(
      expenseAnalysis.categoryBreakdown.ESSENTIAL_HOUSING.transactionIds,
      expenseAnalysis.categoryBreakdown.WORK_FUEL_TRANSIT.transactionIds
    ),
    sourceRowNumbers: [],
    explanation: 'Sum of housing, groceries, utilities, work transit, healthcare, and debt repayments.',
  });

  // Resilience evidence
  evidenceRecords.push({
    id: 'ev_resilience_score',
    sourceModule: 'RESILIENCE',
    metricKey: 'RESILIENCE_SCORE',
    observedValue: `${resilienceAnalysis.resilienceScore ?? 'N/A'}/100`,
    calculationInputs: resilienceAnalysis.scoreComponents.map((c) => `${c.name}: ${c.earnedPoints}/${c.maxPoints}`).join(', '),
    calculationResult: resilienceAnalysis.summaryExplanation,
    sourceTransactionIds: [],
    sourceRowNumbers: [],
    explanation: 'Weighted multi-component formulation: Coverage (40%), Stability (25%), Flexibility (20%), Debt (15%).',
  });

  // Compile all limitations
  const allLimitations: string[] = [
    ...incomeAnalysis.dataLimitations,
    ...resilienceAnalysis.dataLimitations,
    ...dataQuality.qualityIssues,
  ];

  const detectedSourceType: 'CSV' | 'PDF' | 'IMAGE' =
    input.sourceType ||
    (sourceReference.toLowerCase().endsWith('.pdf')
      ? 'PDF'
      : /\.(png|jpe?g|webp)$/i.test(sourceReference)
      ? 'IMAGE'
      : 'CSV');

  return {
    metadata: {
      analysisId,
      generatedAt,
      sourceReference,
      sourceType: detectedSourceType,
      currency: 'INR',
      userProvidedCashBalance,
    },
    transactionStatistics: stats,
    dataQuality,
    incomeAnalysis,
    expenseAnalysis,
    savingsOpportunities,
    savingsCapacity,
    resilienceAnalysis,
    stressIndicators,
    proposedRepaymentEvaluation,
    baselineWhatIfScenario,
    prioritizedActions,
    evidenceRecords,
    allLimitations: Array.from(new Set(allLimitations)),
  };
}

/**
 * Serializes the complete master financial analysis result for JSON transmission.
 */
export function serializeFinancialAnalysisResult(
  result: FinancialAnalysisResult
): SerializedFinancialAnalysisResult {
  return {
    metadata: {
      analysisId: result.metadata.analysisId,
      generatedAt: result.metadata.generatedAt,
      sourceReference: result.metadata.sourceReference,
      sourceType: result.metadata.sourceType,
      currency: 'INR',
      userProvidedCashBalance: result.metadata.userProvidedCashBalance
        ? serializeMoney(result.metadata.userProvidedCashBalance)
        : null,
    },
    transactionStatistics: {
      totalRowsProcessed: result.transactionStatistics.totalRowsProcessed,
      validCount: result.transactionStatistics.validCount,
      rejectedCount: result.transactionStatistics.rejectedCount,
      duplicateSuspectCount: result.transactionStatistics.duplicateSuspectCount,
      totalIncomePaise: result.transactionStatistics.totalIncomePaise.toString(),
      totalExpensePaise: result.transactionStatistics.totalExpensePaise.toString(),
    },
    dataQuality: result.dataQuality,
    incomeAnalysis: serializeIncomeAnalysis(result.incomeAnalysis),
    expenseAnalysis: serializeExpenseAnalysis(result.expenseAnalysis),
    savingsOpportunities: serializeSavingsOpportunities(result.savingsOpportunities),
    savingsCapacity: serializeSavingsCapacity(result.savingsCapacity),
    resilienceAnalysis: serializeResilienceAnalysis(result.resilienceAnalysis),
    stressIndicators: serializeStressIndicators(result.stressIndicators),
    proposedRepaymentEvaluation: result.proposedRepaymentEvaluation
      ? serializeProposedRepaymentEvaluation(result.proposedRepaymentEvaluation)
      : null,
    baselineWhatIfScenario: serializeWhatIfScenarioResult(result.baselineWhatIfScenario),
    prioritizedActions: serializeActionItems(result.prioritizedActions),
    evidenceRecords: result.evidenceRecords,
    allLimitations: result.allLimitations,
  };
}

/**
 * Re-evaluates resilience, emergency runway, and stress indicators when the user provides or updates their liquid cash balance.
 * Deterministic, purely client/server compatible without re-parsing transactions.
 */
export function recalculateResilienceWithCash(
  analysis: SerializedFinancialAnalysisResult,
  userCashPaise: bigint | null
): SerializedFinancialAnalysisResult {
  const inc = analysis.incomeAnalysis;
  const exp = analysis.expenseAnalysis;

  // Reconstruct IncomeAnalysis domain object for resilience and stress evaluation
  const domainIncome: IncomeAnalysis = {
    totalIncome: moneyFromPaise(BigInt(inc.totalIncome.paise)),
    monthlyAverage: moneyFromPaise(BigInt(inc.monthlyAverage.paise)),
    monthlyMedian: moneyFromPaise(BigInt(inc.monthlyMedian.paise)),
    monthlyStandardDeviationPaise: BigInt(inc.monthlyStandardDeviationPaise || '0'),
    coefficientOfVariation: inc.coefficientOfVariation,
    volatilityRating: inc.volatilityRating,
    conservativeBaselineMonthly: moneyFromPaise(BigInt(inc.conservativeBaselineMonthly.paise)),
    conservativePlanningLabel: inc.conservativePlanningLabel,
    trend: inc.trend,
    highestMonth: inc.highestMonth
      ? { period: inc.highestMonth.period, amount: moneyFromPaise(BigInt(inc.highestMonth.amount.paise)) }
      : null,
    lowestMonth: inc.lowestMonth
      ? { period: inc.lowestMonth.period, amount: moneyFromPaise(BigInt(inc.lowestMonth.amount.paise)) }
      : null,
    monthlyBreakdown: (inc.monthlyBreakdown || []).map((m) => ({
      periodKey: m.periodKey,
      totalPaise: BigInt(m.total.paise),
      transactionCount: m.transactionCount,
      transactionIds: m.transactionIds,
    })),
    weeklyBreakdown: (inc.weeklyBreakdown || []).map((w) => ({
      weekKey: w.weekKey,
      totalPaise: BigInt(w.total.paise),
      transactionCount: w.transactionCount,
      transactionIds: w.transactionIds,
    })),
    incomeConcentration: inc.incomeConcentration
      ? {
          topSourceMerchant: inc.incomeConcentration.topSourceMerchant,
          topSourcePaise: BigInt(inc.incomeConcentration.topSource.paise),
          percentageBasisPoints: inc.incomeConcentration.percentageBasisPoints,
        }
      : null,
    sampleDurationDays: inc.sampleDurationDays,
    sampleMonthsCount: inc.sampleMonthsCount,
    confidence: inc.confidence,
    dataLimitations: inc.dataLimitations || [],
  };

  // Reconstruct ExpenseAnalysis domain object for resilience and stress evaluation
  const domainExpense: ExpenseAnalysis = {
    totalExpenses: moneyFromPaise(BigInt(exp.totalExpenses.paise)),
    monthlyAverageExpenses: moneyFromPaise(BigInt(exp.monthlyAverageExpenses?.paise || exp.totalExpenses.paise)),
    essentialMonthlyBurn: moneyFromPaise(BigInt(exp.essentialMonthlyBurn.paise)),
    dailyBurnRate: moneyFromPaise(BigInt(exp.dailyBurnRate?.paise || '0')),
    dailyEssentialBurnRate: moneyFromPaise(BigInt(exp.dailyEssentialBurnRate.paise)),
    discretionaryMonthlyBurn: moneyFromPaise(BigInt(exp.discretionaryMonthlyBurn.paise)),
    workRelatedMonthlyBurn: moneyFromPaise(BigInt(exp.workRelatedMonthlyBurn.paise)),
    debtRepaymentsMonthly: moneyFromPaise(BigInt(exp.debtRepaymentsMonthly.paise)),
    feesAndChargesTotal: moneyFromPaise(BigInt(exp.feesAndChargesTotal?.paise || '0')),
    transfersTotal: moneyFromPaise(BigInt(exp.transfersTotal?.paise || '0')),
    uncategorizedTotal: moneyFromPaise(BigInt(exp.uncategorizedTotal?.paise || '0')),
    essentialExpenseRatioBasisPoints: exp.essentialExpenseRatioBasisPoints || 0,
    categoryBreakdown: Object.fromEntries(
      Object.entries(exp.categoryBreakdown || {}).map(([k, v]) => [
        k,
        {
          category: v.category,
          total: moneyFromPaise(BigInt(v.total.paise)),
          percentageBasisPoints: v.percentageBasisPoints || 0,
          transactionCount: v.transactionCount,
          transactionIds: v.transactionIds || [],
        },
      ])
    ) as any,
    majorCategories: exp.majorCategories || [],
    categoryTrends: exp.categoryTrends || [],
    unusualSpikes: [],
    recurringPayments: [],
    monthlyPeriods: (exp.monthlyPeriods || []).map((p) => ({
      periodKey: p.periodKey,
      total: moneyFromPaise(BigInt(p.total.paise)),
      essentialTotal: moneyFromPaise(BigInt(p.essentialTotal.paise)),
      discretionaryTotal: moneyFromPaise(BigInt(p.discretionaryTotal.paise)),
    })),
    sampleDurationDays: exp.sampleDurationDays,
    sampleMonthsCount: exp.sampleMonthsCount,
  };

  const cashMoney = userCashPaise !== null && userCashPaise >= 0n ? moneyFromPaise(userCashPaise) : null;

  const resilienceAnalysis = analyzeResilience({
    incomeAnalysis: domainIncome,
    expenseAnalysis: domainExpense,
    userProvidedCashBalance: cashMoney,
  });

  const stressIndicators = detectFinancialStress({
    incomeAnalysis: domainIncome,
    expenseAnalysis: domainExpense,
    resilienceAnalysis,
  });

  return {
    ...analysis,
    metadata: {
      ...analysis.metadata,
      userProvidedCashBalance: cashMoney ? serializeMoney(cashMoney) : null,
    },
    resilienceAnalysis: serializeResilienceAnalysis(resilienceAnalysis),
    stressIndicators: serializeStressIndicators(stressIndicators),
  };
}

