/**
 * Financial Stress Indicators Domain Module
 * 
 * Evidence-based early warning signal detection.
 * 
 * Non-negotiable product safety:
 * - Do NOT diagnose the user.
 * - Use objective wording: "Potential financial pressure detected" rather than "You are distressed".
 * - Every single indicator must be strictly supported by empirical transaction evidence.
 */

import { formatRupees } from './money';
import { IncomeAnalysis } from './income';
import { ExpenseAnalysis } from './expenses';
import { ResilienceAnalysis } from './resilience';

export type StressSeverity = 'INFO' | 'MODERATE_CAUTION' | 'ELEVATED_CAUTION';

export interface StressEvidence {
  metricName: string;
  observedValue: string;
  benchmarkThreshold: string;
  sourceTransactionIds?: string[];
  explanation: string;
}

export interface FinancialStressIndicator {
  id: string;
  severity: StressSeverity;
  title: string;
  description: string;
  evidence: StressEvidence;
  recommendedAction: string;
}

export interface SerializedStressIndicator {
  id: string;
  severity: StressSeverity;
  title: string;
  description: string;
  evidence: StressEvidence;
  recommendedAction: string;
}

export interface StressDetectionInput {
  incomeAnalysis: IncomeAnalysis;
  expenseAnalysis: ExpenseAnalysis;
  resilienceAnalysis: ResilienceAnalysis;
}

/**
 * Deterministically evaluates evidence-based financial pressure indicators.
 */
