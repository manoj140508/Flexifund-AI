/**
 * Expense Analysis Domain Module
 * 
 * Deterministic expense classification, category breakdown, daily burn computation,
 * category trend detection, unusual spikes, and recurring payment cluster detection.
 */

import { Money, moneyFromPaise, ZERO_MONEY, SerializedMoney, serializeMoney } from './money';
import { NormalizedTransaction, ExpenseCategory, isEssentialCategory } from './transactions';

export interface CategorySummary {
  category: ExpenseCategory;
  total: Money;
  percentageBasisPoints: number; // e.g. 2500 = 25.00%
  transactionCount: number;
  transactionIds: string[];
}

export interface SerializedCategorySummary {
  category: ExpenseCategory;
  total: SerializedMoney;
  percentageBasisPoints: number;
  transactionCount: number;
  transactionIds: string[];
}

export interface DetectedRecurringCluster {
  clusterId: string;
  normalizedMerchant: string;
  category: ExpenseCategory;
  occurrencesCount: number;
  averageIntervalDays: number;
  frequencyType: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY';
  typicalAmount: Money;
  transactionIds: string[];
  isSubscriptionSuspected: boolean;
  serviceTypeNote: string;
  confidence: 'HIGH' | 'MEDIUM';
}

export interface SerializedDetectedRecurringCluster {
  clusterId: string;
  normalizedMerchant: string;
  category: ExpenseCategory;
  occurrencesCount: number;
  averageIntervalDays: number;
  frequencyType: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY';
  typicalAmount: SerializedMoney;
  transactionIds: string[];
  isSubscriptionSuspected: boolean;
  serviceTypeNote: string;
  confidence: 'HIGH' | 'MEDIUM';
}

export interface MonthlyExpensePeriod {
  periodKey: string; // YYYY-MM
  total: Money;
  essentialTotal: Money;
  discretionaryTotal: Money;
}

export interface CategoryTrend {
  category: ExpenseCategory;
  direction: 'INCREASING' | 'DECREASING' | 'STABLE';
  changePercentage: number; // e.g. +24.5%
  explanation: string;
}

export interface UnusualSpendingSpike {
  transactionId: string;
  date: string;
  merchant: string;
  category: ExpenseCategory;
  amount: Money;
  categoryAverage: Money;
  multiplierAboveAverage: number;
}

export interface SerializedUnusualSpendingSpike {
  transactionId: string;
  date: string;
  merchant: string;
  category: ExpenseCategory;
  amount: SerializedMoney;
  categoryAverage: SerializedMoney;
  multiplierAboveAverage: number;
}

export interface ExpenseAnalysis {
  totalExpenses: Money;
  monthlyAverageExpenses: Money;
  essentialMonthlyBurn: Money;
  discretionaryMonthlyBurn: Money;
  workRelatedMonthlyBurn: Money;
  debtRepaymentsMonthly: Money;
  feesAndChargesTotal: Money;
  transfersTotal: Money;
  uncategorizedTotal: Money;
  essentialExpenseRatioBasisPoints: number; // e.g. 7200 = 72.00%
  dailyBurnRate: Money;
  dailyEssentialBurnRate: Money;
  categoryBreakdown: Record<ExpenseCategory, CategorySummary>;
  majorCategories: ExpenseCategory[];
  categoryTrends: CategoryTrend[];
  unusualSpikes: UnusualSpendingSpike[];
  recurringPayments: DetectedRecurringCluster[];
  monthlyPeriods: MonthlyExpensePeriod[];
  sampleDurationDays: number;
  sampleMonthsCount: number;
}

export interface SerializedExpenseAnalysis {
  totalExpenses: SerializedMoney;
  monthlyAverageExpenses: SerializedMoney;
  essentialMonthlyBurn: SerializedMoney;
  discretionaryMonthlyBurn: SerializedMoney;
  workRelatedMonthlyBurn: SerializedMoney;
  debtRepaymentsMonthly: SerializedMoney;
  feesAndChargesTotal: SerializedMoney;
  transfersTotal: SerializedMoney;
  uncategorizedTotal: SerializedMoney;
  essentialExpenseRatioBasisPoints: number;
  dailyBurnRate: SerializedMoney;
  dailyEssentialBurnRate: SerializedMoney;
  categoryBreakdown: Record<ExpenseCategory, SerializedCategorySummary>;
  majorCategories: ExpenseCategory[];
  categoryTrends: CategoryTrend[];
  unusualSpikes: SerializedUnusualSpendingSpike[];
  recurringPayments: SerializedDetectedRecurringCluster[];
  monthlyPeriods: Array<{
    periodKey: string;
    total: SerializedMoney;
    essentialTotal: SerializedMoney;
    discretionaryTotal: SerializedMoney;
  }>;
  sampleDurationDays: number;
  sampleMonthsCount: number;
}

