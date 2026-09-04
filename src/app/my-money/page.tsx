'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import AddExpenseModal from '@/components/AddExpenseModal';

export default function MyMoneyPage() {
  const { analysisResult, confirmedTransactions } = useFinancialData();
  const [activeTab, setActiveTab] = useState<'all' | 'in' | 'out' | 'activity'>('all');
  const [showAddExpense, setShowAddExpense] = useState(false);


  if (!analysisResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-8 sm:p-12 shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-3xl mx-auto font-bold">
            💳
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC]">
              See where your money goes
            </h1>
            <p className="text-sm text-[#52657A] dark:text-[#CBD5E1]">
              Upload your statement to see your earnings, must-pay expenses, and optional spending.
            </p>
          </div>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#2563EB] text-white font-bold text-sm hover:bg-blue-600 transition-colors shadow-sm"
          >
            <span>Upload statement →</span>
          </Link>
        </div>
      </div>
    );
  }

  const inc = analysisResult.incomeAnalysis;
  const exp = analysisResult.expenseAnalysis;

  const formatRupees = (paiseStr?: string | null) => {
    if (!paiseStr) return '₹0';
    const rupees = Math.round(Number(paiseStr) / 100);
    return `₹${rupees.toLocaleString('en-IN')}`;
  };

  const monthlyEarned = formatRupees(inc.monthlyAverage?.paise || inc.totalIncome.paise);
  const monthlySpent = formatRupees(exp.monthlyAverageExpenses?.paise || exp.totalExpenses.paise);
  const essentialOutflow = formatRupees(exp.essentialMonthlyBurn.paise);
  const discretionaryOutflow = formatRupees(exp.discretionaryMonthlyBurn.paise);
  const debtOutflow = formatRupees(exp.debtRepaymentsMonthly.paise);

  // Percentages
  const totalSpentPaise = Number(exp.monthlyAverageExpenses?.paise || exp.totalExpenses.paise) || 1;
  const essentialPct = Math.round((Number(exp.essentialMonthlyBurn.paise) / totalSpentPaise) * 100) || 0;
  const discretionaryPct = Math.round((Number(exp.discretionaryMonthlyBurn.paise) / totalSpentPaise) * 100) || 0;

  // Income stability description
  const incomeVariationText =
    inc.volatilityRating === 'HIGH' || inc.volatilityRating === 'EXTREME'
      ? 'Changes a lot from week to week'
      : inc.volatilityRating === 'MODERATE'
      ? 'Changes somewhat from week to week'
      : 'Fairly steady across weeks';

  // Major categories
  const categories = Object.values(exp.categoryBreakdown || {}).sort(
    (a, b) => Number(b.total.paise) - Number(a.total.paise)
  );

  const getCategoryFriendlyName = (cat: string) => {
    switch (cat) {
      case 'ESSENTIAL_HOUSING':
        return { name: 'Rent & Housing', icon: '🏠', type: 'Must-pay' };
      case 'ESSENTIAL_GROCERIES':
        return { name: 'Groceries & Food Staples', icon: '🛒', type: 'Must-pay' };
      case 'ESSENTIAL_UTILITIES':
        return { name: 'Electricity, Gas & Water', icon: '💡', type: 'Must-pay' };
      case 'WORK_FUEL_TRANSIT':
        return { name: 'Petrol, Diesel & Work Travel', icon: '⛽', type: 'Must-pay' };
      case 'WORK_EQUIPMENT':
        return { name: 'Work Vehicle & Equipment', icon: '🔧', type: 'Must-pay' };
      case 'DEBT_REPAYMENT':
        return { name: 'Loan & EMI Payments', icon: '💳', type: 'Must-pay' };
      case 'DISCRETIONARY':
        return { name: 'Dining Out, Snacks & Fun', icon: '🍔', type: 'Optional' };
      case 'FEES_CHARGES':
        return { name: 'Bank & Platform Fees', icon: '🏦', type: 'Optional' };
      default:
        return { name: 'Other Spending', icon: '📦', type: 'Optional' };
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Title & Add Expense Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
            Where does your money go?
          </h1>
          <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
            A clear, simple view of the money coming in and the money going out.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddExpense(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <span>➕ Add Expense</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-[#E2E8F0]/60 dark:bg-[#1A283E] rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-white dark:bg-[#111C2E] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
              : 'text-[#52657A] dark:text-[#CBD5E1]'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('in')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'in'
              ? 'bg-white dark:bg-[#111C2E] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
              : 'text-[#52657A] dark:text-[#CBD5E1]'
          }`}
        >
          Coming in
        </button>
        <button
          onClick={() => setActiveTab('out')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'out'
              ? 'bg-white dark:bg-[#111C2E] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
              : 'text-[#52657A] dark:text-[#CBD5E1]'
          }`}
        >
          Going out
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'activity'
              ? 'bg-white dark:bg-[#111C2E] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
              : 'text-[#52657A] dark:text-[#CBD5E1]'
          }`}
        >
          Activity
        </button>
      </div>

      {/* ACTIVITY TAB */}
      {activeTab === 'activity' && (
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">Recent activity</h2>
          {confirmedTransactions.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm font-semibold text-[#0F2747] dark:text-[#F8FAFC]">No activity yet.</p>
              <p className="text-xs text-[#52657A] dark:text-[#CBD5E1]">
                Add an expense or upload your financial activity to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0] dark:divide-[#26354D]">
              {[...confirmedTransactions]
                .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                .slice(0, 60)
                .map((tx) => {
                  const rupees = Math.round(Math.abs(Number(tx.amountPaise)) / 100);
                  const dateLabel = tx.date
                    ? new Date(tx.date + 'T00:00:00').toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })
                    : 'Unknown date';
                  return (
                    <div key={tx.id} className="py-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] truncate">
                          {tx.description}
                        </span>
                        <span className="text-[10px] text-[#52657A] dark:text-[#94A3B8]">{dateLabel}</span>
                      </div>
                      <span
                        className={`text-xs font-bold font-mono shrink-0 ${
                          tx.type === 'CREDIT'
                            ? 'text-[#059669] dark:text-[#34D399]'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {tx.type === 'CREDIT' ? '+' : '-'}₹{rupees.toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* OVERVIEW TAB */}
      {(activeTab === 'all' || activeTab === 'in') && (
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#059669] dark:text-[#34D399] flex items-center gap-2">
              <span>🟢</span> Money Coming In
            </h2>
            <span className="text-xs text-[#52657A] dark:text-[#94A3B8]">Monthly average</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
            <div>
              <span className="text-3xl sm:text-4xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono">
                {monthlyEarned}
              </span>
              <span className="text-xs text-[#52657A] dark:text-[#94A3B8] ml-2">/ month</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA]">
              <span>📈</span>
              <span>{incomeVariationText}</span>
            </div>
          </div>

          {/* Income note */}
          <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
            Because your income changes over time, a reliable baseline to plan your spending around is{' '}
            <strong className="text-[#0F2747] dark:text-[#F8FAFC] font-mono">
              {formatRupees(inc.conservativeBaselineMonthly.paise)}
            </strong>
            . This is what you can usually count on even in slower months.
          </p>
        </div>
      )}

      {(activeTab === 'all' || activeTab === 'out') && (
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <span>🔴</span> Money Going Out
            </h2>
            <span className="text-xs text-[#52657A] dark:text-[#94A3B8]">Monthly average</span>
          </div>

          <div className="flex items-baseline gap-2 pb-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono">
              {monthlySpent}
            </span>
            <span className="text-xs text-[#52657A] dark:text-[#94A3B8]">/ month total</span>
          </div>

          {/* Must-pay vs Optional Proportion Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-[#0F2747] dark:text-[#F8FAFC]">Must-pay ({essentialPct}%)</span>
              <span className="text-[#52657A] dark:text-[#CBD5E1]">Optional ({discretionaryPct}%)</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              <div
                style={{ width: `${Math.min(100, essentialPct)}%` }}
                className="bg-[#2563EB] h-full rounded-l-full"
                title={`Must-pay expenses: ${essentialPct}%`}
              />
              <div
                style={{ width: `${Math.min(100, discretionaryPct)}%` }}
                className="bg-amber-400 h-full rounded-r-full"
                title={`Optional spending: ${discretionaryPct}%`}
              />
            </div>
          </div>

          {/* 2 Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-[#F8FAFC] dark:bg-[#17243A] rounded-2xl p-4 border border-[#E2E8F0] dark:border-[#26354D] space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
                <span className="text-xs font-bold uppercase text-[#52657A] dark:text-[#94A3B8]">
                  Must-Pay Expenses
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono">
                {essentialOutflow}
              </div>
              <p className="text-[11px] text-[#52657A] dark:text-[#CBD5E1]">
                Rent, grocery staples, electricity, work petrol, loan payments.
              </p>
            </div>

            <div className="bg-[#F8FAFC] dark:bg-[#17243A] rounded-2xl p-4 border border-[#E2E8F0] dark:border-[#26354D] space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="text-xs font-bold uppercase text-[#52657A] dark:text-[#94A3B8]">
                  Optional Spending
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono">
                {discretionaryOutflow}
              </div>
              <p className="text-[11px] text-[#52657A] dark:text-[#CBD5E1]">
                Dining out, non-work tea/snacks, subscriptions, personal spending.
              </p>
            </div>
          </div>

          {/* Loan / Repayments if any */}
          {Number(exp.debtRepaymentsMonthly.paise) > 0 && (
            <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs space-y-1">
              <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <span>💳</span> Loan & EMI Payments: {debtOutflow} / month
              </span>
              <p className="text-amber-800/90 dark:text-amber-300">
                Loan repayments take priority alongside rent. Keeping loans under 20% of income protects you during slower weeks.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TOP SPENDING CATEGORIES */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F2747] dark:text-[#F8FAFC]">
            Top Spending Categories
          </h2>
          <Link href="/savings" className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline">
            See where to save →
          </Link>
        </div>

        <div className="divide-y divide-[#E2E8F0] dark:divide-[#26354D]">
          {categories.slice(0, 6).map((cat) => {
            const info = getCategoryFriendlyName(cat.category);
            const amountStr = formatRupees(cat.total.paise);
            return (
              <div key={cat.category} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{info.icon}</span>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC] block">
                      {info.name}
                    </span>
                    <span className="text-[10px] text-[#52657A] dark:text-[#94A3B8]">
                      {info.type} • {cat.transactionCount} transaction{cat.transactionCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs sm:text-sm font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono block">
                    {amountStr}
                  </span>
                  <span className="text-[10px] text-[#52657A] dark:text-[#94A3B8]">
                    {Math.round(cat.percentageBasisPoints / 100)}% of spent
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AddExpenseModal isOpen={showAddExpense} onClose={() => setShowAddExpense(false)} />
    </div>
  );
}
