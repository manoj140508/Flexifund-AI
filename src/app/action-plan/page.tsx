'use client';

import React from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import ExportPlanButton from '@/components/ExportPlanButton';

export default function ActionPlanPage() {
  const { analysisResult } = useFinancialData();

  if (!analysisResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-8 sm:p-12 shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-3xl mx-auto font-bold">
            🎯
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC]">
              Your next steps
            </h1>
            <p className="text-sm text-[#52657A] dark:text-[#CBD5E1]">
              Upload your statement to get 3 personalized steps to keep your money safe.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#2563EB] text-white font-bold text-sm hover:bg-blue-600 transition-colors shadow-sm"
            >
              <span>Upload statement →</span>
            </Link>
            <ExportPlanButton variant="subtle" />
          </div>
        </div>
      </div>
    );
  }

  const exp = analysisResult.expenseAnalysis;
  const capacity = analysisResult.savingsCapacity;
  const opportunities = analysisResult.savingsOpportunities || [];

  const formatRupees = (paiseStr?: string | null | number) => {
    if (!paiseStr) return '₹0';
    const num = typeof paiseStr === 'number' ? paiseStr : Math.round(Number(paiseStr) / 100);
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const starterTarget = formatRupees(capacity.conservativeMonthlyReference.paise);
  const dailyBurn = Math.max(1, Math.round(Number(exp.dailyEssentialBurnRate.paise) / 100));
  const target30Days = formatRupees(dailyBurn * 30);

  const totalPotentialPaise = opportunities.reduce(
    (acc, opp) => acc + BigInt(opp.potentialMonthlySaving?.paise || '0'),
    0n
  );
  const totalPotentialDisplay = formatRupees(totalPotentialPaise.toString());

  const topOpp = opportunities[0];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
            Your Next 3 Steps
          </h1>
          <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
            Simple, realistic things you can do right now to protect your earnings.
          </p>
        </div>
        <ExportPlanButton />
      </div>

      {/* 3 Step Cards */}
      <div className="space-y-4">
        {/* Step 1: Set aside money */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-extrabold text-sm">
              1
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#0F2747] dark:text-[#F8FAFC] flex items-center gap-2">
              <span>💰</span> Set aside {starterTarget} when you can
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8] block">
                WHAT TO DO
              </span>
              <p className="text-xs sm:text-sm text-[#0F2747] dark:text-[#CBD5E1]">
                Move a small amount into a separate bank account or liquid fund during your better earning weeks.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8] block">
                WHY
              </span>
              <p className="text-xs sm:text-sm text-[#0F2747] dark:text-[#CBD5E1]">
                Your income changes from month to month. A small buffer prevents needing high-interest loans.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8] block">
                POSSIBLE IMPACT
              </span>
              <p className="text-xs sm:text-sm font-semibold text-[#059669] dark:text-[#34D399]">
                Cushions you for slow weeks without stress.
              </p>
            </div>
          </div>
        </div>

        {/* Step 2: Review spending */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-extrabold text-sm">
              2
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#0F2747] dark:text-[#F8FAFC] flex items-center gap-2">
              <span>🔍</span> Review your {topOpp ? topOpp.title.toLowerCase() : 'optional spending'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8] block">
                WHAT TO DO
              </span>
              <p className="text-xs sm:text-sm text-[#0F2747] dark:text-[#CBD5E1]">
                {topOpp ? topOpp.recommendedAction : 'Look at your recent dining out and food orders to see if you can reduce 1–2 orders a week.'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8] block">
                WHY
              </span>
              <p className="text-xs sm:text-sm text-[#0F2747] dark:text-[#CBD5E1]">
                Small frequent charges quietly add up over 30 days without noticing.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8] block">
                POSSIBLE IMPACT
              </span>
              <p className="text-xs sm:text-sm font-semibold text-[#059669] dark:text-[#34D399]">
                About {totalPotentialDisplay} / month in saved cash.
              </p>
            </div>
          </div>
        </div>

        {/* Step 3: Safety cushion */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-extrabold text-sm">
              3
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#0F2747] dark:text-[#F8FAFC] flex items-center gap-2">
              <span>🛡️</span> Build toward a 30-day safety cushion ({target30Days})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8] block">
                WHAT TO DO
              </span>
              <p className="text-xs sm:text-sm text-[#0F2747] dark:text-[#CBD5E1]">
                Direct part of your saved money toward reaching {target30Days} in emergency cash.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8] block">
                WHY
              </span>
              <p className="text-xs sm:text-sm text-[#0F2747] dark:text-[#CBD5E1]">
                Covers a full month of food, rent, and bike petrol if you are sick or work slows down.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8] block">
                POSSIBLE IMPACT
              </span>
              <p className="text-xs sm:text-sm font-semibold text-[#059669] dark:text-[#34D399]">
                30 full days of living security without borrowing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Link to Support & Benefits */}
      <div className="bg-[#F8FAFC] dark:bg-[#17243A] rounded-2xl p-5 border border-[#E2E8F0] dark:border-[#26354D] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC]">
            Looking for extra worker benefits?
          </span>
          <p className="text-xs text-[#52657A] dark:text-[#CBD5E1]">
            Check government insurance, accident cover, and pensions matched to your work.
          </p>
        </div>
        <Link
          href="/opportunities"
          className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-xs shrink-0"
        >
          Check support programs →
        </Link>
      </div>
    </div>
  );
}
