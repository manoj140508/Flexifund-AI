/**
 * Money-Saving Opportunity Engine & Savings Capacity Module
 * 
 * CORE FEATURE:
 * Detects empirical cost-reduction and surplus capture opportunities from actual spending.
 * 
 * Guarantees:
 * - Deterministic, evidence-backed findings.
 * - Conservative estimates (never "You will save ₹X", always "Potential saving").
 * - Dynamic savings range adapted to income conditions rather than static "20%" rules.
 */

import { Money, moneyFromPaise, formatRupees, SerializedMoney, serializeMoney, ZERO_MONEY } from './money';
import { IncomeAnalysis } from './income';
import { ExpenseAnalysis } from './expenses';

export type OpportunityCategory =
  | 'RECURRING_DISCRETIONARY_PAYMENT'
  | 'AVOIDABLE_FEES_CHARGES'
  | 'INCREASING_DISCRETIONARY_SPEND'
  | 'HIGH_DISCRETIONARY_OUTFLOW'
  | 'SURPLUS_CAPTURE_PEAK_PERIOD';

export interface SavingsEvidence {
  metricName: string;
  observedValue: string;
  sourceTransactionIds: string[];
  sourceRowNumbers?: number[];
  calculationBasis: string;
  explanation: string;
}

export interface SavingsOpportunity {
  id: string;
  category: OpportunityCategory;
  title: string;
  description: string;
  potentialMonthlySaving?: Money;
  potentialAnnualSaving?: Money;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: SavingsEvidence;
  recommendedAction: string;
}

export interface SerializedSavingsOpportunity {
  id: string;
  category: OpportunityCategory;
  title: string;
  description: string;
  potentialMonthlySaving?: SerializedMoney;
  potentialAnnualSaving?: SerializedMoney;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: SavingsEvidence;
  recommendedAction: string;
}

export interface SavingsCapacityResult {
  status: 'ESTIMATED_RANGE' | 'INSUFFICIENT_DATA';
  minimumMonthlySavings: Money;
  maximumMonthlySavings: Money;
  conservativeMonthlyReference: Money;
  explanation: string;
  disclaimer: string;
}

export interface SerializedSavingsCapacityResult {
  status: 'ESTIMATED_RANGE' | 'INSUFFICIENT_DATA';
  minimumMonthlySavings: SerializedMoney;
  maximumMonthlySavings: SerializedMoney;
  conservativeMonthlyReference: SerializedMoney;
  explanation: string;
  disclaimer: string;
}

export interface OpportunityEngineInput {
  incomeAnalysis: IncomeAnalysis;
  expenseAnalysis: ExpenseAnalysis;
}

/**
 * Detects evidence-based cost reduction and financial buffer opportunities.
 */
