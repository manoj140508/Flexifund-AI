'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/context/FinancialDataContext';

interface QuickMoneyCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickMoneyCheckModal({ isOpen, onClose }: QuickMoneyCheckModalProps) {
  const router = useRouter();
  const { analysisResult, profile } = useFinancialData();

  if (!isOpen) return null;

  // Currency helper in Rupees
  const formatRupees = (paiseStr?: string | null) => {
    if (!paiseStr) return '₹0';
    const rupees = Math.round(Number(paiseStr) / 100);
    return `₹${rupees.toLocaleString('en-IN')}`;
  };

  // If no financial data exists yet (Requirement 14)
  if (!analysisResult) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-check-title"
      >
        <div
          className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-2xl mx-auto">
            💰
          </div>
          <div className="space-y-2">
            <h2 id="quick-check-title" className="text-xl sm:text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC]">
              Quick Money Check
            </h2>
            <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
              Upload your statement to see your money picture in 30 seconds.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/upload"
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-[#2563EB] text-white font-bold text-xs sm:text-sm hover:bg-blue-600 transition-colors shadow-sm"
            >
              Upload statement →
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inc = analysisResult.incomeAnalysis;
  const exp = analysisResult.expenseAnalysis;
  const res = analysisResult.resilienceAnalysis;
  const sav = analysisResult.savingsCapacity;
  const actions = analysisResult.prioritizedActions || [];

  const earnedPaise = BigInt(inc.monthlyAverage?.paise || inc.totalIncome.paise);
  const spentPaise = BigInt(exp.monthlyAverageExpenses?.paise || exp.totalExpenses.paise);
  const leftPaise = earnedPaise - spentPaise;

  const earnedDisplay = formatRupees(earnedPaise.toString());
  const spentDisplay = formatRupees(spentPaise.toString());
  const leftDisplay = formatRupees(leftPaise.toString());
  const isSurplusPositive = leftPaise >= 0n;

  // Status mapping
  let statusBadge = '🟢';
  let statusLabel = 'Looking okay';
  let statusColor = 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
  let statusExplanation = 'Your regular expenses are currently covered, but keeping a small buffer helps smooth out changing income.';

  if (leftPaise < 0n || res.coverageStatus === 'CRITICAL') {
    statusBadge = '🔴';
    statusLabel = 'You may need to adjust';
    statusColor = 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800';
    statusExplanation = 'Your spending is currently running ahead of your earnings. Checking optional spending can restore balance.';
  } else if (
    inc.volatilityRating === 'HIGH' ||
    inc.volatilityRating === 'EXTREME' ||
    (res.bufferCoverageDays !== null && res.bufferCoverageDays < 14) ||
    leftPaise < (earnedPaise * 12n) / 100n
  ) {
    statusBadge = '🟡';
    statusLabel = 'Keep an eye on things';
    statusColor = 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
    statusExplanation =
      inc.volatilityRating === 'HIGH' || inc.volatilityRating === 'EXTREME'
        ? 'Your regular expenses are covered, but your income changes from month to month.'
        : 'You have a tight cushion after paying regular expenses. A small safety cushion will give you breathing room.';
  }

  // Saving Target
  const targetPaise = sav.conservativeMonthlyReference?.paise || (leftPaise > 0n ? ((leftPaise * 50n) / 100n).toString() : '0');
  const savingTargetDisplay = formatRupees(targetPaise);

  // Safety Cushion (Requirement 15: ONLY show current cash if explicitly provided!)
  const hasUserEnteredCash = Boolean(profile.currentCashBalanceRupees && Number(profile.currentCashBalanceRupees) > 0);
  const userCashDisplay = hasUserEnteredCash
    ? `₹${Number(profile.currentCashBalanceRupees).toLocaleString('en-IN')}`
    : null;

  const target30DayCushionRupees = Math.round((Number(exp.dailyEssentialBurnRate.paise) / 100) * 30);
  const targetCushionDisplay = `₹${target30DayCushionRupees.toLocaleString('en-IN')}`;

  // One Thing To Do Today
  let oneThingToDo = 'Try setting aside ₹500 from your next good earning day.';
  if (actions.length > 0 && actions[0].title) {
    oneThingToDo = `${actions[0].title}: ${actions[0].description}`;
  } else if (!isSurplusPositive) {
    oneThingToDo = 'Protect your must-pay expenses first by holding off on non-essential purchases this week.';
  } else if (targetPaise !== '0') {
    oneThingToDo = `Aim to tuck away ${savingTargetDisplay} into a separate account when earnings arrive.`;
  }

  const handleSeePlan = () => {
    onClose();
    router.push('/action-plan');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-check-title"
    >
      <div
        className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">💰</span>
            <div>
              <h2 id="quick-check-title" className="text-xl sm:text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC]">
                Quick Money Check
              </h2>
              <p className="text-xs text-[#52657A] dark:text-[#94A3B8]">
                Your 30-second financial health checkup
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 1. In / Out / Left Snapshot */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
          <div className="p-3 sm:p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#17243A] border border-[#E2E8F0] dark:border-[#26354D]">
            <span className="text-[11px] font-bold text-[#52657A] dark:text-[#94A3B8] block uppercase">
              Money In
            </span>
            <span className="text-base sm:text-xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono block mt-0.5">
              {earnedDisplay}
            </span>
          </div>
          <div className="p-3 sm:p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#17243A] border border-[#E2E8F0] dark:border-[#26354D]">
            <span className="text-[11px] font-bold text-[#52657A] dark:text-[#94A3B8] block uppercase">
              Money Out
            </span>
            <span className="text-base sm:text-xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono block mt-0.5">
              {spentDisplay}
            </span>
          </div>
          <div
            className={`p-3 sm:p-4 rounded-2xl border ${
              isSurplusPositive
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
            }`}
          >
            <span className="text-[11px] font-bold text-[#52657A] dark:text-[#94A3B8] block uppercase">
              {isSurplusPositive ? 'Money Left' : 'Shortfall'}
            </span>
            <span
              className={`text-base sm:text-xl font-extrabold font-mono block mt-0.5 ${
                isSurplusPositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
              }`}
            >
              {isSurplusPositive ? leftDisplay : `-₹${Math.abs(Math.round(Number(leftPaise) / 100)).toLocaleString('en-IN')}`}
            </span>
          </div>
        </div>

        {/* 2. HOW ARE YOU DOING? */}
        <div className={`p-4 rounded-2xl border ${statusColor} space-y-1.5`}>
          <div className="flex items-center gap-2">
            <span className="text-base">{statusBadge}</span>
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
              {statusLabel}
            </span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed opacity-95">
            {statusExplanation}
          </p>
        </div>

        {/* 3. Targets & Cushion */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-[#E2E8F0] dark:border-[#26354D] space-y-1">
            <span className="text-[11px] font-bold uppercase text-[#52657A] dark:text-[#94A3B8] block">
              Your Saving Target
            </span>
            <span className="text-lg font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono block">
              {savingTargetDisplay}/month
            </span>
            <span className="text-[11px] text-[#52657A] dark:text-[#94A3B8] block">
              Realistic pace for your income
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-[#E2E8F0] dark:border-[#26354D] space-y-1">
            <span className="text-[11px] font-bold uppercase text-[#52657A] dark:text-[#94A3B8] block">
              Your Safety Cushion
            </span>
            {hasUserEnteredCash ? (
              <>
                <span className="text-lg font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono block">
                  {userCashDisplay}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-medium">
                  {res.bufferCoverageDays !== null ? `Covers ~${res.bufferCoverageDays} days of essentials` : 'Available cash reported'}
                </span>
              </>
            ) : (
              <>
                <span className="text-lg font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono block">
                  {targetCushionDisplay}
                </span>
                <span className="text-[11px] text-[#52657A] dark:text-[#94A3B8] block">
                  30-day starter target (no cash reported yet)
                </span>
              </>
            )}
          </div>
        </div>

        {/* 4. ONE THING TO DO TODAY */}
        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider">
            <span>🎯</span>
            <span>One Thing To Do Today</span>
          </div>
          <p className="text-xs sm:text-sm text-[#0F2747] dark:text-[#F8FAFC] font-medium leading-relaxed">
            {oneThingToDo}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleSeePlan}
            className="w-full sm:flex-1 py-3.5 rounded-xl bg-[#2563EB] text-white font-bold text-xs sm:text-sm hover:bg-blue-600 transition-colors shadow-md text-center"
          >
            See my plan →
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-center"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
