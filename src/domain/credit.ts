/**
 * Responsible Credit Analysis & What-If Simulation Domain Module
 * 
 * Deterministic mathematical simulation for testing proposed financial commitments,
 * income adjustments, and cost shocks.
 * 
 * NON-NEGOTIABLE PRINCIPLES:
 * 1. This system provides responsible financial decision support, NOT regulated credit underwriting.
 * 2. We do NOT "approve" or "reject" loans.
 * 3. Language: "Based on the information provided, this additional fixed commitment may increase financial pressure."
 * 4. All scenario outputs are derived mathematically from actual transaction analysis.
 */

import { Money, moneyFromPaise, formatRupees, SerializedMoney, serializeMoney } from './money';
import { IncomeAnalysis } from './income';
import { ExpenseAnalysis } from './expenses';
import { ResilienceAnalysis } from './resilience';

export type CreditPressureLevel = 'LOWER_PRESSURE' | 'MODERATE_PRESSURE' | 'HIGHER_PRESSURE' | 'INSUFFICIENT_DATA';

export interface ProposedRepaymentEvaluation {
  proposedMonthlyRepayment: Money;
  pressureLevel: CreditPressureLevel;
  disposableIncomeBefore: Money;
  disposableIncomeAfter: Money;
  disposableIncomeDelta: Money;
  conservativeIncomeCoverageRatio: number; // Proposed EMI as % of conservative baseline
  essentialExpensesRatioAfter: number; // (Essential + EMI) as % of conservative baseline
  coverageDaysBefore: number | null;
  coverageDaysAfter: number | null;
  coverageDaysDelta: number | null;
  guidanceSummary: string;
  evidenceBasedExplanation: string;
  saferAlternativeAdvice?: string;
}

export interface SerializedProposedRepaymentEvaluation {
  proposedMonthlyRepayment: SerializedMoney;
  pressureLevel: CreditPressureLevel;
  disposableIncomeBefore: SerializedMoney;
  disposableIncomeAfter: SerializedMoney;
  disposableIncomeDelta: SerializedMoney;
  conservativeIncomeCoverageRatio: number;
  essentialExpensesRatioAfter: number;
  coverageDaysBefore: number | null;
  coverageDaysAfter: number | null;
  coverageDaysDelta: number | null;
  guidanceSummary: string;
  evidenceBasedExplanation: string;
  saferAlternativeAdvice?: string;
}

export interface WhatIfScenarioInput {
  incomeChangePercent?: number; // e.g. -20 for -20%
  essentialExpenseChangePaise?: bigint; // e.g. +200000n for +₹2,000
  proposedMonthlyRepaymentPaise?: bigint; // e.g. +300000n for +₹3,000
  additionalSavingsPaise?: bigint; // e.g. +150000n for +₹1,500
}

export interface WhatIfScenarioMetric {
  name: string;
  baseline: Money;
  projected: Money;
  delta: Money;
  explanation: string;
}

export interface WhatIfScenarioResult {
  incomeMetric: WhatIfScenarioMetric;
  essentialExpenseMetric: WhatIfScenarioMetric;
  monthlySurplusMetric: WhatIfScenarioMetric;
  coverageDaysBaseline: number | null;
  coverageDaysProjected: number | null;
  coverageDaysDelta: number | null;
  overallImpactSummary: string;
}

export interface SerializedWhatIfScenarioMetric {
  name: string;
  baseline: SerializedMoney;
  projected: SerializedMoney;
  delta: SerializedMoney;
  explanation: string;
}

export interface SerializedWhatIfScenarioResult {
  incomeMetric: SerializedWhatIfScenarioMetric;
  essentialExpenseMetric: SerializedWhatIfScenarioMetric;
  monthlySurplusMetric: SerializedWhatIfScenarioMetric;
  coverageDaysBaseline: number | null;
  coverageDaysProjected: number | null;
  coverageDaysDelta: number | null;
  overallImpactSummary: string;
}

