'use client';

import React from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import { useAuth } from '@/context/AuthContext';
import ExportPlanButton from '@/components/ExportPlanButton';
import { useGoals, GOAL_TYPE_LABELS } from '@/lib/use-goals';

export default function MyPlanPage() {
  const { analysisResult, profile } = useFinancialData();
  const { user } = useAuth();
  const { primaryGoal } = useGoals(user?.id);

  if (!analysisResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-8 sm:p-12 shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-3xl mx-auto font-bold">
            📄
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
              My Financial Plan
            </h1>
            <p className="text-sm sm:text-base text-[#52657A] dark:text-[#CBD5E1] max-w-md mx-auto leading-relaxed">
              Upload your financial activity to generate your personalized 6-point financial resilience plan.
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
  const targetMonthlySavingsPaise = BigInt(
    analysisResult.savingsCapacity?.conservativeMonthlyReference?.paise || '0'
  );
  const topOpportunities = analysisResult.savingsOpportunities?.slice(0, 3) || [];
  const potentialSavingsPaise = (analysisResult.savingsOpportunities || []).reduce(
    (acc, op) => acc + BigInt(op.potentialMonthlySaving?.paise || '0'),
    0n
  );

  // Currency helper
  const formatRupees = (paiseStr?: string | null) => {
    if (!paiseStr) return '₹0';
    const rupees = Math.round(Number(paiseStr) / 100);
    return `₹${rupees.toLocaleString('en-IN')}`;
  };

  const earnedPaise = BigInt(inc.monthlyAverage?.paise || inc.totalIncome.paise);
  const spentPaise = BigInt(exp.monthlyAverageExpenses?.paise || exp.totalExpenses.paise);
  const leftPaise = earnedPaise - spentPaise;

  // Cushion
  const cushionRupees = profile.currentCashBalanceRupees
    ? `₹${Number(profile.currentCashBalanceRupees).toLocaleString('en-IN')}`
    : 'Not provided';

  // Status
  let statusBadge = '🟢 Looking okay';
  let statusSummary = 'Your income covers your regular expenses with surplus room.';
  if (leftPaise < 0n) {
    statusBadge = '🔴 Budget under pressure';
    statusSummary = 'You are currently spending more than your monthly earnings.';
  } else if (res.bufferCoverageDays !== null && res.bufferCoverageDays < 30) {
    statusBadge = '🟡 Keep an eye on things';
    statusSummary = 'Positive surplus, but liquid safety cushion is under 1 month.';
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📄</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
              My Financial Plan
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
            A simple, human-friendly summary of your personalized financial roadmap.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportPlanButton variant="primary" size="md" />
        </div>
      </div>

      {/* Main 6-Section Plan */}
      <div className="space-y-6">
        {/* ============================================================ */}
        {/* 1. HOW I'M DOING */}
        {/* ============================================================ */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-extrabold text-xs">
                1
              </span>
              <h2 className="text-base sm:text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                How I&apos;m doing
              </h2>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[#0F2747] dark:text-[#F8FAFC]">
              {statusBadge}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-[#52657A] dark:text-[#94A3B8] uppercase block">
                Money coming in
              </span>
              <span className="text-lg font-bold font-mono text-[#0F2747] dark:text-[#F8FAFC]">
                {formatRupees(earnedPaise.toString())}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-[#52657A] dark:text-[#94A3B8] uppercase block">
                Money going out
              </span>
              <span className="text-lg font-bold font-mono text-[#0F2747] dark:text-[#F8FAFC]">
                {formatRupees(spentPaise.toString())}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-[#52657A] dark:text-[#94A3B8] uppercase block">
                Money left
              </span>
              <span
                className={`text-lg font-bold font-mono ${
                  leftPaise >= 0n ? 'text-[#2563EB] dark:text-[#60A5FA]' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatRupees(leftPaise.toString())}
              </span>
            </div>
          </div>
          <p className="text-xs text-[#52657A] dark:text-[#CBD5E1]">
            {statusSummary}
          </p>
        </div>

        {/* ============================================================ */}
        {/* 2. WHERE I CAN SAVE */}
        {/* ============================================================ */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-extrabold text-xs">
                2
              </span>
              <h2 className="text-base sm:text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                Where I can save
              </h2>
            </div>
            <Link href="/savings" className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline">
              View all savings →
            </Link>
          </div>

          {potentialSavingsPaise > 0n && (
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 px-3.5 py-2 rounded-xl">
              Total identified potential savings: ~{formatRupees(potentialSavingsPaise.toString())}/month
            </div>
          )}

          {topOpportunities.length > 0 ? (
            <div className="space-y-2.5">
              {topOpportunities.map((op) => (
                <div
                  key={op.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <span className="text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] block">
                      {op.title}
                    </span>
                    <span className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">
                      {op.recommendedAction || op.description}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    Potential saving: ~{formatRupees(op.potentialMonthlySaving?.paise)}/mo
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#52657A] dark:text-[#CBD5E1]">
              Your spending is already fairly consolidated with minimal recurring leakage.
            </p>
          )}
        </div>

        {/* ============================================================ */}
        {/* 3. MY SAVING TARGET */}
        {/* ============================================================ */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-extrabold text-xs">
              3
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              My saving target
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
            <div>
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                Suggested monthly target
              </span>
              <span className="text-2xl font-mono font-extrabold text-emerald-700 dark:text-emerald-400 block">
                {formatRupees(targetMonthlySavingsPaise.toString())}
              </span>
            </div>
            <p className="text-xs text-[#52657A] dark:text-[#CBD5E1] max-w-sm">
              A sustainable target derived from your cash flow. Saving this amount helps protect you against slow earning weeks.
            </p>
          </div>

          {/* Active goal cross-reference */}
          {primaryGoal && (
            <div className="p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span>{GOAL_TYPE_LABELS[primaryGoal.type].icon}</span>
                <p className="text-xs text-[#52657A] dark:text-[#CBD5E1]">
                  <span className="font-semibold text-[#0F2747] dark:text-[#F8FAFC]">Your current goal:</span>{' '}
                  {primaryGoal.label} — ₹{primaryGoal.targetRupees.toLocaleString('en-IN')}
                </p>
              </div>
              <Link href="/my-goals" className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline shrink-0">
                Track progress →
              </Link>
            </div>
          )}

          {!primaryGoal && (
            <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0F1A2A] border border-[#E2E8F0] dark:border-[#26354D] text-xs text-[#52657A] dark:text-[#94A3B8]">
              Set a saving goal in{' '}
              <Link href="/my-goals" className="font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline">
                My Goals
              </Link>{' '}
              to track what you are working towards.
            </div>
          )}
        </div>


        {/* ============================================================ */}
        {/* 4. MY SAFETY CUSHION */}
        {/* ============================================================ */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-extrabold text-xs">
                4
              </span>
              <h2 className="text-base sm:text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                My safety cushion
              </h2>
            </div>
            <Link href="/profile" className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline">
              Update in Profile →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-[#52657A] dark:text-[#94A3B8] uppercase block">
                Current available cash
              </span>
              <span className="text-xl font-bold font-mono text-[#0F2747] dark:text-[#F8FAFC]">
                {cushionRupees}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-[#52657A] dark:text-[#94A3B8] uppercase block">
                Emergency runway
              </span>
              <span className="text-xl font-bold font-mono text-[#2563EB] dark:text-[#60A5FA]">
                {res.bufferCoverageDays !== null
                  ? `${(res.bufferCoverageDays / 30).toFixed(1)} months (${res.bufferCoverageDays} days)`
                  : 'Add in Profile'}
              </span>
            </div>
          </div>
          <p className="text-xs text-[#52657A] dark:text-[#CBD5E1]">
            Aim for at least 1.5 to 3.0 months of essential expenses in your liquid safety cushion.
          </p>
        </div>

        {/* ============================================================ */}
        {/* 5. WHAT HAPPENS IF MY INCOME FALLS */}
        {/* ============================================================ */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-extrabold text-xs">
                5
              </span>
              <h2 className="text-base sm:text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                What happens if my income falls
              </h2>
            </div>
            <Link href="/plan-ahead" className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline">
              Try interactive slider →
            </Link>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 space-y-2">
            <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] block">
              Under a 20% income reduction:
            </span>
            <p className="text-xs text-[#0F2747] dark:text-[#F8FAFC] leading-relaxed">
              If your earnings drop by 20%, your monthly revenue would be{' '}
              <strong>{formatRupees(((earnedPaise * 80n) / 100n).toString())}</strong>. Your net monthly cushion would adjust to{' '}
              <strong>{formatRupees(((earnedPaise * 80n) / 100n - spentPaise).toString())}</strong>.
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 6. MY NEXT 3 STEPS */}
        {/* ============================================================ */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-extrabold text-xs">
              6
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              My next 3 steps
            </h2>
          </div>

          <div className="space-y-2.5">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-slate-100 dark:border-slate-800 flex items-start gap-3">
              <span className="text-sm font-bold text-[#2563EB] dark:text-[#60A5FA]">1.</span>
              <div>
                <span className="text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] block">
                  Set aside {formatRupees(targetMonthlySavingsPaise.toString())} this month
                </span>
                <span className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">
                  Transfer small increments right after your payouts to build your emergency runway.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-slate-100 dark:border-slate-800 flex items-start gap-3">
              <span className="text-sm font-bold text-[#2563EB] dark:text-[#60A5FA]">2.</span>
              <div>
                <span className="text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] block">
                  Check your purchase affordability before spending
                </span>
                <span className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">
                  Use the &quot;Can I Spend This?&quot; tool whenever considering discretionary purchases over ₹500.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-slate-100 dark:border-slate-800 flex items-start gap-3">
              <span className="text-sm font-bold text-[#2563EB] dark:text-[#60A5FA]">3.</span>
              <div>
                <span className="text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] block">
                  Register for matched government support schemes
                </span>
                <span className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">
                  Visit the Support section to review free accident and pension benefits (e.g. e-Shram, PM-SYM).
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
