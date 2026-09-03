/**
 * Resilience Analysis Domain Module
 * 
 * Computes financial buffer duration, essential expense coverage, and an explainable 0–100 Resilience Score.
 * 
 * NON-NEGOTIABLE RULE:
 * Never infer actual current bank balance from historical statement transactions.
 * If user does not explicitly supply current cash balance, coverage metrics are marked
 * as 'ESTIMATED_HISTORICAL_SURPLUS' or 'BALANCE_NOT_PROVIDED'.
 */

import { Money, moneyFromPaise, SerializedMoney, serializeMoney } from './money';
import { IncomeAnalysis } from './income';
import { ExpenseAnalysis } from './expenses';

export type CoverageStatus = 'CRITICAL' | 'VULNERABLE' | 'ADEQUATE' | 'ROBUST' | 'INSUFFICIENT_DATA' | 'NOT_CALCULABLE';

export interface ScoreComponent {
  name: string;
  weightPercentage: number;
  earnedPoints: number;
  maxPoints: number;
  calculationBasis: string;
  explanation: string;
}

export interface ResilienceAnalysis {
  // Cash Buffer Info
  userProvidedCurrentBalance: Money | null;
  estimatedHistoricalNetSurplus: Money; // Total historical income - total historical expenses
  bufferCoverageDays: number | null; // Null if no balance provided
  isEstimatedFromHistoricalOnly: boolean;
  coverageStatus: CoverageStatus;

  // Resilience Score (0 - 100)
  resilienceScore: number | null; // Null if insufficient data
  scoreConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  scoreComponents: ScoreComponent[];

  // Explanatory Guidance
  summaryExplanation: string;
  dataLimitations: string[];
}

export interface SerializedScoreComponent {
  name: string;
  weightPercentage: number;
  earnedPoints: number;
  maxPoints: number;
  calculationBasis: string;
  explanation: string;
}

export interface SerializedResilienceAnalysis {
  userProvidedCurrentBalance: SerializedMoney | null;
  estimatedHistoricalNetSurplus: SerializedMoney;
  bufferCoverageDays: number | null;
  isEstimatedFromHistoricalOnly: boolean;
  coverageStatus: CoverageStatus;
  resilienceScore: number | null;
  scoreConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  scoreComponents: SerializedScoreComponent[];
  summaryExplanation: string;
  dataLimitations: string[];
}

export interface ResilienceCalculationInput {
  incomeAnalysis: IncomeAnalysis;
  expenseAnalysis: ExpenseAnalysis;
  userProvidedCashBalance?: Money | null;
}

/**
 * Deterministically analyzes financial resilience and computes explainable score components.
 */
