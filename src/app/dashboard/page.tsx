'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import ExportPlanButton from '@/components/ExportPlanButton';
import QuickMoneyCheckModal from '@/components/QuickMoneyCheckModal';
import CanISpendThisModal from '@/components/CanISpendThisModal';
import AddExpenseModal from '@/components/AddExpenseModal';

export default function DashboardPage() {
  const { analysisResult, addConfirmedExpense } = useFinancialData();

  const [showQuickCheck, setShowQuickCheck] = useState(false);
  const [showCanISpend, setShowCanISpend] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  if (!analysisResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-8 sm:p-12 shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-3xl mx-auto font-bold shadow-inner">
            🛡️
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
              Your money picture starts here.
            </h1>
            <p className="text-sm sm:text-base text-[#52657A] dark:text-[#CBD5E1] max-w-md mx-auto leading-relaxed">
              Upload a bank statement or GPay screenshots to get your personalized resilience plan.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/upload"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#2563EB] text-white font-bold text-sm sm:text-base hover:bg-blue-600 transition-all shadow-md active:scale-95"
            >
              <span>Upload statement</span>
              <span>→</span>
            </Link>
            <button
              type="button"
              onClick={() => setShowAddExpense(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#17243A] text-xs sm:text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span>➕ Add an expense</span>
            </button>
            <Link
              href="/profile"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#17243A] text-xs sm:text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span>Set up profile</span>
            </Link>
          </div>

          <div className="pt-6 border-t border-[#D7E7F5] dark:border-[#2A3B52] flex flex-wrap items-center justify-center gap-6 text-xs text-[#52657A] dark:text-[#94A3B8]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              GPay / UPI screenshots
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              PDF statement
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              CSV file
            </span>
          </div>
        </div>

        {/* Modal Modals (even if empty, they will show upload guidance) */}
        <QuickMoneyCheckModal isOpen={showQuickCheck} onClose={() => setShowQuickCheck(false)} />
        <CanISpendThisModal isOpen={showCanISpend} onClose={() => setShowCanISpend(false)} />
        <AddExpenseModal isOpen={showAddExpense} onClose={() => setShowAddExpense(false)} />
      </div>
    );
  }

  const inc = analysisResult.incomeAnalysis;
  const exp = analysisResult.expenseAnalysis;
  const res = analysisResult.resilienceAnalysis;
  const quality = analysisResult.dataQuality;

  // Currency helper in Rupees
  const formatRupees = (paiseStr?: string | null) => {
    if (!paiseStr) return '₹0';
    const rupees = Math.round(Number(paiseStr) / 100);
    return `₹${rupees.toLocaleString('en-IN')}`;
  };

  // 1. YOUR MONEY NUMBERS
  const earnedPaise = BigInt(inc.monthlyAverage?.paise || inc.totalIncome.paise);
  const spentPaise = BigInt(exp.monthlyAverageExpenses?.paise || exp.totalExpenses.paise);
  const leftPaise = earnedPaise - spentPaise;

  const earnedDisplay = formatRupees(earnedPaise.toString());
  const spentDisplay = formatRupees(spentPaise.toString());
  const leftDisplay = formatRupees(leftPaise.toString());
  const isSurplusPositive = leftPaise >= 0n;

  // 2. DETERMINISTIC STATUS: "How are you doing?"
  type StatusType = {
    badge: string;
    label: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    explanation: string;
  };

  let status: StatusType;

  if (leftPaise < 0n || res.coverageStatus === 'CRITICAL') {
    status = {
      badge: '🔴',
      label: 'Needs action',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      textColor: 'text-rose-700 dark:text-rose-300',
      borderColor: 'border-rose-200 dark:border-rose-800',
      explanation:
        'Your spending is currently higher than your earnings, leaving a deficit. Checking optional spending can help restore balance.',
    };
  } else if (
    inc.volatilityRating === 'HIGH' ||
    inc.volatilityRating === 'EXTREME' ||
    (res.bufferCoverageDays !== null && res.bufferCoverageDays < 14) ||
    leftPaise < (earnedPaise * 12n) / 100n
  ) {
    status = {
      badge: '🟡',
      label: 'Needs attention',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      textColor: 'text-amber-800 dark:text-amber-300',
      borderColor: 'border-amber-200 dark:border-amber-800',
      explanation:
        inc.volatilityRating === 'HIGH' || inc.volatilityRating === 'EXTREME'
          ? 'Your income is covering your regular expenses, but your income changes quite a bit from month to month.'
          : 'You have a tight cushion after paying regular expenses. A small safety cushion will give you breathing room.',
    };
  } else {
    status = {
      badge: '🟢',
      label: 'Looking okay',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      textColor: 'text-emerald-800 dark:text-emerald-300',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      explanation:
        'Your earnings comfortably cover your regular must-pay expenses, leaving money available to build your safety cushion.',
    };
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* 1. Friendly Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-semibold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider">
            FlexiFund AI
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
            Hi! Let’s make your money work better.
          </h1>
        </div>
        <ExportPlanButton />
      </div>

      {/* 2. YOUR MONEY Card with Prominent Quick Money Check (Requirement 1 & 17) */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]">
            Your Money
          </h2>
          <button
            type="button"
            onClick={() => setShowQuickCheck(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#2563EB] dark:text-[#60A5FA] font-bold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <span>⚡ Quick Money Check</span>
          </button>
        </div>

        {/* 3 Main Numbers: Earned / Spent / Left */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
          <div className="bg-[#F8FAFC] dark:bg-[#17243A] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] dark:border-[#26354D]">
            <span className="text-xs sm:text-sm font-medium text-[#52657A] dark:text-[#94A3B8] block mb-1">
              Earned
            </span>
            <span className="text-xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono block">
              {earnedDisplay}
            </span>
            <span className="text-[10px] sm:text-xs text-[#52657A] dark:text-[#94A3B8] mt-1 block">
              per month avg
            </span>
          </div>

          <div className="bg-[#F8FAFC] dark:bg-[#17243A] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] dark:border-[#26354D]">
            <span className="text-xs sm:text-sm font-medium text-[#52657A] dark:text-[#94A3B8] block mb-1">
              Spent
            </span>
            <span className="text-xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono block">
              {spentDisplay}
            </span>
            <span className="text-[10px] sm:text-xs text-[#52657A] dark:text-[#94A3B8] mt-1 block">
              per month avg
            </span>
          </div>

          <div
            className={`rounded-2xl p-4 sm:p-5 border ${
              isSurplusPositive
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
            }`}
          >
            <span className="text-xs sm:text-sm font-medium text-[#52657A] dark:text-[#94A3B8] block mb-1">
              {isSurplusPositive ? 'Left' : 'Deficit'}
            </span>
            <span
              className={`text-xl sm:text-3xl font-extrabold font-mono block ${
                isSurplusPositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
              }`}
            >
              {isSurplusPositive ? leftDisplay : `-₹${Math.abs(Math.round(Number(leftPaise) / 100)).toLocaleString('en-IN')}`}
            </span>
            <span className="text-[10px] sm:text-xs text-[#52657A] dark:text-[#94A3B8] mt-1 block">
              {isSurplusPositive ? 'uncommitted' : 'shortfall'}
            </span>
          </div>
        </div>

        {/* How are you doing? Status Banner with Clickable Quick Check */}
        <div className={`rounded-2xl p-4 sm:p-5 border ${status.bgColor} ${status.borderColor} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base">{status.badge}</span>
              <span className={`text-sm sm:text-base font-extrabold ${status.textColor}`}>
                {status.label}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#334155] dark:text-[#CBD5E1] leading-relaxed">
              {status.explanation}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowQuickCheck(true)}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 transition-colors shrink-0 shadow-2xs"
          >
            Check health →
          </button>
        </div>
      </div>

      {/* 3. WHAT WOULD YOU LIKE TO DO? (Requirement 16) */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]">
          What would you like to do?
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Action 1: Quick Money Check */}
          <Link
            href="/quick-check"
            className="group text-left bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] hover:border-[#2563EB] dark:hover:border-[#60A5FA] rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all active:scale-[0.99] flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💰</span>
                <span className="text-base sm:text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC] group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors">
                  Quick Money Check
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                See how you&apos;re doing in 30 seconds with your saving target and safety cushion.
              </p>
            </div>
            <div className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] flex items-center gap-1 pt-2">
              <span>See how you&apos;re doing</span>
              <span>→</span>
            </div>
          </Link>

          {/* Action 2: Add Expense (Unified: Voice / Receipt / Manual) */}
          <Link
            href="/add-expense"
            className="group text-left bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] hover:border-[#2563EB] dark:hover:border-[#60A5FA] rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all active:scale-[0.99] flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">➕</span>
                <span className="text-base sm:text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC] group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors">
                  Add an Expense
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                Voice, receipt or type. Log what you spent in seconds.
              </p>
            </div>
            <div className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] flex items-center gap-1 pt-2">
              <span>Voice, receipt or type</span>
              <span>→</span>
            </div>
          </Link>

          {/* Action 3: Can I Spend This? */}
          <Link
            href="/can-i-spend"
            className="group text-left bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] hover:border-[#2563EB] dark:hover:border-[#60A5FA] rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all active:scale-[0.99] flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💳</span>
                <span className="text-base sm:text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC] group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors">
                  Can I Spend This?
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                Check a purchase before you make it to see how it affects your buffer and saving target.
              </p>
            </div>
            <div className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] flex items-center gap-1 pt-2">
              <span>Check a purchase</span>
              <span>→</span>
            </div>
          </Link>

          {/* Action 4: What If I Earn Less? */}
          <Link
            href="/plan-ahead"
            className="group bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] hover:border-[#2563EB] dark:hover:border-[#60A5FA] rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all active:scale-[0.99] flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📉</span>
                <span className="text-base sm:text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC] group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors">
                  What If I Earn Less?
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                Plan for a lower-income month. Slide to test what happens if earnings drop.
              </p>
            </div>
            <div className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] flex items-center gap-1 pt-2">
              <span>Plan for lower income</span>
              <span>→</span>
            </div>
          </Link>
        </div>
      </div>

      {/* 4. Bottom Support & Export Ribbon */}
      <div className="bg-[#F8FAFC] dark:bg-[#17243A] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] dark:border-[#26354D] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#52657A] dark:text-[#94A3B8]">
        <div className="flex items-center gap-2">
          <span>📄 Based on your uploaded statement ({quality.observedMonths} month records)</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/export" className="font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline">
            Download Financial Plan (PDF) →
          </Link>
          <Link href="/upload" className="font-medium hover:underline text-[#52657A] dark:text-[#CBD5E1]">
            Upload new statement
          </Link>
        </div>
      </div>

      {/* Modals for 5 Simple Features */}
      <QuickMoneyCheckModal isOpen={showQuickCheck} onClose={() => setShowQuickCheck(false)} />
      <CanISpendThisModal
        isOpen={showCanISpend}
        onClose={() => setShowCanISpend(false)}
        onAddAsExpense={(exp) => addConfirmedExpense(exp)}
      />
      <AddExpenseModal isOpen={showAddExpense} onClose={() => setShowAddExpense(false)} />
    </div>
  );
}