export function detectFinancialStress(input: StressDetectionInput): FinancialStressIndicator[] {
  const { incomeAnalysis, expenseAnalysis, resilienceAnalysis } = input;
  const indicators: FinancialStressIndicator[] = [];

  // 1. Extreme or High Income Volatility
  if (incomeAnalysis.coefficientOfVariation !== null && incomeAnalysis.coefficientOfVariation >= 0.35) {
    const isExtreme = incomeAnalysis.coefficientOfVariation >= 0.6;
    indicators.push({
      id: 'stress_high_income_volatility',
      severity: isExtreme ? 'ELEVATED_CAUTION' : 'MODERATE_CAUTION',
      title: isExtreme ? 'Extreme Income Fluctuations Observed' : 'High Income Variability Observed',
      description: 'Monthly earnings exhibit wide swings between peak earnings and quiet earning periods.',
      evidence: {
        metricName: 'Coefficient of Variation',
        observedValue: `${(incomeAnalysis.coefficientOfVariation * 100).toFixed(1)}%`,
        benchmarkThreshold: isExtreme ? '≥ 60.0% (Extreme volatility)' : '≥ 35.0% (High volatility)',
        explanation: `Highest observed month was ${incomeAnalysis.highestMonth?.period} (${formatRupees(incomeAnalysis.highestMonth?.amount ?? incomeAnalysis.monthlyAverage)}) vs lowest month ${incomeAnalysis.lowestMonth?.period} (${formatRupees(incomeAnalysis.lowestMonth?.amount ?? incomeAnalysis.monthlyAverage)}).`,
      },
      recommendedAction: 'Anchor recurring commitments to your conservative baseline rather than average or peak income.',
    });
  }

  // 2. Contracting Income Trend
  if (incomeAnalysis.trend === 'CONTRACTING') {
    indicators.push({
      id: 'stress_contracting_income',
      severity: 'MODERATE_CAUTION',
      title: 'Potential Downward Income Trend',
      description: 'Your monthly earnings trend indicates a contraction over the recorded statement period.',
      evidence: {
        metricName: 'Income Trend Slope',
        observedValue: 'Negative directional slope across recorded months',
        benchmarkThreshold: 'Month-over-month contraction > 5%',
        explanation: 'Average earnings in later months are noticeably lower than earlier periods in the provided statement.',
      },
      recommendedAction: 'Review optional discretionary spending and preserve liquid buffer until income stabilizes.',
    });
  }

  // 3. Essential Expenses Approaching Conservative Baseline
  const conservativeIncome = incomeAnalysis.conservativeBaselineMonthly.paise;
  const essentialBurn = expenseAnalysis.essentialMonthlyBurn.paise;
  if (conservativeIncome > 0n && essentialBurn > 0n) {
    const essentialToConservativeRatio = Number((essentialBurn * 100n) / conservativeIncome);
    if (essentialToConservativeRatio >= 85) {
      indicators.push({
        id: 'stress_essential_burn_margin',
        severity: essentialToConservativeRatio >= 100 ? 'ELEVATED_CAUTION' : 'MODERATE_CAUTION',
        title: 'Essential Living Costs Near Conservative Income Floor',
        description: 'Fixed essential living expenses absorb nearly all (or more than) earnings during quiet months.',
        evidence: {
          metricName: 'Essential Burn vs Conservative Baseline',
          observedValue: `${essentialToConservativeRatio}% of conservative income`,
          benchmarkThreshold: '≥ 85% of conservative baseline',
          explanation: `Essential monthly burn is ${formatRupees(expenseAnalysis.essentialMonthlyBurn)} while conservative planning income is ${formatRupees(incomeAnalysis.conservativeBaselineMonthly)}.`,
        },
        recommendedAction: 'Prioritize building emergency reserves during higher-income months to insulate against quiet weeks.',
      });
    }
  }

  // 4. Short Emergency Buffer Runway (< 14 Days)
  if (resilienceAnalysis.bufferCoverageDays !== null && resilienceAnalysis.bufferCoverageDays < 14) {
    indicators.push({
      id: 'stress_limited_buffer_coverage',
      severity: resilienceAnalysis.bufferCoverageDays < 7 ? 'ELEVATED_CAUTION' : 'MODERATE_CAUTION',
      title: 'Short Essential-Expense Runway',
      description: 'Available cash balance provides less than 14 days of essential daily burn coverage.',
      evidence: {
        metricName: 'Buffer Coverage Days',
        observedValue: `${resilienceAnalysis.bufferCoverageDays} days`,
        benchmarkThreshold: '< 14 days minimum buffer threshold',
        explanation: `Essential daily burn is ${formatRupees(expenseAnalysis.dailyEssentialBurnRate)}/day.`,
      },
      recommendedAction: 'Focus on reaching an initial 14-day emergency buffer as primary financial milestone.',
    });
  }

  // 5. Heavy Debt / Commitment Burden
  const debtMonthly = expenseAnalysis.debtRepaymentsMonthly.paise;
  if (conservativeIncome > 0n && debtMonthly > 0n) {
    const debtRatio = Number((debtMonthly * 100n) / conservativeIncome);
    if (debtRatio >= 30) {
      indicators.push({
        id: 'stress_high_debt_burden',
        severity: debtRatio >= 45 ? 'ELEVATED_CAUTION' : 'MODERATE_CAUTION',
        title: 'High Fixed Debt Repayment Burden',
        description: 'Fixed debt repayments consume a substantial share of your conservative baseline earnings.',
        evidence: {
          metricName: 'Debt-to-Conservative-Income Ratio',
          observedValue: `${debtRatio}%`,
          benchmarkThreshold: '≥ 30% of conservative baseline income',
          sourceTransactionIds: expenseAnalysis.categoryBreakdown.DEBT_REPAYMENT.transactionIds,
          explanation: `Monthly debt payments (${formatRupees(expenseAnalysis.debtRepaymentsMonthly)}) consume ${debtRatio}% of conservative monthly income (${formatRupees(incomeAnalysis.conservativeBaselineMonthly)}).`,
        },
        recommendedAction: 'Avoid taking on any new recurring fixed debt obligations.',
      });
    }
  }

  // 6. Repeated Account Fees or Penalties
  const feesCategory = expenseAnalysis.categoryBreakdown.FEES_CHARGES;
  if (feesCategory && feesCategory.transactionCount >= 2 && feesCategory.total.paise > 0n) {
    indicators.push({
      id: 'stress_repeated_bank_fees',
      severity: 'INFO',
      title: 'Repeated Account Fees or Penalty Charges',
      description: 'Multiple charges classified as bank or platform service fees were identified.',
      evidence: {
        metricName: 'Fee Occurrence Count',
        observedValue: `${feesCategory.transactionCount} transactions totaling ${formatRupees(feesCategory.total)}`,
        benchmarkThreshold: '≥ 2 fee transactions in statement period',
        sourceTransactionIds: feesCategory.transactionIds,
        explanation: 'Penalties, late charges, or non-maintenance fees compound cash pressure.',
      },
      recommendedAction: 'Verify whether minimum balance or late payment alerts can be enabled with your financial institution.',
    });
  }

  // 7. Increasing Discretionary Spending While Income Declines
  const discTrend = expenseAnalysis.categoryTrends.find((t) => t.category === 'DISCRETIONARY');
  if (incomeAnalysis.trend === 'CONTRACTING' && discTrend && discTrend.direction === 'INCREASING') {
    indicators.push({
      id: 'stress_divergent_discretionary_spend',
      severity: 'MODERATE_CAUTION',
      title: 'Rising Non-Essential Spend During Income Contraction',
      description: 'Discretionary spending is trending upward while overall monthly earnings are contracting.',
      evidence: {
        metricName: 'Divergent Cash Flow Trend',
        observedValue: `Income contracting while discretionary spending increased by ${discTrend.changePercentage}%`,
        benchmarkThreshold: 'Opposing trends in income vs discretionary expenditure',
        explanation: 'When income drops, discretionary spending should ideally be moderated to avoid drawing down savings.',
      },
      recommendedAction: 'Review recent dining, shopping, and entertainment transactions to restore cash balance.',
    });
  }

  return indicators;
}

/**
 * Serializes stress indicators for JSON boundaries.
 */
export function serializeStressIndicators(indicators: FinancialStressIndicator[]): SerializedStressIndicator[] {
  return indicators.map((ind) => ({
    ...ind,
  }));
}