export function analyzeResilience(input: ResilienceCalculationInput): ResilienceAnalysis {
  const { incomeAnalysis, expenseAnalysis, userProvidedCashBalance } = input;
  const limitations: string[] = [];

  // 1. Calculate Historical Net Surplus
  const netSurplusPaise = incomeAnalysis.totalIncome.paise - expenseAnalysis.totalExpenses.paise;
  const estimatedHistoricalNetSurplus = moneyFromPaise(netSurplusPaise);

  // 2. Buffer & Coverage Days
  const dailyEssentialBurnPaise = expenseAnalysis.dailyEssentialBurnRate.paise;
  let bufferCoverageDays: number | null = null;
  let isEstimatedFromHistoricalOnly = false;
  let coverageStatus: CoverageStatus = 'INSUFFICIENT_DATA';

  if (userProvidedCashBalance) {
    // User explicitly provided their current real balance
    if (dailyEssentialBurnPaise > 0n) {
      const days = Number(userProvidedCashBalance.paise / dailyEssentialBurnPaise);
      bufferCoverageDays = Math.max(0, days);
      coverageStatus = evaluateCoverageStatus(bufferCoverageDays);
    } else {
      limitations.push('Daily essential burn rate is zero or indeterminate; coverage days cannot be computed.');
      coverageStatus = 'NOT_CALCULABLE';
    }
  } else {
    // Balance not provided: do NOT claim current emergency coverage!
    isEstimatedFromHistoricalOnly = true;
    bufferCoverageDays = null;
    coverageStatus = 'INSUFFICIENT_DATA';
    limitations.push('Current cash balance not provided. Emergency buffer coverage cannot be determined from statement transactions alone.');
  }

  // 3. Compute 0 - 100 Resilience Score Components
  const components: ScoreComponent[] = [];
  let scoreConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA' = 'LOW';

  // Check sufficient data
  if (incomeAnalysis.sampleMonthsCount === 0 || expenseAnalysis.sampleMonthsCount === 0) {
    return {
      userProvidedCurrentBalance: userProvidedCashBalance ?? null,
      estimatedHistoricalNetSurplus,
      bufferCoverageDays: null,
      isEstimatedFromHistoricalOnly,
      coverageStatus: 'NOT_CALCULABLE',
      resilienceScore: null,
      scoreConfidence: 'INSUFFICIENT_DATA',
      scoreComponents: [],
      summaryExplanation: 'Insufficient financial transaction data to calculate resilience.',
      dataLimitations: ['No transaction records available.'],
    };
  }

  // Component 1: Buffer Coverage (Weight 40%)
  const maxBufferPts = 40;
  let earnedBufferPts = 0;
  if (bufferCoverageDays !== null) {
    if (bufferCoverageDays >= 90) {
      earnedBufferPts = 40;
    } else if (bufferCoverageDays >= 30) {
      earnedBufferPts = 25 + Math.round(((bufferCoverageDays - 30) / 60) * 15);
    } else if (bufferCoverageDays >= 7) {
      earnedBufferPts = 10 + Math.round(((bufferCoverageDays - 7) / 23) * 15);
    } else {
      earnedBufferPts = Math.round((bufferCoverageDays / 7) * 10);
    }
  } else {
    // Current cash balance not provided: provisional score derived from statement surplus (capped at 20 pts)
    if (dailyEssentialBurnPaise > 0n && netSurplusPaise > 0n) {
      const estimatedSurplusDays = Number(netSurplusPaise / dailyEssentialBurnPaise);
      earnedBufferPts = Math.min(20, Math.round((estimatedSurplusDays / 30) * 15));
    } else {
      earnedBufferPts = 5;
    }
  }

  components.push({
    name: 'Emergency Expense Coverage',
    weightPercentage: 40,
    earnedPoints: earnedBufferPts,
    maxPoints: maxBufferPts,
    calculationBasis: isEstimatedFromHistoricalOnly
      ? 'Provisional estimate based on net statement surplus. Confirmed current bank balance was not provided.'
      : `Confirmed cash balance covers ~${bufferCoverageDays ?? 0} days of essential burn`,
    explanation:
      bufferCoverageDays !== null
        ? bufferCoverageDays >= 30
          ? 'Healthy runway to absorb unexpected drops in gig income or emergency health expenses.'
          : 'Limited coverage runway increases exposure to sudden disruptions in daily earnings.'
        : 'Provide your current liquid cash balance to calculate your actual emergency runway in days.',
  });

  // Component 2: Income Stability (Weight 25%)
  const maxStabilityPts = 25;
  let earnedStabilityPts = 12; // default moderate
  if (incomeAnalysis.coefficientOfVariation !== null) {
    const cv = incomeAnalysis.coefficientOfVariation;
    // Lower CV = higher stability
    const stabilityRatio = Math.max(0, Math.min(1, 1 - cv));
    earnedStabilityPts = Math.round(stabilityRatio * maxStabilityPts);
  } else {
    limitations.push('Single month income prevents statistical volatility evaluation (neutral stability score assigned).');
  }
  components.push({
    name: 'Income Predictability',
    weightPercentage: 25,
    earnedPoints: earnedStabilityPts,
    maxPoints: maxStabilityPts,
    calculationBasis:
      incomeAnalysis.coefficientOfVariation !== null
        ? `Coefficient of Variation: ${incomeAnalysis.coefficientOfVariation.toFixed(2)} (${incomeAnalysis.volatilityRating} volatility)`
        : 'Single-period baseline (neutral weight)',
    explanation:
      earnedStabilityPts >= 18
        ? 'Earnings exhibit relatively predictable patterns month-over-month.'
        : 'Irregular earnings demand higher buffer reserves to navigate weak earning weeks.',
  });

  // Component 3: Burn Flexibility (Weight 20%)
  const maxFlexibilityPts = 20;
  const totalExpensePaise = expenseAnalysis.totalExpenses.paise;
  let earnedFlexibilityPts = 10;
  if (totalExpensePaise > 0n) {
    const discretionaryPaise = expenseAnalysis.discretionaryMonthlyBurn.paise;
    // Higher discretionary proportion means more room to cut expenses in hard times
    const discRatio = Number((discretionaryPaise * 100n) / totalExpensePaise);
    earnedFlexibilityPts = Math.min(maxFlexibilityPts, Math.round((discRatio / 50) * maxFlexibilityPts));
  }
  components.push({
    name: 'Spending Flexibility',
    weightPercentage: 20,
    earnedPoints: earnedFlexibilityPts,
    maxPoints: maxFlexibilityPts,
    calculationBasis: `Discretionary spend share of expenses: ${totalExpensePaise > 0n ? Math.round(Number(expenseAnalysis.discretionaryMonthlyBurn.paise * 100n / totalExpensePaise)) : 0}%`,
    explanation: 'Measures how much non-essential spending can be paused immediately during low-earning weeks.',
  });

  // Component 4: Debt & Fixed Commitment Burden (Weight 15%)
  const maxDebtPts = 15;
  let earnedDebtPts = 15;
  const conservativeIncomePaise = incomeAnalysis.conservativeBaselineMonthly.paise;
  const debtRepaymentPaise = expenseAnalysis.debtRepaymentsMonthly.paise;
  if (conservativeIncomePaise > 0n) {
    const debtRatio = Number((debtRepaymentPaise * 100n) / conservativeIncomePaise);
    if (debtRatio > 50) {
      earnedDebtPts = 2;
    } else if (debtRatio > 30) {
      earnedDebtPts = 7;
    } else if (debtRatio > 15) {
      earnedDebtPts = 11;
    } else {
      earnedDebtPts = 15;
    }
  }
  components.push({
    name: 'Debt & Fixed Commitment Load',
    weightPercentage: 15,
    earnedPoints: earnedDebtPts,
    maxPoints: maxDebtPts,
    calculationBasis: `Fixed commitments take ${conservativeIncomePaise > 0n ? Math.round(Number(debtRepaymentPaise * 100n / conservativeIncomePaise)) : 0}% of conservative baseline income`,
    explanation:
      earnedDebtPts >= 12
        ? 'Debt repayments are within manageable limits relative to your lower-earning months.'
        : 'Fixed repayment commitments consume a large share of conservative income, restricting flexibility.',
  });

  // Total Score
  const totalScore = Math.max(0, Math.min(100, components.reduce((acc, c) => acc + c.earnedPoints, 0)));

  // Confidence
  if (incomeAnalysis.sampleMonthsCount >= 3 && userProvidedCashBalance) {
    scoreConfidence = 'HIGH';
  } else if (incomeAnalysis.sampleMonthsCount >= 2) {
    scoreConfidence = 'MEDIUM';
  } else {
    scoreConfidence = 'LOW';
  }

  // Summary explanation
  const summaryExplanation = generateResilienceSummary(totalScore, coverageStatus, isEstimatedFromHistoricalOnly);

  return {
    userProvidedCurrentBalance: userProvidedCashBalance ?? null,
    estimatedHistoricalNetSurplus,
    bufferCoverageDays,
    isEstimatedFromHistoricalOnly,
    coverageStatus,
    resilienceScore: totalScore,
    scoreConfidence,
    scoreComponents: components,
    summaryExplanation,
    dataLimitations: limitations,
  };
}