export interface SimulationContext {
  incomeAnalysis: IncomeAnalysis;
  expenseAnalysis: ExpenseAnalysis;
  resilienceAnalysis: ResilienceAnalysis;
}

/**
 * Deterministically evaluates a proposed new monthly commitment (e.g. loan EMI or recurring pledge).
 */
export function evaluateProposedRepayment(
  context: SimulationContext,
  proposedMonthlyRepaymentPaise: bigint
): ProposedRepaymentEvaluation {
  const { incomeAnalysis, expenseAnalysis, resilienceAnalysis } = context;
  const repayment = moneyFromPaise(proposedMonthlyRepaymentPaise);

  if (incomeAnalysis.sampleMonthsCount === 0 || expenseAnalysis.sampleMonthsCount === 0) {
    return {
      proposedMonthlyRepayment: repayment,
      pressureLevel: 'INSUFFICIENT_DATA',
      disposableIncomeBefore: moneyFromPaise(0n),
      disposableIncomeAfter: moneyFromPaise(0n),
      disposableIncomeDelta: moneyFromPaise(0n),
      conservativeIncomeCoverageRatio: 0,
      essentialExpensesRatioAfter: 0,
      coverageDaysBefore: null,
      coverageDaysAfter: null,
      coverageDaysDelta: null,
      guidanceSummary: 'Insufficient statement history to evaluate proposed commitment.',
      evidenceBasedExplanation: 'At least 1–3 months of transaction history are required to project commitment impact.',
    };
  }

  // 1. Conservative baseline and burn
  const conservativeIncomePaise = incomeAnalysis.conservativeBaselineMonthly.paise;
  const essentialBurnPaise = expenseAnalysis.essentialMonthlyBurn.paise;
  const existingDebtPaise = expenseAnalysis.debtRepaymentsMonthly.paise;

  // Disposable under conservative baseline before proposed repayment
  const disposableBeforePaise = conservativeIncomePaise - (essentialBurnPaise + existingDebtPaise);
  const disposableAfterPaise = disposableBeforePaise - proposedMonthlyRepaymentPaise;

  // 2. Ratios relative to conservative income
  let commitmentRatio = 0;
  let totalFixedRatioAfter = 0;
  if (conservativeIncomePaise > 0n) {
    commitmentRatio = Math.round(Number((proposedMonthlyRepaymentPaise * 1000n) / conservativeIncomePaise)) / 10;
    totalFixedRatioAfter = Math.round(Number(((essentialBurnPaise + existingDebtPaise + proposedMonthlyRepaymentPaise) * 1000n) / conservativeIncomePaise)) / 10;
  }

  // 3. Buffer impact
  const baselineCoverageDays = resilienceAnalysis.bufferCoverageDays;
  let projectedCoverageDays: number | null = null;
  let coverageDaysDelta: number | null = null;

  // Scale daily burn proportionally
  const baseDailyEssentialPaise = expenseAnalysis.dailyEssentialBurnRate.paise;
  const newEssentialMonthlyPaise = essentialBurnPaise + proposedMonthlyRepaymentPaise;

  let projectedDailyEssentialPaise = 0n;
  if (essentialBurnPaise > 0n && baseDailyEssentialPaise > 0n) {
    projectedDailyEssentialPaise = (newEssentialMonthlyPaise * baseDailyEssentialPaise) / essentialBurnPaise;
  } else {
    projectedDailyEssentialPaise = newEssentialMonthlyPaise / 30n;
  }

  if (projectedDailyEssentialPaise > 0n) {
    const availableBalancePaise = resilienceAnalysis.userProvidedCurrentBalance
      ? resilienceAnalysis.userProvidedCurrentBalance.paise
      : resilienceAnalysis.estimatedHistoricalNetSurplus.paise;

    if (availableBalancePaise > 0n) {
      projectedCoverageDays = Number(availableBalancePaise / projectedDailyEssentialPaise);
      if (baselineCoverageDays !== null) {
        coverageDaysDelta = projectedCoverageDays - baselineCoverageDays;
      }
    } else {
      projectedCoverageDays = 0;
      if (baselineCoverageDays !== null) {
        coverageDaysDelta = -baselineCoverageDays;
      }
    }
  }

  // 4. Determine Pressure Level & Guidance
  let pressureLevel: CreditPressureLevel = 'LOWER_PRESSURE';
  let guidanceSummary = '';
  let explanation = '';
  let saferAlternative: string | undefined;

  if (commitmentRatio >= 30 || totalFixedRatioAfter >= 95 || (projectedCoverageDays !== null && projectedCoverageDays < 10 && proposedMonthlyRepaymentPaise > 0n)) {
    pressureLevel = 'HIGHER_PRESSURE';
    guidanceSummary = 'Based on the information provided, this additional fixed commitment may place higher financial pressure on your cash flow.';
    explanation = `A ${formatRupees(repayment)} monthly repayment would consume ${commitmentRatio}% of your conservative planning income (${formatRupees(incomeAnalysis.conservativeBaselineMonthly)}). Combined with living essentials, fixed commitments would absorb ${totalFixedRatioAfter}% of earnings during lower-income months.`;
    saferAlternative = 'Consider building at least 30 days of emergency cash coverage before taking on new fixed commitments, or seek flexible micro-financing options with lower monthly outlays.';
  } else if (commitmentRatio >= 15 || totalFixedRatioAfter >= 80 || (projectedCoverageDays !== null && projectedCoverageDays < 21 && proposedMonthlyRepaymentPaise > 0n)) {
    pressureLevel = 'MODERATE_PRESSURE';
    guidanceSummary = 'Based on the information provided, this additional fixed commitment may moderately reduce your financial buffer.';
    explanation = `A ${formatRupees(repayment)} monthly repayment represents ${commitmentRatio}% of your conservative income reference. It remains affordable in average months, but narrows your emergency margin if earnings drop.`;
    saferAlternative = 'Ensure you have at least 14–21 days of essential reserves saved before formalizing this repayment.';
  } else {
    pressureLevel = 'LOWER_PRESSURE';
    guidanceSummary = 'Based on the information provided, this commitment appears to have a lower impact on your conservative cash flow.';
    explanation = `The proposed repayment consumes ${commitmentRatio}% of conservative monthly income and leaves an estimated disposable margin of ${formatRupees(moneyFromPaise(disposableAfterPaise))}.`;
  }

  return {
    proposedMonthlyRepayment: repayment,
    pressureLevel,
    disposableIncomeBefore: moneyFromPaise(disposableBeforePaise),
    disposableIncomeAfter: moneyFromPaise(disposableAfterPaise),
    disposableIncomeDelta: moneyFromPaise(-proposedMonthlyRepaymentPaise),
    conservativeIncomeCoverageRatio: commitmentRatio,
    essentialExpensesRatioAfter: totalFixedRatioAfter,
    coverageDaysBefore: baselineCoverageDays,
    coverageDaysAfter: projectedCoverageDays,
    coverageDaysDelta,
    guidanceSummary,
    evidenceBasedExplanation: explanation,
    saferAlternativeAdvice: saferAlternative,
  };
}