export function detectSavingsOpportunities(input: OpportunityEngineInput): SavingsOpportunity[] {
  const { incomeAnalysis, expenseAnalysis } = input;
  const opportunities: SavingsOpportunity[] = [];

  // A. Recurring Discretionary Payments
  const discretionaryRecurring = expenseAnalysis.recurringPayments.filter(
    (r) => r.category === 'DISCRETIONARY'
  );

  for (const cluster of discretionaryRecurring) {
    const monthlyEquivalentPaise =
      cluster.frequencyType === 'WEEKLY'
        ? cluster.typicalAmount.paise * 4n
        : cluster.frequencyType === 'FORTNIGHTLY'
        ? cluster.typicalAmount.paise * 2n
        : cluster.frequencyType === 'QUARTERLY'
        ? cluster.typicalAmount.paise / 3n
        : cluster.typicalAmount.paise;

    const annualEquivalentPaise = monthlyEquivalentPaise * 12n;

    opportunities.push({
      id: `opp_rec_disc_${cluster.clusterId}`,
      category: 'RECURRING_DISCRETIONARY_PAYMENT',
      title: `Review Recurring Payment: ${cluster.normalizedMerchant}`,
      description: `Recurring payments detected for ${cluster.normalizedMerchant} occurring approximately every ${cluster.averageIntervalDays} days.`,
      potentialMonthlySaving: moneyFromPaise(monthlyEquivalentPaise),
      potentialAnnualSaving: moneyFromPaise(annualEquivalentPaise),
      confidence: cluster.confidence,
      evidence: {
        metricName: 'Recurring Discretionary Spend',
        observedValue: `${formatRupees(cluster.typicalAmount)} (${cluster.occurrencesCount} occurrences)`,
        sourceTransactionIds: cluster.transactionIds,
        calculationBasis: `${formatRupees(moneyFromPaise(monthlyEquivalentPaise))}/mo equivalent across ${cluster.occurrencesCount} observed billing cycles`,
        explanation: 'Based on the transactions provided, reviewing optional or under-utilized recurring services can free up valuable cash margin.',
      },
      recommendedAction: `Consider reviewing whether the ${cluster.normalizedMerchant} service is actively needed or if a lower-tier plan is available.`,
    });
  }

  // B. Repeated Bank / Platform Fees
  const feesCat = expenseAnalysis.categoryBreakdown.FEES_CHARGES;
  if (feesCat && feesCat.transactionCount >= 2 && feesCat.total.paise > 0n) {
    const avgMonthlyFeesPaise = feesCat.total.paise / BigInt(Math.max(1, expenseAnalysis.sampleMonthsCount));
    const annualFeesPaise = avgMonthlyFeesPaise * 12n;

    opportunities.push({
      id: 'opp_avoidable_bank_fees',
      category: 'AVOIDABLE_FEES_CHARGES',
      title: 'Potential Avoidable Account & Service Fees',
      description: `Multiple fee transactions were identified (${feesCat.transactionCount} charges totaling ${formatRupees(feesCat.total)}).`,
      potentialMonthlySaving: moneyFromPaise(avgMonthlyFeesPaise),
      potentialAnnualSaving: moneyFromPaise(annualFeesPaise),
      confidence: 'MEDIUM',
      evidence: {
        metricName: 'Repeated Fees & Charges',
        observedValue: `${formatRupees(feesCat.total)} across ${feesCat.transactionCount} transactions`,
        sourceTransactionIds: feesCat.transactionIds,
        calculationBasis: `Average fee impact: ${formatRupees(moneyFromPaise(avgMonthlyFeesPaise))}/month`,
        explanation: 'Fees for non-maintenance, cheque/mandate return, or ATM limits can be minimized with automated account alerts.',
      },
      recommendedAction: 'Verify minimum balance requirements or consider switching to a zero-balance unorganised worker savings account (e.g., PMJDY or Basic Savings Bank Deposit).',
    });
  }

  // C. Increasing Discretionary Spending Trend
  const discTrend = expenseAnalysis.categoryTrends.find((t) => t.category === 'DISCRETIONARY');
  if (discTrend && discTrend.direction === 'INCREASING' && discTrend.changePercentage >= 20) {
    const potentialMonthlyTaperPaise = (expenseAnalysis.discretionaryMonthlyBurn.paise * 15n) / 100n;
    opportunities.push({
      id: 'opp_increasing_discretionary',
      category: 'INCREASING_DISCRETIONARY_SPEND',
      title: 'Moderate Upward Trend in Discretionary Spend',
      description: `Discretionary spending grew by approximately ${discTrend.changePercentage}% between earlier and later statement periods.`,
      potentialMonthlySaving: moneyFromPaise(potentialMonthlyTaperPaise),
      confidence: 'MEDIUM',
      evidence: {
        metricName: 'Discretionary Growth Rate',
        observedValue: `+${discTrend.changePercentage}% increase`,
        sourceTransactionIds: expenseAnalysis.categoryBreakdown.DISCRETIONARY.transactionIds.slice(0, 10),
        calculationBasis: `Targeting a 15% reduction in non-essential spending could reclaim ~${formatRupees(moneyFromPaise(potentialMonthlyTaperPaise))}/month`,
        explanation: 'When income is variable, rising discretionary spending during quieter earning weeks compresses emergency coverage.',
      },
      recommendedAction: 'Consider setting a weekly non-essential spending cap during quieter earning cycles.',
    });
  }

  // D. High Discretionary Outflow (> 30% of total expenses)
  const totalExp = expenseAnalysis.totalExpenses.paise;
  const discExp = expenseAnalysis.discretionaryMonthlyBurn.paise;
  if (totalExp > 0n && expenseAnalysis.sampleMonthsCount >= 2) {
    const discRatio = Number((discExp * 100n) / expenseAnalysis.monthlyAverageExpenses.paise);
    if (discRatio >= 35) {
      const potentialRecapturePaise = (discExp * 20n) / 100n;
      opportunities.push({
        id: 'opp_high_discretionary_share',
        category: 'HIGH_DISCRETIONARY_OUTFLOW',
        title: 'High Non-Essential Spending Margin Available',
        description: `Discretionary expenses account for approximately ${discRatio}% of your total monthly spending.`,
        potentialMonthlySaving: moneyFromPaise(potentialRecapturePaise),
        confidence: 'HIGH',
        evidence: {
          metricName: 'Discretionary Expense Share',
          observedValue: `${discRatio}% of monthly spend (${formatRupees(expenseAnalysis.discretionaryMonthlyBurn)}/mo)`,
          sourceTransactionIds: expenseAnalysis.categoryBreakdown.DISCRETIONARY.transactionIds.slice(0, 8),
          calculationBasis: `Reallocating 20% of discretionary spending creates ~${formatRupees(moneyFromPaise(potentialRecapturePaise))}/month in savings capacity`,
          explanation: 'A high discretionary ratio indicates strong flexibility to build cash reserves without impacting living essentials.',
        },
        recommendedAction: 'Redirect a portion of discretionary purchases directly into a liquid emergency reserve.',
      });
    }
  }

  // E. Surplus Capture During Peak Earning Periods
  if (
    incomeAnalysis.highestMonth &&
    incomeAnalysis.lowestMonth &&
    incomeAnalysis.sampleMonthsCount >= 2
  ) {
    const peakDeltaPaise = incomeAnalysis.highestMonth.amount.paise - incomeAnalysis.monthlyAverage.paise;
    if (peakDeltaPaise > 0n) {
      const suggestedBufferAllocationPaise = (peakDeltaPaise * 40n) / 100n; // Allocate 40% of peak windfall
      opportunities.push({
        id: 'opp_surplus_capture_peak',
        category: 'SURPLUS_CAPTURE_PEAK_PERIOD',
        title: 'Capture Windfall Surplus in Strong Earning Months',
        description: `In your highest month (${incomeAnalysis.highestMonth.period}), income reached ${formatRupees(incomeAnalysis.highestMonth.amount)}, exceeding your average by ${formatRupees(moneyFromPaise(peakDeltaPaise))}.`,
        potentialMonthlySaving: moneyFromPaise(suggestedBufferAllocationPaise),
        confidence: 'HIGH',
        evidence: {
          metricName: 'Peak Income Delta',
          observedValue: `${formatRupees(incomeAnalysis.highestMonth.amount)} vs ${formatRupees(incomeAnalysis.lowestMonth.amount)} in lowest period`,
          sourceTransactionIds: incomeAnalysis.monthlyBreakdown.find((m) => m.periodKey === incomeAnalysis.highestMonth?.period)?.transactionIds ?? [],
          calculationBasis: `Allocating 40% of peak surplus (${formatRupees(moneyFromPaise(suggestedBufferAllocationPaise))}) prevents lifestyle creep during peak gig weeks`,
          explanation: 'Gig workers benefit most from asymmetric savings: save aggressively during festival/surge weeks to fund lean seasons.',
        },
        recommendedAction: 'Automatically park 40% of earnings above your monthly average into an emergency buffer account.',
      });
    }
  }

  return opportunities;
}

