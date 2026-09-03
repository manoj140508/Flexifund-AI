'use client';

import React from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import EmptyState from '@/components/EmptyState';
import ExplainButton from '@/components/ExplainButton';

export default function SavingsPage() {
  const { analysisResult } = useFinancialData();

  if (!analysisResult) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          title="No savings opportunities identified yet."
          description="Upload financial data to identify areas to save."
          actionText="Upload financial data"
          actionHref="/upload"
        />
      </div>
    );
  }

  const opportunities = analysisResult.savingsOpportunities;
  const capacity = analysisResult.savingsCapacity;

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
          <span className="text-xs font-bold uppercase tracking-widest text-[#059669] dark:text-[#34D399]">
            Money-Saving Engine
          </span>
          <h1 className="text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight mt-1">
            Potential Savings Opportunities
          </h1>
          <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm mt-1 max-w-2xl">
            Evidence-backed areas to moderate discretionary outlays and redirect surplus into emergency reserves.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg border border-[#D7E7F5] dark:border-[#2A3B52] text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start md:self-auto shadow-xs"
        >
          ← Back to Overview
        </Link>
      </div>

      {/* 1. Dynamic Savings Capacity Range */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D7E7F5] dark:border-[#2A3B52] pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
              Adaptive Planning Metric
            </span>
            <h2 className="text-xl font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              Personalized Monthly Savings Capacity Range
            </h2>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 self-start sm:self-auto">
            {capacity.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Minimum Target */}
          <div className="p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] space-y-1">
            <span className="text-xs font-bold text-[#52657A] dark:text-[#B8C5D6] uppercase tracking-wide">
              Lean Month Sustainable Target (Minimum)
            </span>
            <div className="text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono">
              {formatINR(capacity.minimumMonthlySavings.paise)}
            </div>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] pt-1 leading-relaxed">
              Derived from conservative planning surplus. If essential living expenses consume conservative earnings, the target adjusts to ₹0 to avoid forced borrowing.
            </p>
          </div>

          {/* Maximum Target */}
          <div className="p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] space-y-1">
            <span className="text-xs font-bold text-[#52657A] dark:text-[#B8C5D6] uppercase tracking-wide">
              Peak Month Recommended Target (Maximum)
            </span>
            <div className="text-3xl font-extrabold text-[#059669] dark:text-[#34D399] font-mono">
              {formatINR(capacity.maximumMonthlySavings.paise)}
            </div>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] pt-1 leading-relaxed">
              Achievable when platform payouts hit median levels and discretionary spending leaks are moderated.
            </p>
          </div>
        </div>

        <div className="pt-2 text-xs text-[#52657A] dark:text-[#B8C5D6]">
          <strong>Adaptive Guidance:</strong> {capacity.explanation}
        </div>
      </div>

      {/* 2. Detected Savings Opportunities */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D7E7F5] dark:border-[#2A3B52] pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
              Empirical Findings
            </span>
            <h2 className="text-xl font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              Identified Savings Opportunities ({opportunities.length})
            </h2>
          </div>
        </div>

        {opportunities.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#52657A] dark:text-[#B8C5D6]">
            No discretionary recurring leaks detected in the uploaded statement. Spending is already tightly consolidated.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className="p-5 rounded-2xl border border-[#D7E7F5] dark:border-[#2A3B52] bg-[#F5FAFF]/50 dark:bg-[#17243A]/40 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                      {opp.category}
                    </span>
                    <h3 className="font-bold text-[#0F2747] dark:text-[#F8FAFC] text-sm mt-1">{opp.title}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#059669] dark:text-[#34D399] font-mono">
                      {opp.potentialMonthlySaving ? `Save +${formatINR(opp.potentialMonthlySaving.paise)}/mo` : 'Discretionary buffer'}
                    </span>
                    <span className="block text-[10px] text-[#52657A] dark:text-[#B8C5D6]">
                      {opp.confidence} Confidence
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-relaxed">{opp.description}</p>

                <div className="pt-2 flex items-center justify-between text-[11px] text-[#52657A] dark:text-[#B8C5D6] border-t border-slate-200 dark:border-slate-700">
                  <span>
                    Confidence: <strong>{opp.confidence}</strong>
                  </span>
                  <ExplainButton
                    topic="SAVINGS_OPPORTUNITIES"
                    contextEvidence={{
                      metricName: opp.title,
                      observedValue: opp.potentialMonthlySaving ? formatINR(opp.potentialMonthlySaving.paise) : 'Behavioral opportunity',
                      explanation: opp.description,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