/**
 * Deterministically simulates a multi-factor What-If financial scenario.
 */
export function simulateWhatIfScenario(
  context: SimulationContext,
  input: WhatIfScenarioInput
): WhatIfScenarioResult {
  const { incomeAnalysis, expenseAnalysis, resilienceAnalysis } = context;

  // 1. Income adjustment
  const baseIncomePaise = incomeAnalysis.conservativeBaselineMonthly.paise;
  const pct = input.incomeChangePercent ?? 0;
  const projectedIncomePaise = (baseIncomePaise * BigInt(Math.max(0, 100 + pct))) / 100n;

  const incomeMetric: WhatIfScenarioMetric = {
    name: 'Conservative Planning Income',
    baseline: incomeAnalysis.conservativeBaselineMonthly,
    projected: moneyFromPaise(projectedIncomePaise),
    delta: moneyFromPaise(projectedIncomePaise - baseIncomePaise),
    explanation: pct !== 0 ? `Simulated ${pct > 0 ? '+' : ''}${pct}% variation on conservative planning reference.` : 'No income adjustment simulated.',
  };

  // 2. Essential expense adjustment
  const baseEssentialPaise = expenseAnalysis.essentialMonthlyBurn.paise;
  const expenseChangePaise = input.essentialExpenseChangePaise ?? 0n;
  const proposedRepaymentPaise = input.proposedMonthlyRepaymentPaise ?? 0n;
  const projectedEssentialPaise = baseEssentialPaise + expenseChangePaise + proposedRepaymentPaise;

  const essentialExpenseMetric: WhatIfScenarioMetric = {
    name: 'Essential Monthly Commitments',
    baseline: expenseAnalysis.essentialMonthlyBurn,
    projected: moneyFromPaise(projectedEssentialPaise),
    delta: moneyFromPaise(projectedEssentialPaise - baseEssentialPaise),
    explanation: `Includes baseline essentials (${formatRupees(expenseAnalysis.essentialMonthlyBurn)})${expenseChangePaise !== 0n ? ` + ${formatRupees(moneyFromPaise(expenseChangePaise))} inflation` : ''}${proposedRepaymentPaise > 0n ? ` + ${formatRupees(moneyFromPaise(proposedRepaymentPaise))} new commitment` : ''}.`,
  };

  // 3. Monthly surplus adjustment
  const baseSurplusPaise = incomeAnalysis.monthlyAverage.paise - expenseAnalysis.monthlyAverageExpenses.paise;
  const avgIncomeProjectedPaise = (incomeAnalysis.monthlyAverage.paise * BigInt(Math.max(0, 100 + pct))) / 100n;
  const avgExpensesProjectedPaise = expenseAnalysis.monthlyAverageExpenses.paise + expenseChangePaise + proposedRepaymentPaise;
  const projectedSurplusPaise = avgIncomeProjectedPaise - avgExpensesProjectedPaise;

  const monthlySurplusMetric: WhatIfScenarioMetric = {
    name: 'Average Monthly Surplus',
    baseline: moneyFromPaise(baseSurplusPaise),
    projected: moneyFromPaise(projectedSurplusPaise),
    delta: moneyFromPaise(projectedSurplusPaise - baseSurplusPaise),
    explanation: 'Net remaining cash flow after all projected monthly earnings and commitments.',
  };

  // 4. Buffer impact
  const baselineCoverageDays = resilienceAnalysis.bufferCoverageDays;
  let projectedCoverageDays: number | null = null;
  let coverageDaysDelta: number | null = null;

  const baseDailyEssentialPaise = expenseAnalysis.dailyEssentialBurnRate.paise;
  let projectedDailyEssentialPaise = 0n;
  if (baseEssentialPaise > 0n && baseDailyEssentialPaise > 0n) {
    projectedDailyEssentialPaise = (projectedEssentialPaise * baseDailyEssentialPaise) / baseEssentialPaise;
  } else {
    projectedDailyEssentialPaise = projectedEssentialPaise / 30n;
  }

  if (projectedDailyEssentialPaise > 0n) {
    const availableBalancePaise = resilienceAnalysis.userProvidedCurrentBalance
      ? resilienceAnalysis.userProvidedCurrentBalance.paise
      : resilienceAnalysis.estimatedHistoricalNetSurplus.paise;

    if (availableBalancePaise > 0n) {
      projectedCoverageDays = Number(availableBalancePaise / projectedDailyEssentialPaise);
      if (baselineCoverageDays !== null) {
        coverageDaysDelta = projectedCoverageDays - baselineCoverageDays;
      }
    } else {
      projectedCoverageDays = 0;
      if (baselineCoverageDays !== null) {
        coverageDaysDelta = -baselineCoverageDays;
      }
    }
  }

  // Summary description
  let summary = '';
  if (projectedSurplusPaise < 0n) {
    summary = `Caution: Under this scenario, projected monthly commitments exceed average income by ${formatRupees(moneyFromPaise(-projectedSurplusPaise))}/month.`;
  } else if (coverageDaysDelta !== null && coverageDaysDelta < -7) {
    summary = `Under this scenario, essential runway contracts by ${Math.abs(coverageDaysDelta)} days.`;
  } else {
    summary = `Simulated adjustments maintain a projected monthly surplus of ${formatRupees(moneyFromPaise(projectedSurplusPaise))}.`;
  }

  return {
    incomeMetric,
    essentialExpenseMetric,
    monthlySurplusMetric,
    coverageDaysBaseline: baselineCoverageDays,
    coverageDaysProjected: projectedCoverageDays,
    coverageDaysDelta,
    overallImpactSummary: summary,
  };
}

