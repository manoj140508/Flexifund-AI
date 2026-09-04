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
 * - Ranks opportunities by potential impact, confidence, and recurrence.
 */

import { Money, moneyFromPaise, formatRupees, SerializedMoney, serializeMoney, ZERO_MONEY } from './money';
import { IncomeAnalysis } from './income';
import { ExpenseAnalysis } from './expenses';
import { NormalizedTransaction } from './transactions';

export type OpportunityCategory =
  | 'RECURRING_DISCRETIONARY_PAYMENT'
  | 'AVOIDABLE_FEES_CHARGES'
  | 'INCREASING_DISCRETIONARY_SPEND'
  | 'HIGH_DISCRETIONARY_OUTFLOW'
  | 'SURPLUS_CAPTURE_PEAK_PERIOD'
  | 'REPEATED_DISCRETIONARY_SPEND'
  | 'FREQUENT_SMALL_DISCRETIONARY'
  | 'WORK_EXPENSE_OPTIMIZATION';

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
  observedSpending?: Money;
  potentialMonthlySaving?: Money;
  potentialAnnualSaving?: Money;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: SavingsEvidence;
  recommendedAction: string;
  reasonDetected?: string;
}

export interface SerializedSavingsOpportunity {
  id: string;
  category: OpportunityCategory;
  title: string;
  description: string;
  observedSpending?: SerializedMoney;
  potentialMonthlySaving?: SerializedMoney;
  potentialAnnualSaving?: SerializedMoney;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: SavingsEvidence;
  recommendedAction: string;
  reasonDetected?: string;
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
  transactions?: NormalizedTransaction[];
}

/**
 * Detects evidence-based cost reduction and financial buffer opportunities.
 */
