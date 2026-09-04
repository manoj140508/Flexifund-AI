/**
 * Financial Stress Indicators Domain Module
 * 
 * Evidence-based early warning signal detection.
 * 
 * Non-negotiable product safety:
 * - Do NOT diagnose the user.
 * - Use objective wording: "Potential financial pressure detected" rather than "You are distressed".
 * - Every single indicator must be strictly supported by empirical transaction evidence.
 * - Severities must be purely deterministic (HIGH / MODERATE / LOW).
 */

import { formatRupees } from './money';
import { IncomeAnalysis } from './income';
import { ExpenseAnalysis } from './expenses';
import { ResilienceAnalysis } from './resilience';

export type StressSeverity = 'HIGH' | 'MODERATE' | 'LOW' | 'ELEVATED_CAUTION' | 'MODERATE_CAUTION' | 'INFO';

export function normalizeStressSeverity(severity: StressSeverity): 'HIGH' | 'MODERATE' | 'LOW' {
  if (severity === 'HIGH' || severity === 'ELEVATED_CAUTION') return 'HIGH';
  if (severity === 'MODERATE' || severity === 'MODERATE_CAUTION') return 'MODERATE';
  return 'LOW';
}

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

  const conservativeIncome = incomeAnalysis.conservativeBaselineMonthly.paise;
  const averageIncome = incomeAnalysis.monthlyAverage.paise;
  const essentialBurn = expenseAnalysis.essentialMonthlyBurn.paise;
  const totalIncome = incomeAnalysis.totalIncome.paise;
  const totalExpenses = expenseAnalysis.totalExpenses.paise;

  // A. Income Decline / Weakening Trend
  if (incomeAnalysis.trend === 'CONTRACTING') {
    indicators.push({
      id: 'stress_contracting_income',
      severity: 'MODERATE_CAUTION',
      title: 'Income trend weakening',
      description: 'Your monthly earnings trend indicates a contraction over the recorded statement period.',
      evidence: {
        metricName: 'Income Trend Slope',
        observedValue: 'Negative directional slope across recorded months',
        benchmarkThreshold: 'Month-over-month contraction > 5%',
        explanation: 'Average earnings in later periods are noticeably lower than earlier periods in the provided statement.',
      },
      recommendedAction: 'Review optional discretionary spending and preserve liquid buffer until income stabilizes.',
    });
  } else if (
    incomeAnalysis.sampleMonthsCount >= 2 &&
    incomeAnalysis.lowestMonth &&
    averageIncome > 0n
  ) {
    const lowestPaise = incomeAnalysis.lowestMonth.amount.paise;
    const dipPercentage = Number(((averageIncome - lowestPaise) * 100n) / averageIncome);
    if (dipPercentage >= 25) {
      indicators.push({
        id: 'stress_recent_income_slump',
        severity: 'MODERATE_CAUTION',
        title: 'Income trend weakening',
        description: 'Observed earnings dropped significantly below your average in your lowest recorded month.',
        evidence: {
          metricName: 'Lowest Month vs Average',
          observedValue: `${dipPercentage}% below average in ${incomeAnalysis.lowestMonth.period}`,
          benchmarkThreshold: '≥ 25% drop from monthly average',
          explanation: `Lowest recorded month was ${formatRupees(incomeAnalysis.lowestMonth.amount)} compared to your monthly average of ${formatRupees(incomeAnalysis.monthlyAverage)}.`,
        },
        recommendedAction: 'Anchor your living expenses and fixed obligations to your conservative income floor.',
      });
    }
  }

  // B. High Income Volatility
  const cv = incomeAnalysis.coefficientOfVariation;
  const isHighVolatility =
    (cv !== null && cv >= 0.30) ||
    incomeAnalysis.volatilityRating === 'HIGH' ||
    incomeAnalysis.volatilityRating === 'EXTREME';

  if (isHighVolatility && cv !== null) {
    const isExtreme = cv >= 0.55 || incomeAnalysis.volatilityRating === 'EXTREME';
    indicators.push({
      id: 'stress_high_income_volatility',
      severity: isExtreme ? 'ELEVATED_CAUTION' : 'MODERATE_CAUTION',
      title: 'Income is highly variable',
      description: 'Income fluctuates significantly across observed periods, making fixed recurring commitments riskier.',
      evidence: {
        metricName: 'Coefficient of Variation (CV)',
        observedValue: `${(cv * 100).toFixed(1)}% volatility`,
        benchmarkThreshold: isExtreme ? '≥ 55.0% (Extreme volatility)' : '≥ 30.0% (High volatility)',
        explanation: incomeAnalysis.highestMonth && incomeAnalysis.lowestMonth
          ? `Highest observed month was ${incomeAnalysis.highestMonth.period} (${formatRupees(incomeAnalysis.highestMonth.amount)}) vs lowest month ${incomeAnalysis.lowestMonth.period} (${formatRupees(incomeAnalysis.lowestMonth.amount)}).`
          : 'Weekly earnings swing between peak and quiet earning periods.',
      },
      recommendedAction: 'Use a flexible savings target rather than a fixed monthly contribution, and base commitments on your floor income.',
    });
  } else if (incomeAnalysis.sampleMonthsCount <= 1 && incomeAnalysis.weeklyBreakdown.length >= 3) {
    // Check intra-month weekly swings if single month
    const weeklyAmounts = incomeAnalysis.weeklyBreakdown.map((w) => Number(w.totalPaise));
    const meanWeekly = weeklyAmounts.reduce((a, b) => a + b, 0) / weeklyAmounts.length;
    if (meanWeekly > 0) {
      const variance = weeklyAmounts.reduce((a, b) => a + Math.pow(b - meanWeekly, 2), 0) / (weeklyAmounts.length - 1);
      const weeklyCv = Math.sqrt(variance) / meanWeekly;
      if (weeklyCv >= 0.35) {
        indicators.push({
          id: 'stress_weekly_income_volatility',
          severity: 'MODERATE_CAUTION',
          title: 'Income is highly variable',
          description: 'Earnings fluctuate sharply from week to week within the observed statement period.',
          evidence: {
            metricName: 'Intra-Month Weekly Volatility',
            observedValue: `${(weeklyCv * 100).toFixed(1)}% weekly variability`,
            benchmarkThreshold: '≥ 35.0% weekly CV',
            explanation: 'Weekly income exhibits substantial variance, requiring liquid cash reserves between payouts.',
          },
          recommendedAction: 'Set aside a portion of high-earning weeks into a buffer to smooth out quiet weeks.',
        });
      }
    }
  }

  // C. Essential Expense Pressure
  if (conservativeIncome > 0n && essentialBurn > 0n) {
    const essentialToConservativeRatio = Number((essentialBurn * 100n) / conservativeIncome);
    if (essentialToConservativeRatio >= 75) {
      indicators.push({
        id: 'stress_essential_burn_margin',
        severity: essentialToConservativeRatio >= 90 ? 'ELEVATED_CAUTION' : 'MODERATE_CAUTION',
        title: 'Essential expenses are consuming a large share of income',
        description: 'Fixed essential living expenses (housing, groceries, utilities, work transit) absorb nearly all earnings during conservative periods.',
        evidence: {
          metricName: 'Essential Burn vs Conservative Baseline',
          observedValue: `${essentialToConservativeRatio}% of conservative income`,
          benchmarkThreshold: '≥ 75% of conservative baseline',
          explanation: `Essential monthly burn is ${formatRupees(expenseAnalysis.essentialMonthlyBurn)} while conservative planning income is ${formatRupees(incomeAnalysis.conservativeBaselineMonthly)}.`,
        },
        recommendedAction: 'Prioritize building emergency reserves during higher-income weeks to insulate against quiet periods.',
      });
    }
  }

  // D. Limited / Negative Monthly Surplus
  if (totalIncome > 0n && totalExpenses > 0n) {
    const netSurplusPaise = totalIncome - totalExpenses;
    const surplusRatio = Number((netSurplusPaise * 100n) / totalIncome);

    if (netSurplusPaise <= 0n) {
      indicators.push({
        id: 'stress_net_cash_deficit',
        severity: 'ELEVATED_CAUTION',
        title: 'Limited monthly surplus',
        description: 'Total expenses exceeded total income over the recorded statement period, creating a net cash drain.',
        evidence: {
          metricName: 'Historical Net Cash Surplus',
          observedValue: `${surplusRatio.toFixed(1)}% (Deficit of ${formatRupees(expenseAnalysis.totalExpenses)})`,
          benchmarkThreshold: '< 0% (Cash outflow exceeds inflow)',
          explanation: `Recorded outflow (${formatRupees(expenseAnalysis.totalExpenses)}) exceeded recorded inflow (${formatRupees(incomeAnalysis.totalIncome)}).`,
        },
        recommendedAction: 'Review discretionary spending and examine the Personalized Saving Plan to identify potential savings.',
      });
    } else if (surplusRatio < 12) {
      indicators.push({
        id: 'stress_thin_surplus_margin',
        severity: 'MODERATE_CAUTION',
        title: 'Limited monthly surplus',
        description: 'Remaining cash surplus after expenses is very tight, leaving minimal margin for unexpected expenses.',
        evidence: {
          metricName: 'Net Cash Surplus Ratio',
          observedValue: `${surplusRatio.toFixed(1)}% of total income`,
          benchmarkThreshold: '< 12% surplus margin',
          explanation: `Net surplus was ${formatRupees(resilienceAnalysis.estimatedHistoricalNetSurplus)} from ${formatRupees(incomeAnalysis.totalIncome)} in total earnings.`,
        },
        recommendedAction: 'Focus on small expense adjustments in discretionary categories to widen your monthly cushion.',
      });
    }
  }

  // E. Repayment Pressure (Debt / EMI Burden)
  const debtMonthly = expenseAnalysis.debtRepaymentsMonthly.paise;
  if (conservativeIncome > 0n && debtMonthly > 0n) {
    const debtRatio = Number((debtMonthly * 100n) / conservativeIncome);
    if (debtRatio >= 20) {
      indicators.push({
        id: 'stress_high_debt_burden',
        severity: debtRatio >= 35 ? 'ELEVATED_CAUTION' : 'MODERATE_CAUTION',
        title: 'Repayment pressure',
        description: 'Fixed debt repayments consume a substantial share of your conservative baseline earnings.',
        evidence: {
          metricName: 'Debt-to-Conservative-Income Ratio',
          observedValue: `${debtRatio}%`,
          benchmarkThreshold: '≥ 20% of conservative baseline income',
          sourceTransactionIds: expenseAnalysis.categoryBreakdown.DEBT_REPAYMENT?.transactionIds,
          explanation: `Monthly debt payments (${formatRupees(expenseAnalysis.debtRepaymentsMonthly)}) consume ${debtRatio}% of conservative monthly income (${formatRupees(incomeAnalysis.conservativeBaselineMonthly)}).`,
        },
        recommendedAction: 'Avoid taking on any new recurring fixed debt obligations until cash buffer improves.',
      });
    }
  }

  // F. Limited Emergency Coverage / Short Buffer Runway
  if (resilienceAnalysis.bufferCoverageDays !== null && resilienceAnalysis.bufferCoverageDays < 30) {
    const days = resilienceAnalysis.bufferCoverageDays;
    indicators.push({
      id: 'stress_limited_buffer_coverage',
      severity: days < 7 ? 'ELEVATED_CAUTION' : days < 14 ? 'MODERATE_CAUTION' : 'INFO',
      title: 'Limited emergency coverage',
      description: days < 14
        ? 'Available cash balance provides less than 14 days of essential daily living expenses.'
        : 'Available cash balance provides less than 30 days of essential living coverage.',
      evidence: {
        metricName: 'Buffer Coverage Days',
        observedValue: `${days} days of coverage`,
        benchmarkThreshold: '< 30 days recommended baseline buffer',
        explanation: `Essential daily burn is ${formatRupees(expenseAnalysis.dailyEssentialBurnRate)}/day. Current cash provides ${days} days of runway.`,
      },
      recommendedAction: days < 14
        ? 'Focus on reaching an initial 14-day emergency buffer milestone as your primary financial objective.'
        : 'Build towards a 30-day emergency cushion by banking surplus from peak weeks.',
    });
  }

  // G. Spending Pressure Increasing
  const discTrend = expenseAnalysis.categoryTrends.find((t) => t.category === 'DISCRETIONARY');
  const fuelTrend = expenseAnalysis.categoryTrends.find((t) => t.category === 'WORK_FUEL_TRANSIT');

  if (discTrend && discTrend.direction === 'INCREASING' && discTrend.changePercentage >= 15) {
    indicators.push({
      id: 'stress_spending_pressure_discretionary',
      severity: 'MODERATE_CAUTION',
      title: 'Spending pressure increasing',
      description: 'Discretionary spending is trending upward across the observed statement period.',
      evidence: {
        metricName: 'Discretionary Expense Trend',
        observedValue: `+${discTrend.changePercentage}% increase across periods`,
        benchmarkThreshold: '≥ 15% increase in non-essential outlays',
        explanation: `Discretionary category expenditures rose by ${discTrend.changePercentage}% compared to earlier periods.`,
      },
      recommendedAction: 'Review non-essential expenditures and moderate frequent dining or entertainment to preserve cash.',
    });
  } else if (fuelTrend && fuelTrend.direction === 'INCREASING' && fuelTrend.changePercentage >= 20) {
    indicators.push({
      id: 'stress_spending_pressure_transit',
      severity: 'INFO',
      title: 'Spending pressure increasing',
      description: 'Work-related transit and fuel expenses have increased across recent periods.',
      evidence: {
        metricName: 'Work Transit Expense Trend',
        observedValue: `+${fuelTrend.changePercentage}% increase in transit costs`,
        benchmarkThreshold: '≥ 20% increase in operational outlays',
        explanation: 'Work fuel and transit costs rose noticeably. While essential for gig earnings, optimizing routes can reduce burn.',
      },
      recommendedAction: 'Explore fuel loyalty programs and optimize delivery routes to control daily operational burn.',
    });
  }

  // H. Repeated Account Fees or Penalties
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
