'use client';

import React from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';

export default function QuickMoneyCheckPage() {
  const { analysisResult, profile } = useFinancialData();

  if (!analysisResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-8 sm:p-12 shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-3xl mx-auto font-bold">
            💰
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
              Quick Money Check
            </h1>
            <p className="text-sm sm:text-base text-[#52657A] dark:text-[#CBD5E1] max-w-md mx-auto leading-relaxed">
              Upload your financial activity first to see your money picture.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/upload"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#2563EB] text-white font-bold text-sm sm:text-base hover:bg-blue-600 transition-all shadow-md active:scale-95"
            >
              <span>Upload financial activity</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const inc = analysisResult.incomeAnalysis;
  const exp = analysisResult.expenseAnalysis;
  const res = analysisResult.resilienceAnalysis;
  const targetSavingsPaise = BigInt(
    analysisResult.savingsCapacity?.conservativeMonthlyReference?.paise || '0'
  );

  // Currency helper in Rupees
  const formatRupees = (paiseStr?: string | null) => {
    if (!paiseStr) return '₹0';
    const rupees = Math.round(Number(paiseStr) / 100);
    return `₹${rupees.toLocaleString('en-IN')}`;
  };

  const earnedPaise = BigInt(inc.monthlyAverage?.paise || inc.totalIncome.paise);
  const spentPaise = BigInt(exp.monthlyAverageExpenses?.paise || exp.totalExpenses.paise);
  const leftPaise = earnedPaise - spentPaise;

  const earnedDisplay = formatRupees(earnedPaise.toString());
  const spentDisplay = formatRupees(spentPaise.toString());
  const leftDisplay = formatRupees(leftPaise.toString());
  const savingsDisplay = formatRupees(targetSavingsPaise.toString());

  // Cushion
  const cushionRupees = profile.currentCashBalanceRupees
    ? `₹${Number(profile.currentCashBalanceRupees).toLocaleString('en-IN')}`
    : 'Not provided';

  // Deterministic Status:
  // 🟢 Looking okay: Left >= 0 AND runway >= 1 month
  // 🟡 Keep an eye on things: Left >= 0 but tight cushion OR runway < 1 month
  // 🔴 Your budget may be under pressure: Left < 0 (spending more than earning)
  let statusBadge = '🟢 Looking okay';
  let statusBg = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200';
  let statusExplanation = 'Your income currently covers your regular expenses with room to set aside savings.';

  if (leftPaise < 0n) {
    statusBadge = '🔴 Your budget may be under pressure';
    statusBg = 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200';
    statusExplanation = 'You are currently spending more than your average earnings. Focus on non-essential reductions and emergency buffer.';
  } else if (res.bufferCoverageDays !== null && res.bufferCoverageDays < 30) {
    statusBadge = '🟡 Keep an eye on things';
    statusBg = 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200';
    statusExplanation = 'You have a positive monthly surplus, but your liquid emergency cushion is under 1 month. Focus on building your safety fund.';
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
            Quick Money Check
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
          A 30-second overview of your financial position based on your uploaded statement.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Status Header */}
        <div className="space-y-3 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]">
            How am I doing?
          </div>
          <div className={`p-4 rounded-2xl border ${statusBg} flex items-center gap-3`}>
            <span className="text-lg sm:text-xl font-bold">{statusBadge}</span>
          </div>
          <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
            {statusExplanation}
          </p>
        </div>

        {/* 5 Numbers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] uppercase block">
              Money coming in
            </span>
            <span className="text-2xl font-extrabold font-mono text-[#0F2747] dark:text-[#F8FAFC] block">
              {earnedDisplay}
            </span>
            <span className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">Monthly average</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] uppercase block">
              Money going out
            </span>
            <span className="text-2xl font-extrabold font-mono text-[#0F2747] dark:text-[#F8FAFC] block">
              {spentDisplay}
            </span>
            <span className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">Regular expenses</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] uppercase block">
              Money left
            </span>
            <span
              className={`text-2xl font-extrabold font-mono block ${
                leftPaise >= 0n ? 'text-[#2563EB] dark:text-[#60A5FA]' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {leftDisplay}
            </span>
            <span className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">Uncommitted surplus</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] uppercase block">
              Possible savings
            </span>
            <span className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 block">
              {savingsDisplay}
            </span>
            <span className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">Found in review</span>
          </div>

          <div className="sm:col-span-2 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase block">
                Safety cushion
              </span>
              <Link href="/profile" className="text-xs text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline">
                Update in Profile →
              </Link>
            </div>
            <span className="text-2xl font-extrabold font-mono text-[#0F2747] dark:text-[#F8FAFC] block">
              {cushionRupees}
            </span>
            <span className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">
              Emergency cash available ({res.bufferCoverageDays !== null ? `${(res.bufferCoverageDays / 30).toFixed(1)} mo runway` : 'add in Profile'})
            </span>
          </div>
        </div>

        {/* Quick Navigation Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/my-money"
            className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline"
          >
            See where your money is going →
          </Link>
          <Link
            href="/can-i-spend"
            className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-xs"
          >
            Can I spend this? →
          </Link>
        </div>
      </div>
    </div>
  );
}