const ALL_CATEGORIES: ExpenseCategory[] = [
  'ESSENTIAL_HOUSING',
  'ESSENTIAL_GROCERIES',
  'ESSENTIAL_UTILITIES',
  'WORK_FUEL_TRANSIT',
  'WORK_EQUIPMENT',
  'DEBT_REPAYMENT',
  'HEALTHCARE',
  'DISCRETIONARY',
  'FEES_CHARGES',
  'TRANSFER',
  'INCOME',
  'UNCATEGORIZED',
];

/**
 * Deterministically analyzes expense transactions.
 */
export function analyzeExpenses(transactions: NormalizedTransaction[]): ExpenseAnalysis {
  const expenseTx = transactions
    .filter((tx) => (tx.type === 'EXPENSE' || tx.type === 'TRANSFER') && tx.amount.paise > 0n)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Initialize category map
  const catMap: Record<ExpenseCategory, { totalPaise: bigint; count: number; ids: string[] }> = {} as any;
  for (const cat of ALL_CATEGORIES) {
    catMap[cat] = { totalPaise: 0n, count: 0, ids: [] };
  }

  if (expenseTx.length === 0) {
    const emptyBreakdown: Record<ExpenseCategory, CategorySummary> = {} as any;
    for (const cat of ALL_CATEGORIES) {
      emptyBreakdown[cat] = {
        category: cat,
        total: ZERO_MONEY,
        percentageBasisPoints: 0,
        transactionCount: 0,
        transactionIds: [],
      };
    }
    return {
      totalExpenses: ZERO_MONEY,
      monthlyAverageExpenses: ZERO_MONEY,
      essentialMonthlyBurn: ZERO_MONEY,
      discretionaryMonthlyBurn: ZERO_MONEY,
      workRelatedMonthlyBurn: ZERO_MONEY,
      debtRepaymentsMonthly: ZERO_MONEY,
      feesAndChargesTotal: ZERO_MONEY,
      transfersTotal: ZERO_MONEY,
      uncategorizedTotal: ZERO_MONEY,
      essentialExpenseRatioBasisPoints: 0,
      dailyBurnRate: ZERO_MONEY,
      dailyEssentialBurnRate: ZERO_MONEY,
      categoryBreakdown: emptyBreakdown,
      majorCategories: [],
      categoryTrends: [],
      unusualSpikes: [],
      recurringPayments: [],
      monthlyPeriods: [],
      sampleDurationDays: 0,
      sampleMonthsCount: 0,
    };
  }

  // Calculate sample span
  const firstDate = new Date(expenseTx[0].date);
  const lastDate = new Date(expenseTx[expenseTx.length - 1].date);
  const sampleDurationDays = Math.max(1, Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  // Group by month and category
  let totalExpensePaise = 0n;
  let essentialPaise = 0n;
  let discretionaryPaise = 0n;
  let workRelatedPaise = 0n;
  let debtPaise = 0n;
  let feesPaise = 0n;
  let transfersPaise = 0n;
  let uncategorizedPaise = 0n;

  const monthMap = new Map<string, { total: bigint; essential: bigint; discretionary: bigint; categories: Map<ExpenseCategory, bigint> }>();

  for (const tx of expenseTx) {
    const isTransfer = tx.type === 'TRANSFER' || tx.category === 'TRANSFER';
    if (!isTransfer) {
      totalExpensePaise += tx.amount.paise;
    } else {
      transfersPaise += tx.amount.paise;
    }

    const cat: ExpenseCategory = catMap[tx.category] ? tx.category : 'UNCATEGORIZED';
    catMap[cat].totalPaise += tx.amount.paise;
    catMap[cat].count += 1;
    catMap[cat].ids.push(tx.id);

    const isEss = isEssentialCategory(cat);
    if (isEss) {
      essentialPaise += tx.amount.paise;
    } else if (cat === 'DISCRETIONARY') {
      discretionaryPaise += tx.amount.paise;
    }

    if (cat === 'WORK_FUEL_TRANSIT' || cat === 'WORK_EQUIPMENT') {
      workRelatedPaise += tx.amount.paise;
    }
    if (cat === 'DEBT_REPAYMENT') {
      debtPaise += tx.amount.paise;
    }
    if (cat === 'FEES_CHARGES') {
      feesPaise += tx.amount.paise;
    }
    if (cat === 'UNCATEGORIZED') {
      uncategorizedPaise += tx.amount.paise;
    }

    // Monthly bucket
    const monthKey = tx.date.slice(0, 7);
    const m = monthMap.get(monthKey) ?? { total: 0n, essential: 0n, discretionary: 0n, categories: new Map<ExpenseCategory, bigint>() };
    if (!isTransfer) {
      m.total += tx.amount.paise;
    }
    if (isEss) m.essential += tx.amount.paise;
    if (cat === 'DISCRETIONARY') m.discretionary += tx.amount.paise;
    m.categories.set(cat, (m.categories.get(cat) ?? 0n) + tx.amount.paise);
    monthMap.set(monthKey, m);
  }

  const sampleMonthsCount = Math.max(1, monthMap.size);

  // Daily burn rates
  const dailyBurnPaise = totalExpensePaise / BigInt(sampleDurationDays);
  const dailyEssentialBurnPaise = essentialPaise / BigInt(sampleDurationDays);

  // Monthly burn rates
  const monthlyAveragePaise = totalExpensePaise / BigInt(sampleMonthsCount);
  const essentialMonthlyBurnPaise = essentialPaise / BigInt(sampleMonthsCount);
  const discretionaryMonthlyBurnPaise = discretionaryPaise / BigInt(sampleMonthsCount);
  const workRelatedMonthlyBurnPaise = workRelatedPaise / BigInt(sampleMonthsCount);
  const debtRepaymentsMonthlyPaise = debtPaise / BigInt(sampleMonthsCount);

  // Essential ratio
  const essentialRatioBasisPoints =
    totalExpensePaise > 0n ? Number((essentialPaise * 10000n) / totalExpensePaise) : 0;

  // Build category summary
  const categoryBreakdown: Record<ExpenseCategory, CategorySummary> = {} as any;
  for (const cat of ALL_CATEGORIES) {
    const c = catMap[cat];
    const bp = totalExpensePaise > 0n ? Number((c.totalPaise * 10000n) / totalExpensePaise) : 0;
    categoryBreakdown[cat] = {
      category: cat,
      total: moneyFromPaise(c.totalPaise),
      percentageBasisPoints: bp,
      transactionCount: c.count,
      transactionIds: c.ids,
    };
  }

  // Major categories sorted descending
  const sortedCategories = ALL_CATEGORIES.filter((cat) => cat !== 'TRANSFER' && cat !== 'INCOME')
    .sort((a, b) => (catMap[b].totalPaise < catMap[a].totalPaise ? -1 : 1))
    .filter((cat) => catMap[cat].totalPaise > 0n);
  const majorCategories = sortedCategories.slice(0, 3);

  // Monthly periods
  const monthlyPeriods: MonthlyExpensePeriod[] = Array.from(monthMap.entries())
    .map(([periodKey, val]) => ({
      periodKey,
      total: moneyFromPaise(val.total),
      essentialTotal: moneyFromPaise(val.essential),
      discretionaryTotal: moneyFromPaise(val.discretionary),
    }))
    .sort((a, b) => a.periodKey.localeCompare(b.periodKey));

  // Category trends (if >= 2 months)
  const categoryTrends: CategoryTrend[] = [];
  if (monthlyPeriods.length >= 2) {
    const firstPeriod = monthMap.get(monthlyPeriods[0].periodKey)!;
    const lastPeriod = monthMap.get(monthlyPeriods[monthlyPeriods.length - 1].periodKey)!;

    for (const cat of sortedCategories.slice(0, 5)) {
      const v1 = Number(firstPeriod.categories.get(cat) ?? 0n);
      const v2 = Number(lastPeriod.categories.get(cat) ?? 0n);

      if (v1 > 0) {
        const change = ((v2 - v1) / v1) * 100;
        if (change > 15) {
          categoryTrends.push({
            category: cat,
            direction: 'INCREASING',
            changePercentage: Math.round(change),
            explanation: `Spending in this category increased by ${Math.round(change)}% between ${monthlyPeriods[0].periodKey} and ${monthlyPeriods[monthlyPeriods.length - 1].periodKey}.`,
          });
        } else if (change < -15) {
          categoryTrends.push({
            category: cat,
            direction: 'DECREASING',
            changePercentage: Math.round(change),
            explanation: `Spending in this category decreased by ${Math.abs(Math.round(change))}% over the recorded period.`,
          });
        }
      }
    }
  }

  // Unusual Spending Spikes (Transactions > 3x category average)
  const unusualSpikes: UnusualSpendingSpike[] = [];
  for (const cat of sortedCategories) {
    const count = catMap[cat].count;
    if (count >= 3) {
      const avgPaise = catMap[cat].totalPaise / BigInt(count);
      const threshold = avgPaise * 3n;

      for (const tx of expenseTx) {
        if (tx.category === cat && tx.amount.paise > threshold) {
          unusualSpikes.push({
            transactionId: tx.id,
            date: tx.date,
            merchant: tx.normalizedMerchant,
            category: cat,
            amount: tx.amount,
            categoryAverage: moneyFromPaise(avgPaise),
            multiplierAboveAverage: Math.round((Number(tx.amount.paise) / Math.max(1, Number(avgPaise))) * 10) / 10,
          });
        }
      }
    }
  }

  // Detect recurring payments
  const recurringPayments = detectRecurringTransactions(expenseTx.filter((t) => t.type === 'EXPENSE'));

  return {
    totalExpenses: moneyFromPaise(totalExpensePaise),
    monthlyAverageExpenses: moneyFromPaise(monthlyAveragePaise),
    essentialMonthlyBurn: moneyFromPaise(essentialMonthlyBurnPaise),
    discretionaryMonthlyBurn: moneyFromPaise(discretionaryMonthlyBurnPaise),
    workRelatedMonthlyBurn: moneyFromPaise(workRelatedMonthlyBurnPaise),
    debtRepaymentsMonthly: moneyFromPaise(debtRepaymentsMonthlyPaise),
    feesAndChargesTotal: moneyFromPaise(feesPaise),
    transfersTotal: moneyFromPaise(transfersPaise),
    uncategorizedTotal: moneyFromPaise(uncategorizedPaise),
    essentialExpenseRatioBasisPoints: essentialRatioBasisPoints,
    dailyBurnRate: moneyFromPaise(dailyBurnPaise),
    dailyEssentialBurnRate: moneyFromPaise(dailyEssentialBurnPaise),
    categoryBreakdown,
    majorCategories,
    categoryTrends,
    unusualSpikes: unusualSpikes.slice(0, 5),
    recurringPayments,
    monthlyPeriods,
    sampleDurationDays,
    sampleMonthsCount,
  };
}

/**
 * Detects recurring payments using strict clustering:
 * - Same normalized merchant
 * - At least 2 occurrences
 * - Regular intervals (weekly: 5-9d, fortnightly: 12-18d, monthly: 25-35d, quarterly: 80-100d)
 * - Amounts within 15% tolerance
 */
function detectRecurringTransactions(expenses: NormalizedTransaction[]): DetectedRecurringCluster[] {
  const merchantGroups = new Map<string, NormalizedTransaction[]>();

  for (const tx of expenses) {
    if (!tx.normalizedMerchant || tx.normalizedMerchant === 'UNKNOWN') continue;
    const group = merchantGroups.get(tx.normalizedMerchant) ?? [];
    group.push(tx);
    merchantGroups.set(tx.normalizedMerchant, group);
  }

  const clusters: DetectedRecurringCluster[] = [];

  for (const [merchant, group] of merchantGroups.entries()) {
    if (group.length < 2) continue;

    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date));

    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const d1 = new Date(sorted[i - 1].date);
      const d2 = new Date(sorted[i].date);
      const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        intervals.push(diffDays);
      }
    }

    if (intervals.length === 0) continue;

    const avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);

    let freq: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | null = null;
    if (avgInterval >= 5 && avgInterval <= 9) freq = 'WEEKLY';
    else if (avgInterval >= 12 && avgInterval <= 18) freq = 'FORTNIGHTLY';
    else if (avgInterval >= 25 && avgInterval <= 35) freq = 'MONTHLY';
    else if (avgInterval >= 80 && avgInterval <= 100) freq = 'QUARTERLY';

    if (freq !== null) {
      const firstAmount = Number(sorted[0].amount.paise);
      const isConsistentAmount = sorted.every((tx) => {
        const amt = Number(tx.amount.paise);
        const diff = Math.abs(amt - firstAmount);
        return diff / Math.max(firstAmount, 1) <= 0.15;
      });

      if (isConsistentAmount) {
        const sumPaise = sorted.reduce((acc, tx) => acc + tx.amount.paise, 0n);
        const typicalPaise = sumPaise / BigInt(sorted.length);

        // Subscription detection: high confidence for digital entertainment / software
        const isKnownSubscription = /\b(netflix|prime|hotstar|spotify|apple|youtube|gym|broadband)\b/i.test(merchant);

        clusters.push({
          clusterId: `rec_${merchant.toLowerCase().replace(/\s+/g, '_')}_${sorted[0].id}`,
          normalizedMerchant: merchant,
          category: sorted[0].category,
          occurrencesCount: sorted.length,
          averageIntervalDays: avgInterval,
          frequencyType: freq,
          typicalAmount: moneyFromPaise(typicalPaise),
          transactionIds: sorted.map((tx) => tx.id),
          isSubscriptionSuspected: isKnownSubscription,
          serviceTypeNote: isKnownSubscription
            ? 'Identified as recurring digital subscription or media service'
            : 'Recurring payment detected. May be a subscription or recurring service.',
          confidence: sorted.length >= 3 ? 'HIGH' : 'MEDIUM',
        });
      }
    }
  }

  return clusters;
}