/**
 * Serializes ProposedRepaymentEvaluation for API boundaries.
 */
export function serializeProposedRepaymentEvaluation(
  evaluation: ProposedRepaymentEvaluation
): SerializedProposedRepaymentEvaluation {
  return {
    proposedMonthlyRepayment: serializeMoney(evaluation.proposedMonthlyRepayment),
    pressureLevel: evaluation.pressureLevel,
    disposableIncomeBefore: serializeMoney(evaluation.disposableIncomeBefore),
    disposableIncomeAfter: serializeMoney(evaluation.disposableIncomeAfter),
    disposableIncomeDelta: serializeMoney(evaluation.disposableIncomeDelta),
    conservativeIncomeCoverageRatio: evaluation.conservativeIncomeCoverageRatio,
    essentialExpensesRatioAfter: evaluation.essentialExpensesRatioAfter,
    coverageDaysBefore: evaluation.coverageDaysBefore,
    coverageDaysAfter: evaluation.coverageDaysAfter,
    coverageDaysDelta: evaluation.coverageDaysDelta,
    guidanceSummary: evaluation.guidanceSummary,
    evidenceBasedExplanation: evaluation.evidenceBasedExplanation,
    saferAlternativeAdvice: evaluation.saferAlternativeAdvice,
  };
}