/**
 * Deterministically calculates a personalized savings capacity range.
 * Adapts to conservative baseline, essential burn, and income variability.
 */
export function calculateSavingsCapacity(
  income: IncomeAnalysis,
  expenses: ExpenseAnalysis
): SavingsCapacityResult {
  if (income.sampleMonthsCount === 0 || expenses.sampleMonthsCount === 0) {
    return {
      status: 'INSUFFICIENT_DATA',
      minimumMonthlySavings: ZERO_MONEY,
      maximumMonthlySavings: ZERO_MONEY,
      conservativeMonthlyReference: ZERO_MONEY,
      explanation: 'Insufficient transaction data to determine savings capacity.',
      disclaimer: 'This is an estimate based on the financial data provided.',
    };
  }

  const conservativeIncomePaise = income.conservativeBaselineMonthly.paise;
  const essentialBurnPaise = expenses.essentialMonthlyBurn.paise;
  const debtRepaymentPaise = expenses.debtRepaymentsMonthly.paise;
  const averageIncomePaise = income.monthlyAverage.paise;

  // Floor capacity under conservative baseline
  const conservativeSurplusPaise = conservativeIncomePaise - (essentialBurnPaise + debtRepaymentPaise);
  // Average capacity under normal month
  const averageSurplusPaise = averageIncomePaise - (essentialBurnPaise + debtRepaymentPaise);

  let minMonthlyPaise = 0n;
  let maxMonthlyPaise = 0n;

  if (conservativeSurplusPaise <= 0n) {
    // Under low-earning months, essential expenses absorb income; savings should not be forced!
    minMonthlyPaise = 0n;
    if (averageSurplusPaise > 0n) {
      maxMonthlyPaise = (averageSurplusPaise * 30n) / 100n; // Save moderately during normal months
    }
  } else {
    // Both conservative and average show surplus
    minMonthlyPaise = (conservativeSurplusPaise * 25n) / 100n;
    maxMonthlyPaise = (averageSurplusPaise * 40n) / 100n;
  }

  if (maxMonthlyPaise < minMonthlyPaise) {
    maxMonthlyPaise = minMonthlyPaise;
  }

  return {
    status: 'ESTIMATED_RANGE',
    minimumMonthlySavings: moneyFromPaise(minMonthlyPaise),
    maximumMonthlySavings: moneyFromPaise(maxMonthlyPaise),
    conservativeMonthlyReference: moneyFromPaise(conservativeSurplusPaise > 0n ? (conservativeSurplusPaise * 25n) / 100n : 0n),
    explanation:
      conservativeSurplusPaise <= 0n
        ? `During lean income months (near ${formatRupees(income.conservativeBaselineMonthly)}), essential living expenses (${formatRupees(expenses.essentialMonthlyBurn)}) absorb cash flow. Avoid fixed daily savings that create stress; save selectively when monthly earnings exceed average.`
        : `Based on your conservative planning baseline of ${formatRupees(income.conservativeBaselineMonthly)}, you have a comfortable essential expense margin. A flexible monthly contribution between ${formatRupees(moneyFromPaise(minMonthlyPaise))} and ${formatRupees(moneyFromPaise(maxMonthlyPaise))} strengthens your cash buffer.`,
    disclaimer: 'This is an estimate based on the financial data provided.',
  };
}

/**
 * Serializes SavingsOpportunity list for JSON API responses.
 */
export function serializeSavingsOpportunities(opps: SavingsOpportunity[]): SerializedSavingsOpportunity[] {
  return opps.map((opp) => ({
    ...opp,
    potentialMonthlySaving: opp.potentialMonthlySaving ? serializeMoney(opp.potentialMonthlySaving) : undefined,
    potentialAnnualSaving: opp.potentialAnnualSaving ? serializeMoney(opp.potentialAnnualSaving) : undefined,
  }));
}

/**
 * Serializes SavingsCapacityResult for JSON API responses.
 */
export function serializeSavingsCapacity(res: SavingsCapacityResult): SerializedSavingsCapacityResult {
  return {
    status: res.status,
    minimumMonthlySavings: serializeMoney(res.minimumMonthlySavings),
    maximumMonthlySavings: serializeMoney(res.maximumMonthlySavings),
    conservativeMonthlyReference: serializeMoney(res.conservativeMonthlyReference),
    explanation: res.explanation,
    disclaimer: res.disclaimer,
  };
}