function evaluateCoverageStatus(days: number): CoverageStatus {
  if (days < 7) return 'CRITICAL';
  if (days < 30) return 'VULNERABLE';
  if (days < 90) return 'ADEQUATE';
  return 'ROBUST';
}

function generateResilienceSummary(score: number, status: CoverageStatus, isEstimated: boolean): string {
  const estimateTag = isEstimated ? ' (based on historical surplus estimates)' : '';
  if (score >= 75) {
    return `Strong financial resilience${estimateTag}. Your cash cushion and spending flexibility provide substantial protection against unexpected income dips.`;
  }
  if (score >= 50) {
    return `Moderate resilience${estimateTag}. Your finances can manage routine irregularities, but an extended slow period would strain essential expense coverage.`;
  }
  return `Elevated financial exposure${estimateTag}. Tight buffer margins indicate high sensitivity to earning dips or unplanned expenses.`;
}

/**
 * Serializes ResilienceAnalysis for JSON boundary responses without BigInt.
 */
export function serializeResilienceAnalysis(analysis: ResilienceAnalysis): SerializedResilienceAnalysis {
  return {
    userProvidedCurrentBalance: analysis.userProvidedCurrentBalance ? serializeMoney(analysis.userProvidedCurrentBalance) : null,
    estimatedHistoricalNetSurplus: serializeMoney(analysis.estimatedHistoricalNetSurplus),
    bufferCoverageDays: analysis.bufferCoverageDays,
    isEstimatedFromHistoricalOnly: analysis.isEstimatedFromHistoricalOnly,
    coverageStatus: analysis.coverageStatus,
    resilienceScore: analysis.resilienceScore,
    scoreConfidence: analysis.scoreConfidence,
    scoreComponents: analysis.scoreComponents,
    summaryExplanation: analysis.summaryExplanation,
    dataLimitations: analysis.dataLimitations,
  };
}
