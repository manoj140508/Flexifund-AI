/**
 * Income Analysis Domain Module
 * 
 * Deterministic statistical analysis of irregular income for gig and informal workers.
 * Computes mean, median, volatility (Coefficient of Variation), conservative planning reference,
 * weekly/monthly breakdowns, and platform income concentration without LLM hallucination.
 */

import { Money, moneyFromPaise, ZERO_MONEY, SerializedMoney, serializeMoney } from './money';
import { NormalizedTransaction } from './transactions';

export type VolatilityRating = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'INSUFFICIENT_DATA';
export type IncomeTrend = 'EXPANDING' | 'STABLE' | 'CONTRACTING' | 'INSUFFICIENT_DATA';

export interface MonthlyPeriodIncome {
  periodKey: string; // YYYY-MM
  totalPaise: bigint;
  transactionCount: number;
  transactionIds: string[];
}

export interface WeeklyPeriodIncome {
  weekKey: string; // YYYY-Www
  totalPaise: bigint;
  transactionCount: number;
  transactionIds: string[];
}

export interface IncomeConcentration {
  topSourceMerchant: string;
  topSourcePaise: bigint;
  percentageBasisPoints: number; // e.g. 7500 = 75.00%
}

export interface IncomeAnalysis {
  totalIncome: Money;
  monthlyAverage: Money;
  monthlyMedian: Money;
  monthlyStandardDeviationPaise: bigint;
  coefficientOfVariation: number | null; // null if insufficient periods (< 2)
  volatilityRating: VolatilityRating;
  conservativeBaselineMonthly: Money; // "Conservative planning reference"
  conservativePlanningLabel: string;
  trend: IncomeTrend;
  highestMonth: { period: string; amount: Money } | null;
  lowestMonth: { period: string; amount: Money } | null;
  monthlyBreakdown: MonthlyPeriodIncome[];
  weeklyBreakdown: WeeklyPeriodIncome[];
  incomeConcentration: IncomeConcentration | null;
  sampleDurationDays: number;
  sampleMonthsCount: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  dataLimitations: string[];
}

export interface SerializedMonthlyPeriodIncome {
  periodKey: string;
  total: SerializedMoney;
  transactionCount: number;
  transactionIds: string[];
}

export interface SerializedWeeklyPeriodIncome {
  weekKey: string;
  total: SerializedMoney;
  transactionCount: number;
  transactionIds: string[];
}

export interface SerializedIncomeConcentration {
  topSourceMerchant: string;
  topSource: SerializedMoney;
  percentageBasisPoints: number;
}

export interface SerializedIncomeAnalysis {
  totalIncome: SerializedMoney;
  monthlyAverage: SerializedMoney;
  monthlyMedian: SerializedMoney;
  monthlyStandardDeviationPaise: string;
  coefficientOfVariation: number | null;
  volatilityRating: VolatilityRating;
  conservativeBaselineMonthly: SerializedMoney;
  conservativePlanningLabel: string;
  trend: IncomeTrend;
  highestMonth: { period: string; amount: SerializedMoney } | null;
  lowestMonth: { period: string; amount: SerializedMoney } | null;
  monthlyBreakdown: SerializedMonthlyPeriodIncome[];
  weeklyBreakdown: SerializedWeeklyPeriodIncome[];
  incomeConcentration: SerializedIncomeConcentration | null;
  sampleDurationDays: number;
  sampleMonthsCount: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  dataLimitations: string[];
}

/**
 * Helper to compute ISO week key YYYY-Www
 */
