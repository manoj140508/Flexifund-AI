'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';

export default function CanISpendThisPage() {
  const { analysisResult } = useFinancialData();

  const [amountStr, setAmountStr] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');

  if (!analysisResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-8 sm:p-12 shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-3xl mx-auto font-bold">
            💳
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
              Can I Spend This?
            </h1>
            <p className="text-sm sm:text-base text-[#52657A] dark:text-[#CBD5E1] max-w-md mx-auto leading-relaxed">
              Upload your financial activity first so we can compare this purchase to your real income and savings room.
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
  const targetMonthlySavingsPaise = BigInt(
    analysisResult.savingsCapacity?.conservativeMonthlyReference?.paise || '0'
  );

  const earnedPaise = BigInt(inc.monthlyAverage?.paise || inc.totalIncome.paise);
  const spentPaise = BigInt(exp.monthlyAverageExpenses?.paise || exp.totalExpenses.paise);
  const currentSurplusPaise = earnedPaise - spentPaise;

  const cleanNum = Number(amountStr.trim().replace(/,/g, ''));
  const isValidAmount = !isNaN(cleanNum) && cleanNum > 0 && isFinite(cleanNum);
  const expensePaise = isValidAmount ? BigInt(Math.round(cleanNum * 100)) : 0n;

  // Real data calculations
  const remainingSurplusPaise = currentSurplusPaise - expensePaise;
  const surplusDiffFromTarget = remainingSurplusPaise - targetMonthlySavingsPaise;

  // Deterministic Verdict:
  // 🟢 Looks affordable: remaining surplus >= target saving AND >= 0
  // 🟡 Think about it: remaining surplus >= 0 but cuts into target saving
  // 🔴 May put pressure on your budget: remaining surplus < 0 (pushes month into deficit)
  let statusBadge = '🟢 Looks affordable';
  let statusBg = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200';
  let explanation = 'Based on the information you’ve provided, you have sufficient monthly room after covering your regular expenses and your saving target.';

  if (!isValidAmount) {
    statusBadge = 'Enter an amount below';
    statusBg = 'bg-slate-50 dark:bg-[#17243A] border-slate-200 dark:border-slate-700 text-[#52657A] dark:text-[#94A3B8]';
    explanation = 'Type an amount to check how it compares to your real monthly room and saving target.';
  } else if (remainingSurplusPaise < 0n) {
    statusBadge = '🔴 May put pressure on your budget';
    statusBg = 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200';
    explanation = 'Based on the information you’ve provided, this purchase exceeds your available monthly surplus and could push your month into a deficit.';
  } else if (surplusDiffFromTarget < 0n) {
    statusBadge = '🟡 Think about it';
    statusBg = 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200';
    explanation = 'Based on the information you’ve provided, this purchase fits within your surplus, but it will reduce the amount you can set aside for your saving target this month.';
  }

  const formatRupees = (paise: bigint) => {
    const rupees = Math.round(Number(paise) / 100);
    return `₹${rupees.toLocaleString('en-IN')}`;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💳</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
            Can I Spend This?
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
          Check how a purchase could affect your money before you spend.
        </p>
      </div>

      {/* Main Input Card */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="spend-amount"
              className="block text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]"
            >
              How much do you want to spend?
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                ₹
              </span>
              <input
                id="spend-amount"
                type="number"
                min="1"
                step="10"
                autoFocus
                placeholder="2,500"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-9 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-slate-200 dark:border-slate-700 text-lg font-extrabold font-mono text-[#0F2747] dark:text-[#F8FAFC] outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="spend-purpose"
              className="block text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]"
            >
              What is it for? <span className="text-slate-400 normal-case font-normal">(optional)</span>
            </label>
            <input
              id="spend-purpose"
              type="text"
              placeholder="e.g. Phone repair, new tyres, family gift"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#17243A] border border-slate-200 dark:border-slate-700 text-sm font-medium text-[#0F2747] dark:text-[#F8FAFC] outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
            />
          </div>
        </div>

        {/* Verdict Box */}
        <div className={`p-5 rounded-2xl border ${statusBg} space-y-2`}>
          <div className="text-base sm:text-lg font-bold">
            {statusBadge}
          </div>
          <p className="text-xs sm:text-sm leading-relaxed">
            {explanation}
          </p>
        </div>

        {/* Calculations / Impact */}
        {isValidAmount && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] uppercase block">
                Money left after purchase
              </span>
              <span
                className={`text-xl font-extrabold font-mono block ${
                  remainingSurplusPaise >= 0n ? 'text-[#2563EB] dark:text-[#60A5FA]' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatRupees(remainingSurplusPaise)}
              </span>
              <span className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">
                Remaining monthly surplus
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] uppercase block">
                Saving target impact
              </span>
              <span className="text-xl font-extrabold font-mono text-[#0F2747] dark:text-[#F8FAFC] block">
                {surplusDiffFromTarget >= 0n ? '✓ Protected' : `-${formatRupees(-surplusDiffFromTarget)}`}
              </span>
              <span className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">
                Suggested monthly target: {formatRupees(targetMonthlySavingsPaise)}
              </span>
            </div>
          </div>
        )}

        {/* Caution Notice */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-[#52657A] dark:text-[#94A3B8] leading-relaxed">
          💡 <strong>Notice:</strong> This is a deterministic planning aid based strictly on the financial activity you provided. It is not financial advice or credit approval.
        </div>
      </div>
    </div>
  );
}