export function detectSavingsOpportunities(input: OpportunityEngineInput): SavingsOpportunity[] {
  const { incomeAnalysis, expenseAnalysis, transactions = [] } = input;
  const candidates: { opp: SavingsOpportunity; rankScore: number }[] = [];
  const monthsCount = Math.max(1, expenseAnalysis.sampleMonthsCount);

  // 1. Recurring Discretionary Payments (Subscriptions & Memberships)
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
    const monthlyMoney = moneyFromPaise(monthlyEquivalentPaise);

    candidates.push({
      opp: {
        id: `opp_rec_disc_${cluster.clusterId}`,
        category: 'RECURRING_DISCRETIONARY_PAYMENT',
        title: `Review Recurring Payment: ${cluster.normalizedMerchant}`,
        description: `Recurring payments detected for ${cluster.normalizedMerchant} occurring approximately every ${cluster.averageIntervalDays} days.`,
        observedSpending: monthlyMoney,
        potentialMonthlySaving: monthlyMoney,
        potentialAnnualSaving: moneyFromPaise(annualEquivalentPaise),
        confidence: cluster.confidence,
        evidence: {
          metricName: 'Recurring Discretionary Spend',
          observedValue: `${formatRupees(cluster.typicalAmount)} (${cluster.occurrencesCount} occurrences)`,
          sourceTransactionIds: cluster.transactionIds,
          calculationBasis: `${formatRupees(monthlyMoney)}/mo equivalent across ${cluster.occurrencesCount} observed billing cycles`,
          explanation: 'Based on the transactions provided, reviewing optional or under-utilized recurring services can free up valuable cash margin.',
        },
        reasonDetected: `Recurring subscription or membership detected with ${cluster.occurrencesCount} repeated payments to ${cluster.normalizedMerchant}.`,
        recommendedAction: `Consider reviewing whether the ${cluster.normalizedMerchant} service is actively needed or if a lower-tier plan is available.`,
      },
      rankScore: Number(monthlyEquivalentPaise / 100n) * 1.3,
    });
  }

  // Also check transactions for repeated digital subscriptions if recurring detector didn't catch them
  if (transactions.length > 0) {
    const subKeywords = /\b(netflix|spotify|amazon\s*prime|prime\s*video|disney|hotstar|youtube\s*prem|apple\s*music|sony\s*liv|zee5)\b/i;
    const subTx = transactions.filter(
      (tx) => tx.type === 'EXPENSE' && subKeywords.test(tx.rawDescription || tx.normalizedMerchant)
    );

    const subMerchantGroups = new Map<string, NormalizedTransaction[]>();
    for (const tx of subTx) {
      const name = tx.normalizedMerchant || 'Digital Subscription';
      const existing = subMerchantGroups.get(name) ?? [];
      existing.push(tx);
      subMerchantGroups.set(name, existing);
    }

    for (const [merchant, txs] of subMerchantGroups.entries()) {
      // Check if not already added via recurring detector
      const alreadyAdded = candidates.some((c) => c.opp.title.toLowerCase().includes(merchant.toLowerCase()));
      if (!alreadyAdded && txs.length >= 1) {
        const totalPaise = txs.reduce((acc, t) => acc + t.amount.paise, 0n);
        const monthlyPaise = totalPaise / BigInt(monthsCount);
        if (monthlyPaise >= 14900n) {
          // At least ~₹149/mo
          const monthlyMoney = moneyFromPaise(monthlyPaise);
          candidates.push({
            opp: {
              id: `opp_sub_${merchant.toLowerCase().replace(/\s+/g, '_')}`,
              category: 'RECURRING_DISCRETIONARY_PAYMENT',
              title: `Review Digital Subscription: ${merchant}`,
              description: `Digital media or streaming expense identified for ${merchant} (${txs.length} transaction${txs.length > 1 ? 's' : ''}).`,
              observedSpending: monthlyMoney,
              potentialMonthlySaving: monthlyMoney,
              potentialAnnualSaving: moneyFromPaise(monthlyPaise * 12n),
              confidence: txs.length >= 2 ? 'HIGH' : 'MEDIUM',
              evidence: {
                metricName: 'Digital Entertainment Subscription',
                observedValue: `${formatRupees(moneyFromPaise(totalPaise))} across ${txs.length} payment(s)`,
                sourceTransactionIds: txs.map((t) => t.id),
                calculationBasis: `${formatRupees(monthlyMoney)}/month equivalent`,
                explanation: 'Digital subscriptions are easily forgotten but represent a steady recurring drain on irregular income.',
              },
              reasonDetected: `Identified active ${merchant} subscription charge in your statement.`,
              recommendedAction: `Evaluate if ${merchant} is actively used, or pause until high-earning seasons.`,
            },
            rankScore: Number(monthlyPaise / 100n) * 1.25,
          });
        }
      }
    }
  }

  // 2. Repeated Bank & Platform Fees / Charges
  const feesCat = expenseAnalysis.categoryBreakdown.FEES_CHARGES;
  if (feesCat && feesCat.total.paise > 0n) {
    const avgMonthlyFeesPaise = feesCat.total.paise / BigInt(monthsCount);
    const annualFeesPaise = avgMonthlyFeesPaise * 12n;
    const monthlyFeeMoney = moneyFromPaise(avgMonthlyFeesPaise);

    candidates.push({
      opp: {
        id: 'opp_avoidable_bank_fees',
        category: 'AVOIDABLE_FEES_CHARGES',
        title: feesCat.transactionCount >= 2 ? 'Potential Avoidable Account & Service Fees' : 'Avoidable Account Fee / Penalty Detected',
        description: `Fee transactions were identified (${feesCat.transactionCount} charge(s) totaling ${formatRupees(feesCat.total)}).`,
        observedSpending: monthlyFeeMoney,
        potentialMonthlySaving: monthlyFeeMoney,
        potentialAnnualSaving: moneyFromPaise(annualFeesPaise),
        confidence: feesCat.transactionCount >= 2 ? 'HIGH' : 'MEDIUM',
        evidence: {
          metricName: 'Bank & Service Fees',
          observedValue: `${formatRupees(feesCat.total)} across ${feesCat.transactionCount} transactions`,
          sourceTransactionIds: feesCat.transactionIds,
          calculationBasis: `Average fee impact: ${formatRupees(monthlyFeeMoney)}/month`,
          explanation: 'Fees for non-maintenance, cheque/mandate return, or ATM limits can be minimized with automated account alerts.',
        },
        reasonDetected: `Bank non-maintenance, SMS alert, ATM charges, or return penalties totaling ${formatRupees(feesCat.total)} detected.`,
        recommendedAction: 'Verify minimum balance requirements or consider switching to a zero-balance unorganised worker savings account (e.g., PMJDY or Basic Savings Bank Deposit).',
      },
      rankScore: Number(avgMonthlyFeesPaise / 100n) * 1.3,
    });
  }

  // 3. Repeated Discretionary Food & Dining / Takeout
  if (transactions.length > 0) {
    const diningKeywords = /\b(zomato|swiggy|domino|mcdonald|kfc|pizza|burger|starbucks|cafe|restaurant|bistro|bakery|diner)\b/i;
    const diningTx = transactions.filter(
      (tx) => tx.type === 'EXPENSE' && (diningKeywords.test(tx.rawDescription || tx.normalizedMerchant) || (tx.category === 'DISCRETIONARY' && diningKeywords.test(tx.rawDescription)))
    );

    if (diningTx.length >= 2) {
      const diningTotalPaise = diningTx.reduce((acc, t) => acc + t.amount.paise, 0n);
      const monthlyDiningPaise = diningTotalPaise / BigInt(monthsCount);
      // Realistic potential saving: moderating 20% to 25% of takeout spend
      const potentialMonthlySavingPaise = (monthlyDiningPaise * 25n) / 100n;

      if (monthlyDiningPaise >= 120000n) {
        // At least ₹1,200/mo
        candidates.push({
          opp: {
            id: 'opp_dining_takeout_moderation',
            category: 'REPEATED_DISCRETIONARY_SPEND',
            title: 'Moderate Frequent Food Delivery & Dining Out',
            description: `Identified ${diningTx.length} dining/food delivery orders totaling ${formatRupees(moneyFromPaise(diningTotalPaise))} (${formatRupees(moneyFromPaise(monthlyDiningPaise))}/month).`,
            observedSpending: moneyFromPaise(monthlyDiningPaise),
            potentialMonthlySaving: moneyFromPaise(potentialMonthlySavingPaise),
            potentialAnnualSaving: moneyFromPaise(potentialMonthlySavingPaise * 12n),
            confidence: diningTx.length >= 4 ? 'HIGH' : 'MEDIUM',
            evidence: {
              metricName: 'Discretionary Dining Orders',
              observedValue: `${diningTx.length} orders totaling ${formatRupees(moneyFromPaise(diningTotalPaise))}`,
              sourceTransactionIds: diningTx.map((t) => t.id).slice(0, 10),
              calculationBasis: `Moderating ~25% of takeout spend retains ~${formatRupees(moneyFromPaise(potentialMonthlySavingPaise))}/month without eliminating convenience`,
              explanation: 'Food delivery convenience fees, surge charges, and repeated takeout orders can consume a substantial share of irregular gig surplus.',
            },
            reasonDetected: `Spending in this category is consistently frequent (${diningTx.length} orders) relative to observed monthly surplus.`,
            recommendedAction: 'Set a weekly takeout cap and replace 1–2 delivery orders per week with home-prepared meals.',
          },
          rankScore: Number(potentialMonthlySavingPaise / 100n) * 1.15,
        });
      }
    }
  }

  // 4. Frequent Low-Ticket Discretionary Purchases (Micro-Spends < ₹350)
  if (transactions.length > 0) {
    const microDiscretionary = transactions.filter(
      (tx) => tx.type === 'EXPENSE' && tx.category === 'DISCRETIONARY' && tx.amount.paise <= 35000n && tx.amount.paise > 0n
    );

    if (microDiscretionary.length >= 4) {
      const totalMicroPaise = microDiscretionary.reduce((acc, t) => acc + t.amount.paise, 0n);
      const monthlyMicroPaise = totalMicroPaise / BigInt(monthsCount);
      const potentialRecapturePaise = (monthlyMicroPaise * 25n) / 100n; // ~25% containment

      if (monthlyMicroPaise >= 80000n) {
        // At least ₹800/mo in small spends
        candidates.push({
          opp: {
            id: 'opp_frequent_micro_spends',
            category: 'FREQUENT_SMALL_DISCRETIONARY',
            title: 'Consolidate Frequent Minor Discretionary Spends',
            description: `Detected ${microDiscretionary.length} small discretionary transactions (< ₹350 each) totaling ${formatRupees(moneyFromPaise(totalMicroPaise))} (${formatRupees(moneyFromPaise(monthlyMicroPaise))}/mo).`,
            observedSpending: moneyFromPaise(monthlyMicroPaise),
            potentialMonthlySaving: moneyFromPaise(potentialRecapturePaise),
            potentialAnnualSaving: moneyFromPaise(potentialRecapturePaise * 12n),
            confidence: 'MEDIUM',
            evidence: {
              metricName: 'Frequent Micro-Spends',
              observedValue: `${microDiscretionary.length} small purchases totaling ${formatRupees(moneyFromPaise(totalMicroPaise))}`,
              sourceTransactionIds: microDiscretionary.map((t) => t.id).slice(0, 10),
              calculationBasis: `Tapering 25% of small impulse purchases frees ~${formatRupees(moneyFromPaise(potentialRecapturePaise))}/month`,
              explanation: 'Small daily payments (snacks, beverages, digital micro-purchases) individually feel negligible but accumulate into meaningful monthly totals.',
            },
            reasonDetected: `High frequency of low-ticket purchases (${microDiscretionary.length} items) adds up to significant monthly leakage.`,
            recommendedAction: 'Allocate a fixed weekly cash allowance for miscellaneous daily spending to prevent unnoticed UPI leakages.',
          },
          rankScore: Number(potentialRecapturePaise / 100n) * 1.05,
        });
      }
    }
  }

  // 5. High Discretionary Outflow (> 25% of total expenses)
  const totalExp = expenseAnalysis.totalExpenses.paise;
  const discExp = expenseAnalysis.discretionaryMonthlyBurn.paise;
  if (totalExp > 0n && discExp >= 150000n) {
    const discRatio = Number((discExp * 100n) / expenseAnalysis.monthlyAverageExpenses.paise);
    if (discRatio >= 25) {
      // Check if we already added dining which accounts for most of it
      const alreadyHasDining = candidates.some((c) => c.opp.category === 'REPEATED_DISCRETIONARY_SPEND');
      if (!alreadyHasDining || discRatio >= 35) {
        const potentialRecapturePaise = (discExp * 15n) / 100n;
        candidates.push({
          opp: {
            id: 'opp_high_discretionary_share',
            category: 'HIGH_DISCRETIONARY_OUTFLOW',
            title: 'Moderate Overall Discretionary Spending Margin',
            description: `Discretionary expenses account for approximately ${discRatio}% of your total monthly spending (${formatRupees(expenseAnalysis.discretionaryMonthlyBurn)}/mo).`,
            observedSpending: expenseAnalysis.discretionaryMonthlyBurn,
            potentialMonthlySaving: moneyFromPaise(potentialRecapturePaise),
            potentialAnnualSaving: moneyFromPaise(potentialRecapturePaise * 12n),
            confidence: 'HIGH',
            evidence: {
              metricName: 'Discretionary Expense Share',
              observedValue: `${discRatio}% of monthly spend (${formatRupees(expenseAnalysis.discretionaryMonthlyBurn)}/mo)`,
              sourceTransactionIds: expenseAnalysis.categoryBreakdown.DISCRETIONARY?.transactionIds.slice(0, 8) ?? [],
              calculationBasis: `Reallocating 15% of non-essential spending creates ~${formatRupees(moneyFromPaise(potentialRecapturePaise))}/month in savings capacity`,
              explanation: 'A high discretionary ratio indicates strong flexibility to build cash reserves without impacting living essentials.',
            },
            reasonDetected: `Non-essential outlays represent ${discRatio}% of monthly outflow, showing room for buffer accumulation.`,
            recommendedAction: 'Redirect a portion of discretionary purchases directly into a liquid emergency reserve.',
          },
          rankScore: Number(potentialRecapturePaise / 100n) * 1.0,
        });
      }
    }
  }

  // 6. Work-Related Fuel & Transit Expense Optimization
  const workBurnPaise = expenseAnalysis.workRelatedMonthlyBurn.paise;
  if (workBurnPaise >= 250000n) {
    // Work transit is essential! Never suggest eliminating it.
    // Instead suggest fleet cashback and maintenance efficiency (5% optimization).
    const potentialOptimizationPaise = (workBurnPaise * 5n) / 100n;
    candidates.push({
      opp: {
        id: 'opp_work_transit_optimization',
        category: 'WORK_EXPENSE_OPTIMIZATION',
        title: 'Explore Fuel Cashback & Vehicle Efficiency',
        description: `Work fuel and transit costs total ${formatRupees(expenseAnalysis.workRelatedMonthlyBurn)}/month. While essential to your livelihood, 5% can be optimized through fleet loyalty cards and maintenance.`,
        observedSpending: expenseAnalysis.workRelatedMonthlyBurn,
        potentialMonthlySaving: moneyFromPaise(potentialOptimizationPaise),
        potentialAnnualSaving: moneyFromPaise(potentialOptimizationPaise * 12n),
        confidence: 'MEDIUM',
        evidence: {
          metricName: 'Work-Related Transit & Fuel',
          observedValue: `${formatRupees(expenseAnalysis.workRelatedMonthlyBurn)}/month`,
          sourceTransactionIds: expenseAnalysis.categoryBreakdown.WORK_FUEL_TRANSIT?.transactionIds.slice(0, 8) ?? [],
          calculationBasis: `Capturing 5% via fuel rewards and optimal tire pressure saves ~${formatRupees(moneyFromPaise(potentialOptimizationPaise))}/month`,
          explanation: 'Do not eliminate essential transit. Instead, capture rewards and maintain vehicle efficiency to minimize operating costs.',
        },
        reasonDetected: `Work-related transit consumes ${formatRupees(expenseAnalysis.workRelatedMonthlyBurn)}/month of operating cash flow.`,
        recommendedAction: 'Use oil marketing company fleet/loyalty cards (e.g., IOCL XTRAREWARDS, BPCL SmartFleet) for 2–3% fuel cashback and keep weekly tire pressure optimal.',
      },
      rankScore: Number(potentialOptimizationPaise / 100n) * 0.95,
    });
  }

  // 7. Increasing Discretionary Spending Trend
  const discTrend = expenseAnalysis.categoryTrends.find((t) => t.category === 'DISCRETIONARY');
  if (discTrend && discTrend.direction === 'INCREASING' && discTrend.changePercentage >= 15) {
    const potentialMonthlyTaperPaise = (expenseAnalysis.discretionaryMonthlyBurn.paise * 15n) / 100n;
    if (potentialMonthlyTaperPaise > 0n) {
      candidates.push({
        opp: {
          id: 'opp_increasing_discretionary',
          category: 'INCREASING_DISCRETIONARY_SPEND',
          title: 'Moderate Upward Trend in Discretionary Spend',
          description: `Discretionary spending grew by approximately ${discTrend.changePercentage}% between earlier and later statement periods.`,
          observedSpending: expenseAnalysis.discretionaryMonthlyBurn,
          potentialMonthlySaving: moneyFromPaise(potentialMonthlyTaperPaise),
          potentialAnnualSaving: moneyFromPaise(potentialMonthlyTaperPaise * 12n),
          confidence: 'MEDIUM',
          evidence: {
            metricName: 'Discretionary Growth Rate',
            observedValue: `+${discTrend.changePercentage}% increase`,
            sourceTransactionIds: expenseAnalysis.categoryBreakdown.DISCRETIONARY?.transactionIds.slice(0, 10) ?? [],
            calculationBasis: `Targeting a 15% reduction in non-essential spending could reclaim ~${formatRupees(moneyFromPaise(potentialMonthlyTaperPaise))}/month`,
            explanation: 'When income is variable, rising discretionary spending during quieter earning weeks compresses emergency coverage.',
          },
          reasonDetected: `Upward trend detected: non-essential outlays increased by ${discTrend.changePercentage}%.`,
          recommendedAction: 'Consider setting a weekly non-essential spending cap during quieter earning cycles.',
        },
        rankScore: Number(potentialMonthlyTaperPaise / 100n) * 1.1,
      });
    }
  }

  // 8. Surplus Capture During Peak Earning Periods
  if (
    incomeAnalysis.highestMonth &&
    incomeAnalysis.lowestMonth &&
    incomeAnalysis.sampleMonthsCount >= 2
  ) {
    const peakDeltaPaise = incomeAnalysis.highestMonth.amount.paise - incomeAnalysis.monthlyAverage.paise;
    if (peakDeltaPaise > 0n) {
      const suggestedBufferAllocationPaise = (peakDeltaPaise * 40n) / 100n; // Allocate 40% of peak windfall
      candidates.push({
        opp: {
          id: 'opp_surplus_capture_peak',
          category: 'SURPLUS_CAPTURE_PEAK_PERIOD',
          title: 'Capture Windfall Surplus in Strong Earning Months',
          description: `In your highest month (${incomeAnalysis.highestMonth.period}), income reached ${formatRupees(incomeAnalysis.highestMonth.amount)}, exceeding your average by ${formatRupees(moneyFromPaise(peakDeltaPaise))}.`,
          observedSpending: moneyFromPaise(peakDeltaPaise),
          potentialMonthlySaving: moneyFromPaise(suggestedBufferAllocationPaise),
          potentialAnnualSaving: moneyFromPaise(suggestedBufferAllocationPaise * 12n),
          confidence: 'HIGH',
          evidence: {
            metricName: 'Peak Income Delta',
            observedValue: `${formatRupees(incomeAnalysis.highestMonth.amount)} vs ${formatRupees(incomeAnalysis.lowestMonth.amount)} in lowest period`,
            sourceTransactionIds: incomeAnalysis.monthlyBreakdown.find((m) => m.periodKey === incomeAnalysis.highestMonth?.period)?.transactionIds ?? [],
            calculationBasis: `Allocating 40% of peak surplus (${formatRupees(moneyFromPaise(suggestedBufferAllocationPaise))}) prevents lifestyle creep during peak gig weeks`,
            explanation: 'Gig workers benefit most from asymmetric savings: save aggressively during festival/surge weeks to fund lean seasons.',
          },
          reasonDetected: `Substantial income variance across months creates prime opportunities to park excess earnings.`,
          recommendedAction: 'Automatically park 40% of earnings above your monthly average into an emergency buffer account.',
        },
        rankScore: Number(suggestedBufferAllocationPaise / 100n) * 1.2,
      });
    }
  }

  // Deterministic ranking: sort by rankScore descending, take top 4
  candidates.sort((a, b) => b.rankScore - a.rankScore);
  return candidates.slice(0, 4).map((c) => c.opp);
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
    observedSpending: opp.observedSpending ? serializeMoney(opp.observedSpending) : undefined,
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
