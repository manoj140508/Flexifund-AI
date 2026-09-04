'use client';

import React from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import { useAuth } from '@/context/AuthContext';
import { useGoals, GOAL_TYPE_LABELS } from '@/lib/use-goals';

export default function SavingsPage() {
  const { analysisResult } = useFinancialData();
  const { user } = useAuth();
  const { primaryGoal } = useGoals(user?.id);

  if (!analysisResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-8 sm:p-12 shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-3xl mx-auto font-bold">
            💰
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC]">
              Find ways to save
            </h1>
            <p className="text-sm text-[#52657A] dark:text-[#CBD5E1]">
              Upload your statement and we’ll look for places where you may be able to save.
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

  const opportunities = analysisResult.savingsOpportunities || [];
  const capacity = analysisResult.savingsCapacity;
  const exp = analysisResult.expenseAnalysis;

  const formatRupees = (paiseStr?: string | null | bigint) => {
    if (!paiseStr) return '₹0';
    const num = typeof paiseStr === 'bigint' ? Number(paiseStr) : Number(paiseStr);
    const rupees = Math.round(num / 100);
    return `₹${rupees.toLocaleString('en-IN')}`;
  };

  // 1. Total potential saving per month
  const totalPotentialPaise = opportunities.reduce(
    (acc, opp) => acc + BigInt(opp.potentialMonthlySaving?.paise || '0'),
    0n
  );
  const potentialSavingsDisplay = formatRupees(totalPotentialPaise);

  // 2. Main Spending Categories (Food, Travel/work, Bills, Other)
  const breakdown = exp.categoryBreakdown || {};
  const foodPaise =
    BigInt(breakdown['ESSENTIAL_GROCERIES']?.total.paise || 0) +
    BigInt(breakdown['DISCRETIONARY']?.total.paise || 0);
  const transitPaise = BigInt(breakdown['WORK_FUEL_TRANSIT']?.total.paise || 0);
  const billsPaise =
    BigInt(breakdown['ESSENTIAL_UTILITIES']?.total.paise || 0) +
    BigInt(breakdown['ESSENTIAL_HOUSING']?.total.paise || 0) +
    BigInt(breakdown['DEBT_REPAYMENT']?.total.paise || 0);

  const allSpentPaise = BigInt(exp.monthlyAverageExpenses?.paise || exp.totalExpenses.paise);
  const otherPaise = allSpentPaise > foodPaise + transitPaise + billsPaise
    ? allSpentPaise - (foodPaise + transitPaise + billsPaise)
    : 0n;

  // 3. Targets
  const starterTarget = formatRupees(capacity.conservativeMonthlyReference.paise);
  const normalTarget = formatRupees(capacity.conservativeMonthlyReference.paise);
  const goodMonthExtra = formatRupees(
    BigInt(capacity.maximumMonthlySavings.paise) > BigInt(capacity.conservativeMonthlyReference.paise)
      ? BigInt(capacity.maximumMonthlySavings.paise) - BigInt(capacity.conservativeMonthlyReference.paise)
      : BigInt(capacity.conservativeMonthlyReference.paise)
  );

  const getFriendlyOpportunityIcon = (type: string) => {
    switch (type) {
      case 'RECURRING_DISCRETIONARY_PAYMENT':
        return '🔁';
      case 'REPEATED_DISCRETIONARY_SPEND':
      case 'HIGH_DISCRETIONARY_OUTFLOW':
        return '🍔';
      case 'WORK_EXPENSE_OPTIMIZATION':
        return '⛽';
      case 'AVOIDABLE_FEES_CHARGES':
        return '🏦';
      default:
        return '💡';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
          Find ways to save
        </h1>
        <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
          Let’s look at your actual spending and find places you may be able to reduce.
        </p>
      </div>

      {/* Active goal banner */}
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

      {/* 1. YOU MAY BE ABLE TO SAVE Hero Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-[#13233D] dark:to-[#17253D] border border-blue-200 dark:border-blue-900/60 rounded-3xl p-6 sm:p-8 space-y-2">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA]">
          You may be able to save
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl sm:text-5xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono">
            {potentialSavingsDisplay}
          </span>
          <span className="text-sm sm:text-base font-medium text-[#52657A] dark:text-[#94A3B8]">
            / month
          </span>
        </div>
        <p className="text-xs text-[#52657A] dark:text-[#CBD5E1] pt-1">
          💡 <em>Potential saving — not guaranteed.</em> Based on avoidable fees, recurring payments, and non-essential spending found in your statement.
        </p>
      </div>

      {/* 2. WHERE YOUR MONEY GOES */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]">
          Where Your Money Goes
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#F8FAFC] dark:bg-[#17243A] rounded-2xl p-4 border border-[#E2E8F0] dark:border-[#26354D]">
            <span className="text-xl mb-1 block">🍔</span>
            <span className="text-xs text-[#52657A] dark:text-[#94A3B8] block">Food & groceries</span>
            <span className="text-lg sm:text-xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono block mt-1">
              {formatRupees(foodPaise)}
            </span>
          </div>

          <div className="bg-[#F8FAFC] dark:bg-[#17243A] rounded-2xl p-4 border border-[#E2E8F0] dark:border-[#26354D]">
            <span className="text-xl mb-1 block">⛽</span>
            <span className="text-xs text-[#52657A] dark:text-[#94A3B8] block">Travel & work petrol</span>
            <span className="text-lg sm:text-xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono block mt-1">
              {formatRupees(transitPaise)}
            </span>
          </div>

          <div className="bg-[#F8FAFC] dark:bg-[#17243A] rounded-2xl p-4 border border-[#E2E8F0] dark:border-[#26354D]">
            <span className="text-xl mb-1 block">🏠</span>
            <span className="text-xs text-[#52657A] dark:text-[#94A3B8] block">Rent, bills & loans</span>
            <span className="text-lg sm:text-xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono block mt-1">
              {formatRupees(billsPaise)}
            </span>
          </div>

          <div className="bg-[#F8FAFC] dark:bg-[#17243A] rounded-2xl p-4 border border-[#E2E8F0] dark:border-[#26354D]">
            <span className="text-xl mb-1 block">📦</span>
            <span className="text-xs text-[#52657A] dark:text-[#94A3B8] block">Other spending</span>
            <span className="text-lg sm:text-xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono block mt-1">
              {formatRupees(otherPaise)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. PLACES TO CHECK */}
      <div className="space-y-4">
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]">
          Places to Check ({opportunities.length})
        </h2>

        {opportunities.length === 0 ? (
          <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 text-center space-y-2">
            <span className="text-3xl">✓</span>
            <h3 className="text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              No unusual spending leaks found
            </h3>
            <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
              Your spending is already tightly focused on essentials without obvious recurring leaks.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getFriendlyOpportunityIcon(opp.category)}</span>
                    <h3 className="text-sm sm:text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                      {opp.title}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                    {opp.description}
                  </p>
                  <div className="text-xs text-[#059669] dark:text-[#34D399] font-medium pt-1">
                    Action: {opp.recommendedAction}
                  </div>
                </div>

                <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                  <span className="text-[11px] uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8] block">
                    Potential saving
                  </span>
                  <span className="text-xl font-extrabold text-[#059669] dark:text-[#34D399] font-mono">
                    {formatRupees(opp.potentialMonthlySaving?.paise || '0')}
                  </span>
                  <span className="text-xs text-[#52657A] dark:text-[#94A3B8] block">/ month</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. PERSONALIZED SAVING TARGET */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
            Your Saving Target
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono">
              {starterTarget}
            </span>
            <span className="text-sm text-[#52657A] dark:text-[#94A3B8]">/ month starter goal</span>
          </div>
          <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] mt-1">
            Based on your actual income and spending, this is a starting target that is realistic to maintain.
          </p>
        </div>

        {/* 3 Situations: Low / Normal / Good Months */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-[#F8FAFC] dark:bg-[#17243A] rounded-2xl p-4 border border-[#E2E8F0] dark:border-[#26354D] space-y-1">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block">
              🟡 Low-Income Month
            </span>
            <p className="text-xs text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
              Save less if needed. Take care of rent, groceries, and essential living costs first.
            </p>
          </div>

          <div className="bg-[#F8FAFC] dark:bg-[#17243A] rounded-2xl p-4 border border-[#E2E8F0] dark:border-[#26354D] space-y-1">
            <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] block">
              🔵 Normal Month
            </span>
            <p className="text-xs text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
              Try to put away around <strong className="font-mono text-[#0F2747] dark:text-[#F8FAFC]">{normalTarget}</strong> into your safety cushion.
            </p>
          </div>

          <div className="bg-[#F8FAFC] dark:bg-[#17243A] rounded-2xl p-4 border border-[#E2E8F0] dark:border-[#26354D] space-y-1">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">
              🟢 Good-Income Month
            </span>
            <p className="text-xs text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
              When earnings are higher, try adding <strong className="font-mono text-[#0F2747] dark:text-[#F8FAFC]">{goodMonthExtra}</strong> extra to your cushion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
