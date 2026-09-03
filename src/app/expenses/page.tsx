'use client';

import React from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import EmptyState from '@/components/EmptyState';
import ExplainButton from '@/components/ExplainButton';
import { isEssentialCategory } from '@/domain/transactions';

export default function ExpensesPage() {
  const { analysisResult } = useFinancialData();

  if (!analysisResult) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          title="No expense analysis yet."
          description="Upload your statement to view your categorized expenses."
          actionText="Upload financial data"
          actionHref="/upload"
        />
      </div>
    );
  }

  const exp = analysisResult.expenseAnalysis;

  const formatINR = (paiseStr?: string | null) => {
    if (!paiseStr) return '₹0.00';
    const n = Number(paiseStr) / 100;
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[#059669] dark:text-[#34D399]">
              Spending Analysis
            </span>
            <span className="text-xs text-[#52657A] dark:text-[#B8C5D6] font-mono">
              • {(exp.essentialExpenseRatioBasisPoints / 100).toFixed(1)}% Essential Ratio
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
            Expenses & Essential Burn
          </h1>
          <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm mt-1 max-w-2xl">
            Categorized outgoings separated strictly into non-negotiable living essentials vs discretionary spending.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg border border-[#D7E7F5] dark:border-[#2A3B52] text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start md:self-auto shadow-xs"
        >
          ← Back to Overview
        </Link>
      </div>

      {/* 1. Core Burn Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Expenses */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
            Total Outflow
          </span>
          <div className="text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono">
            {formatINR(exp.totalExpenses.paise)}
          </div>
          <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-snug">
            Total recorded debits across recorded days.
          </p>
        </div>

        {/* Essential Monthly Burn */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
            Essential Monthly Burn
          </span>
          <div className="text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono">
            {formatINR(exp.essentialMonthlyBurn.paise)}
          </div>
          <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-snug">
            Housing, groceries, transit & debt. Daily: {formatINR(exp.dailyEssentialBurnRate.paise)}/day.
          </p>
        </div>

        {/* Discretionary Monthly */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
            Discretionary Monthly
          </span>
          <div className="text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono">
            {formatINR(exp.discretionaryMonthlyBurn.paise)}
          </div>
          <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-snug">
            Dining, streaming, shopping & leisure that can be moderated in lean months.
          </p>
        </div>

        {/* Recurring Debt Commitments */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
            Debt Repayments Monthly
          </span>
          <div className="text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono">
            {formatINR(exp.debtRepaymentsMonthly.paise)}
          </div>
          <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-snug">
            Fixed loan EMIs, credit line payments, or vehicle leasing charges.
          </p>
        </div>
      </div>

      {/* 2. Category Breakdown */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
          <div>
            <h2 className="text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              Expense Categorization & Essential Ratio
            </h2>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] mt-0.5">
              Deterministic rule-based classification based on merchant narration patterns.
            </p>
          </div>
          <ExplainButton
            topic="ESSENTIAL_BURN_RATE"
            contextEvidence={{
              metricName: 'Essential Burn Rate',
              observedValue: formatINR(exp.essentialMonthlyBurn.paise),
              explanation: `Essential expenses represent ${(exp.essentialExpenseRatioBasisPoints / 100).toFixed(1)}% of total monthly spending.`,
            }}
          />
        </div>

        {/* Categories Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5FAFF] dark:bg-[#17243A] text-[#52657A] dark:text-[#B8C5D6] border-b border-[#D7E7F5] dark:border-[#2A3B52] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Nature</th>
                <th className="py-3 px-4 text-right">Total Spent</th>
                <th className="py-3 px-4 text-right">Transactions</th>
                <th className="py-3 px-4 text-right">% of Outflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7E7F5] dark:divide-[#2A3B52]">
              {Object.values(exp.categoryBreakdown).map((cat) => {
                const isEssential = isEssentialCategory(cat.category);
                return (
                  <tr key={cat.category} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                      {cat.category.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          isEssential
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isEssential ? 'Essential' : 'Discretionary'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                      {formatINR(cat.total.paise)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#52657A] dark:text-[#B8C5D6]">
                      {cat.transactionCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-[#0F2747] dark:text-[#F8FAFC]">
                      {(cat.percentageBasisPoints / 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