function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${d.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Groups income transactions by month (YYYY-MM) and week, computing statistical metrics.
 */
export function analyzeIncome(transactions: NormalizedTransaction[]): IncomeAnalysis {
  const incomeTx = transactions
    .filter((tx) => tx.type === 'INCOME' && tx.amount.paise > 0n)
    .sort((a, b) => a.date.localeCompare(b.date));

  const limitations: string[] = [];

  if (incomeTx.length === 0) {
    limitations.push('No positive income transactions detected in the provided statement.');
    return {
      totalIncome: ZERO_MONEY,
      monthlyAverage: ZERO_MONEY,
      monthlyMedian: ZERO_MONEY,
      monthlyStandardDeviationPaise: 0n,
      coefficientOfVariation: null,
      volatilityRating: 'INSUFFICIENT_DATA',
      conservativeBaselineMonthly: ZERO_MONEY,
      conservativePlanningLabel: 'Conservative planning reference (No income detected)',
      trend: 'INSUFFICIENT_DATA',
      highestMonth: null,
      lowestMonth: null,
      monthlyBreakdown: [],
      weeklyBreakdown: [],
      incomeConcentration: null,
      sampleDurationDays: 0,
      sampleMonthsCount: 0,
      confidence: 'INSUFFICIENT_DATA',
      dataLimitations: limitations,
    };
  }

  // Calculate sample span
  const firstDate = new Date(incomeTx[0].date);
  const lastDate = new Date(incomeTx[incomeTx.length - 1].date);
  const sampleDurationDays = Math.max(1, Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  // Group by YYYY-MM and Weeks
  const monthMap = new Map<string, { total: bigint; count: number; ids: string[] }>();
  const weekMap = new Map<string, { total: bigint; count: number; ids: string[] }>();
  const merchantMap = new Map<string, bigint>();
  let totalIncomePaise = 0n;

  for (const tx of incomeTx) {
    totalIncomePaise += tx.amount.paise;

    // Monthly bucket
    const periodKey = tx.date.slice(0, 7); // YYYY-MM
    const currentM = monthMap.get(periodKey) ?? { total: 0n, count: 0, ids: [] };
    currentM.total += tx.amount.paise;
    currentM.count += 1;
    currentM.ids.push(tx.id);
    monthMap.set(periodKey, currentM);

    // Weekly bucket
    const weekKey = getWeekKey(tx.date);
    const currentW = weekMap.get(weekKey) ?? { total: 0n, count: 0, ids: [] };
    currentW.total += tx.amount.paise;
    currentW.count += 1;
    currentW.ids.push(tx.id);
    weekMap.set(weekKey, currentW);

    // Merchant concentration
    const merchant = tx.normalizedMerchant || 'Other Income';
    merchantMap.set(merchant, (merchantMap.get(merchant) ?? 0n) + tx.amount.paise);
  }

  const monthlyBreakdown: MonthlyPeriodIncome[] = Array.from(monthMap.entries())
    .map(([periodKey, val]) => ({
      periodKey,
      totalPaise: val.total,
      transactionCount: val.count,
      transactionIds: val.ids,
    }))
    .sort((a, b) => a.periodKey.localeCompare(b.periodKey));

  const weeklyBreakdown: WeeklyPeriodIncome[] = Array.from(weekMap.entries())
    .map(([weekKey, val]) => ({
      weekKey,
      totalPaise: val.total,
      transactionCount: val.count,
      transactionIds: val.ids,
    }))
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey));

  // Income Concentration
  let topSourceMerchant = '';
  let topSourcePaise = 0n;
  for (const [merch, amount] of merchantMap.entries()) {
    if (amount > topSourcePaise) {
      topSourcePaise = amount;
      topSourceMerchant = merch;
    }
  }

  const concentration: IncomeConcentration | null =
    totalIncomePaise > 0n && topSourceMerchant
      ? {
          topSourceMerchant,
          topSourcePaise,
          percentageBasisPoints: Number((topSourcePaise * 10000n) / totalIncomePaise),
        }
      : null;

  const sampleMonthsCount = monthlyBreakdown.length;

  // Mean monthly
  const meanPaise = totalIncomePaise / BigInt(sampleMonthsCount);

  // Median monthly
  const sortedMonthlyPaise = [...monthlyBreakdown.map((m) => m.totalPaise)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  let medianPaise = 0n;
  const mid = Math.floor(sortedMonthlyPaise.length / 2);
  if (sortedMonthlyPaise.length % 2 === 0) {
    medianPaise = (sortedMonthlyPaise[mid - 1] + sortedMonthlyPaise[mid]) / 2n;
  } else {
    medianPaise = sortedMonthlyPaise[mid];
  }

  // Highest and Lowest Month
  let highestMonth: { period: string; amount: Money } | null = null;
  let lowestMonth: { period: string; amount: Money } | null = null;

  for (const m of monthlyBreakdown) {
    const moneyVal = moneyFromPaise(m.totalPaise);
    if (!highestMonth || m.totalPaise > highestMonth.amount.paise) {
      highestMonth = { period: m.periodKey, amount: moneyVal };
    }
    if (!lowestMonth || m.totalPaise < lowestMonth.amount.paise) {
      lowestMonth = { period: m.periodKey, amount: moneyVal };
    }
  }

  // Statistical Variance & Standard Deviation
  let stdDevPaise = 0n;
  let cv: number | null = null;
  let volatility: VolatilityRating = 'INSUFFICIENT_DATA';
  let conservativeBaselinePaise = meanPaise;
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA' = 'LOW';

  if (sampleMonthsCount < 2) {
    limitations.push('Only 1 month of income records provided. Long-term income volatility and trend cannot be reliably determined from a single month.');
    // 1-month fallback: 85% of the observed month to build a safe conservative margin
    conservativeBaselinePaise = (meanPaise * 85n) / 100n;
    volatility = 'INSUFFICIENT_DATA';
    confidence = 'LOW';
  } else {
    const meanNum = Number(meanPaise);
    let sumSquaredDiff = 0;
    for (const m of monthlyBreakdown) {
      const diff = Number(m.totalPaise) - meanNum;
      sumSquaredDiff += diff * diff;
    }
    const sampleVariance = sumSquaredDiff / (sampleMonthsCount - 1);
    const stdDevNum = Math.sqrt(sampleVariance);
    stdDevPaise = BigInt(Math.round(stdDevNum));

    if (meanNum > 0) {
      cv = stdDevNum / meanNum;
      if (cv < 0.15) {
        volatility = 'LOW';
      } else if (cv < 0.35) {
        volatility = 'MODERATE';
      } else if (cv < 0.60) {
        volatility = 'HIGH';
      } else {
        volatility = 'EXTREME';
      }
    }

    // Conservative planning reference:
    // If >= 5 months: 20th percentile
    // Else: max(0, mean - 0.84 * stdDev)
    if (sampleMonthsCount >= 5) {
      const p20Index = Math.max(0, Math.floor(sortedMonthlyPaise.length * 0.2));
      conservativeBaselinePaise = sortedMonthlyPaise[p20Index];
    } else {
      const floorPaiseNum = Math.max(0, meanNum - 0.84 * stdDevNum);
      conservativeBaselinePaise = BigInt(Math.round(floorPaiseNum));
    }

    if (sampleMonthsCount >= 6) {
      confidence = 'HIGH';
    } else if (sampleMonthsCount >= 3) {
      confidence = 'MEDIUM';
    } else {
      confidence = 'LOW';
      limitations.push(`Only ${sampleMonthsCount} months observed. At least 3–6 months recommended for statistically robust income planning.`);
    }
  }

  // Trend detection (Linear slope over periods if >= 3 months)
  let trend: IncomeTrend = 'INSUFFICIENT_DATA';
  if (sampleMonthsCount >= 3) {
    const n = sampleMonthsCount;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
      const y = Number(monthlyBreakdown[i].totalPaise);
      sumX += i;
      sumY += y;
      sumXY += i * y;
      sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const relativeSlope = slope / (sumY / n);

    if (relativeSlope > 0.05) {
      trend = 'EXPANDING';
    } else if (relativeSlope < -0.05) {
      trend = 'CONTRACTING';
    } else {
      trend = 'STABLE';
    }
  } else {
    limitations.push('At least 3 months required to calculate directional income trend.');
  }

  return {
    totalIncome: moneyFromPaise(totalIncomePaise),
    monthlyAverage: moneyFromPaise(meanPaise),
    monthlyMedian: moneyFromPaise(medianPaise),
    monthlyStandardDeviationPaise: stdDevPaise,
    coefficientOfVariation: cv !== null ? Math.round(cv * 1000) / 1000 : null,
    volatilityRating: volatility,
    conservativeBaselineMonthly: moneyFromPaise(conservativeBaselinePaise),
    conservativePlanningLabel: 'Conservative planning reference (not guaranteed income)',
    trend,
    highestMonth,
    lowestMonth,
    monthlyBreakdown,
    weeklyBreakdown,
    incomeConcentration: concentration,
    sampleDurationDays,
    sampleMonthsCount,
    confidence,
    dataLimitations: limitations,
  };
}

/**
 * Serializes IncomeAnalysis for API JSON responses without BigInt errors.
 */
export function serializeIncomeAnalysis(analysis: IncomeAnalysis): SerializedIncomeAnalysis {
  return {
    totalIncome: serializeMoney(analysis.totalIncome),
    monthlyAverage: serializeMoney(analysis.monthlyAverage),
    monthlyMedian: serializeMoney(analysis.monthlyMedian),
    monthlyStandardDeviationPaise: analysis.monthlyStandardDeviationPaise.toString(),
    coefficientOfVariation: analysis.coefficientOfVariation,
    volatilityRating: analysis.volatilityRating,
    conservativeBaselineMonthly: serializeMoney(analysis.conservativeBaselineMonthly),
    conservativePlanningLabel: analysis.conservativePlanningLabel,
    trend: analysis.trend,
    highestMonth: analysis.highestMonth
      ? { period: analysis.highestMonth.period, amount: serializeMoney(analysis.highestMonth.amount) }
      : null,
    lowestMonth: analysis.lowestMonth
      ? { period: analysis.lowestMonth.period, amount: serializeMoney(analysis.lowestMonth.amount) }
      : null,
    monthlyBreakdown: analysis.monthlyBreakdown.map((m) => ({
      periodKey: m.periodKey,
      total: serializeMoney(moneyFromPaise(m.totalPaise)),
      transactionCount: m.transactionCount,
      transactionIds: m.transactionIds,
    })),
    weeklyBreakdown: analysis.weeklyBreakdown.map((w) => ({
      weekKey: w.weekKey,
      total: serializeMoney(moneyFromPaise(w.totalPaise)),
      transactionCount: w.transactionCount,
      transactionIds: w.transactionIds,
    })),
    incomeConcentration: analysis.incomeConcentration
      ? {
          topSourceMerchant: analysis.incomeConcentration.topSourceMerchant,
          topSource: serializeMoney(moneyFromPaise(analysis.incomeConcentration.topSourcePaise)),
          percentageBasisPoints: analysis.incomeConcentration.percentageBasisPoints,
        }
      : null,
    sampleDurationDays: analysis.sampleDurationDays,
    sampleMonthsCount: analysis.sampleMonthsCount,
    confidence: analysis.confidence,
    dataLimitations: analysis.dataLimitations,
  };
}