/**
 * Serializes ExpenseAnalysis for JSON boundaries without BigInt.
 */
export function serializeExpenseAnalysis(analysis: ExpenseAnalysis): SerializedExpenseAnalysis {
  const serializedBreakdown: Record<ExpenseCategory, SerializedCategorySummary> = {} as any;
  for (const cat of ALL_CATEGORIES) {
    const item = analysis.categoryBreakdown[cat];
    serializedBreakdown[cat] = {
      category: item.category,
      total: serializeMoney(item.total),
      percentageBasisPoints: item.percentageBasisPoints,
      transactionCount: item.transactionCount,
      transactionIds: item.transactionIds,
    };
  }

  return {
    totalExpenses: serializeMoney(analysis.totalExpenses),
    monthlyAverageExpenses: serializeMoney(analysis.monthlyAverageExpenses),
    essentialMonthlyBurn: serializeMoney(analysis.essentialMonthlyBurn),
    discretionaryMonthlyBurn: serializeMoney(analysis.discretionaryMonthlyBurn),
    workRelatedMonthlyBurn: serializeMoney(analysis.workRelatedMonthlyBurn),
    debtRepaymentsMonthly: serializeMoney(analysis.debtRepaymentsMonthly),
    feesAndChargesTotal: serializeMoney(analysis.feesAndChargesTotal),
    transfersTotal: serializeMoney(analysis.transfersTotal),
    uncategorizedTotal: serializeMoney(analysis.uncategorizedTotal),
    essentialExpenseRatioBasisPoints: analysis.essentialExpenseRatioBasisPoints,
    dailyBurnRate: serializeMoney(analysis.dailyBurnRate),
    dailyEssentialBurnRate: serializeMoney(analysis.dailyEssentialBurnRate),
    categoryBreakdown: serializedBreakdown,
    majorCategories: analysis.majorCategories,
    categoryTrends: analysis.categoryTrends,
    unusualSpikes: analysis.unusualSpikes.map((s) => ({
      ...s,
      amount: serializeMoney(s.amount),
      categoryAverage: serializeMoney(s.categoryAverage),
    })),
    recurringPayments: analysis.recurringPayments.map((r) => ({
      clusterId: r.clusterId,
      normalizedMerchant: r.normalizedMerchant,
      category: r.category,
      occurrencesCount: r.occurrencesCount,
      averageIntervalDays: r.averageIntervalDays,
      frequencyType: r.frequencyType,
      typicalAmount: serializeMoney(r.typicalAmount),
      transactionIds: r.transactionIds,
      isSubscriptionSuspected: r.isSubscriptionSuspected,
      serviceTypeNote: r.serviceTypeNote,
      confidence: r.confidence,
    })),
    monthlyPeriods: analysis.monthlyPeriods.map((p) => ({
      periodKey: p.periodKey,
      total: serializeMoney(p.total),
      essentialTotal: serializeMoney(p.essentialTotal),
      discretionaryTotal: serializeMoney(p.discretionaryTotal),
    })),
    sampleDurationDays: analysis.sampleDurationDays,
    sampleMonthsCount: analysis.sampleMonthsCount,
  };
}