/**
 * Serializes WhatIfScenarioResult for API boundaries.
 */
export function serializeWhatIfScenarioResult(
  result: WhatIfScenarioResult
): SerializedWhatIfScenarioResult {
  return {
    incomeMetric: {
      ...result.incomeMetric,
      baseline: serializeMoney(result.incomeMetric.baseline),
      projected: serializeMoney(result.incomeMetric.projected),
      delta: serializeMoney(result.incomeMetric.delta),
    },
    essentialExpenseMetric: {
      ...result.essentialExpenseMetric,
      baseline: serializeMoney(result.essentialExpenseMetric.baseline),
      projected: serializeMoney(result.essentialExpenseMetric.projected),
      delta: serializeMoney(result.essentialExpenseMetric.delta),
    },
    monthlySurplusMetric: {
      ...result.monthlySurplusMetric,
      baseline: serializeMoney(result.monthlySurplusMetric.baseline),
      projected: serializeMoney(result.monthlySurplusMetric.projected),
      delta: serializeMoney(result.monthlySurplusMetric.delta),
    },
    coverageDaysBaseline: result.coverageDaysBaseline,
    coverageDaysProjected: result.coverageDaysProjected,
    coverageDaysDelta: result.coverageDaysDelta,
    overallImpactSummary: result.overallImpactSummary,
  };
}
