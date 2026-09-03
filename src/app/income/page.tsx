'use client';

import React from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import EmptyState from '@/components/EmptyState';
import ExplainButton from '@/components/ExplainButton';

export default function IncomePage() {
  const { analysisResult } = useFinancialData();

  if (!analysisResult) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          title="No income analysis yet."
          description="Upload financial data to analyze your income pattern."
          actionText="Upload financial data"
          actionHref="/upload"
        />
      </div>
    );
  }

  const inc = analysisResult.incomeAnalysis;
  const quality = analysisResult.dataQuality;

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
              Income Analytics
            </span>
            <span className="text-xs text-[#52657A] dark:text-[#B8C5D6] font-mono">
              • {quality.observedMonths} Month(s) Statement Period
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
            Irregular Income & Volatility
          </h1>
          <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm mt-1 max-w-2xl">
            Statistical distribution, directional trend, and conservative planning reference calculated from your uploaded statement.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg border border-[#D7E7F5] dark:border-[#2A3B52] text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start md:self-auto shadow-xs"
        >
          ← Back to Overview
        </Link>
      </div>

      {/* 1. Core Income Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Conservative Planning Reference */}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
              Conservative Baseline
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
              Planning Floor
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 font-mono">
            {formatINR(inc.conservativeBaselineMonthly.paise)}
          </div>
          <p className="text-xs text-emerald-900 dark:text-emerald-300 leading-snug">
            <strong>Planning reference — not guaranteed income.</strong> Fixed commitments should be planned against this floor.
          </p>
        </div>

        {/* Average Monthly Income */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
            Average Monthly
          </span>
          <div className="text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono">
            {formatINR(inc.monthlyAverage.paise)}
          </div>
          <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-snug">
            Arithmetic mean across {inc.sampleMonthsCount} recorded statement months.
          </p>
        </div>

        {/* Median Monthly Income */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
            Median Monthly
          </span>
          <div className="text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono">
            {formatINR(inc.monthlyMedian.paise)}
          </div>
          <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-snug">
            Middle earning month, robust against single unusual festive spikes.
          </p>
        </div>

        {/* Volatility & Trend */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
            Volatility Rating
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-xl font-extrabold ${
                inc.volatilityRating === 'LOW'
                  ? 'text-[#059669] dark:text-[#34D399]'
                  : inc.volatilityRating === 'MODERATE'
                  ? 'text-[#D97706] dark:text-[#FBBF24]'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {inc.volatilityRating}
            </span>
            {inc.coefficientOfVariation !== null && (
              <span className="text-xs font-mono text-[#52657A] dark:text-[#B8C5D6]">
                (CV: {(inc.coefficientOfVariation * 100).toFixed(1)}%)
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-[#52657A] dark:text-[#B8C5D6]">
            <span>Trend: <strong>{inc.trend}</strong></span>
            <span>Confidence: <strong>{inc.confidence}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Methodology & Evidence Breakdown */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
          <div>
            <h2 className="text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              Why Conservative Baseline Matters
            </h2>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] mt-0.5">
              The mathematical rationale behind your non-average planning floor.
            </p>
          </div>
          <ExplainButton
            topic="CONSERVATIVE_BASELINE"
            contextEvidence={{
              metricName: 'Conservative Baseline',
              observedValue: formatINR(inc.conservativeBaselineMonthly.paise),
              explanation: inc.conservativePlanningLabel,
            }}
          />
        </div>

        <div className="p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] text-xs text-[#0F2747] dark:text-[#F8FAFC] space-y-2">
          <p className="font-semibold text-sm">Calculation Note:</p>
          <p className="text-[#52657A] dark:text-[#B8C5D6] leading-relaxed">
            {inc.conservativePlanningLabel}
          </p>
        </div>

        {/* Monthly Breakdown Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
            Monthly Income Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5FAFF] dark:bg-[#17243A] text-[#52657A] dark:text-[#B8C5D6] border-b border-[#D7E7F5] dark:border-[#2A3B52] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-right">Income (Credits)</th>
                  <th className="py-3 px-4 text-right">Payout Events</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D7E7F5] dark:divide-[#2A3B52]">
                {inc.monthlyBreakdown.map((m) => (
                  <tr key={m.periodKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-medium text-[#0F2747] dark:text-[#F8FAFC]">
                      {m.periodKey}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#059669] dark:text-[#34D399]">
                      {formatINR(m.total.paise)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#52657A] dark:text-[#B8C5D6]">
                      {m.transactionCount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {inc.highestMonth?.period === m.periodKey && inc.sampleMonthsCount > 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          Peak Month
                        </span>
                      )}
                      {inc.lowestMonth?.period === m.periodKey && inc.sampleMonthsCount > 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          Lean Month
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
