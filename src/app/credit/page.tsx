'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import EmptyState from '@/components/EmptyState';
import ExplainButton from '@/components/ExplainButton';

export default function CreditPage() {
  const { analysisResult } = useFinancialData();
  const [proposedRepaymentRupees, setProposedRepaymentRupees] = useState<string>('');

  if (!analysisResult) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          title="No financial data to evaluate credit affordability."
          description="Upload financial data to evaluate loan repayment impact."
          actionText="Upload financial data"
          actionHref="/upload"
        />
      </div>
    );
  }

  const inc = analysisResult.incomeAnalysis;
  const exp = analysisResult.expenseAnalysis;

  const repayment = parseFloat(proposedRepaymentRupees) || 0;
  const conservativeIncome = Number(inc.conservativeBaselineMonthly.paise) / 100;
  const essentialBurn = Number(exp.essentialMonthlyBurn.paise) / 100;
  const currentDebt = Number(exp.debtRepaymentsMonthly.paise) / 100;

  // Ratios
  const commitmentRatio = conservativeIncome > 0 ? Math.round((repayment / conservativeIncome) * 1000) / 10 : 0;
  const totalFixedCommitments = essentialBurn + currentDebt + repayment;
  const totalFixedRatio = conservativeIncome > 0 ? Math.round((totalFixedCommitments / conservativeIncome) * 1000) / 10 : 0;
  const remainingConservativeSurplus = conservativeIncome - totalFixedCommitments;

  // Pressure evaluation
  let pressureLevel: 'LOWER_PRESSURE' | 'MODERATE_PRESSURE' | 'HIGHER_PRESSURE' = 'LOWER_PRESSURE';
  let guidanceSummary = '';
  let advice = '';

  if (commitmentRatio >= 30 || totalFixedRatio >= 95 || remainingConservativeSurplus < 1000) {
    pressureLevel = 'HIGHER_PRESSURE';
    guidanceSummary = 'Based on the information provided, this additional fixed commitment may place higher financial pressure on your cash flow.';
    advice = 'At this repayment level, your remaining surplus becomes very small or negative during low-income months. Consider building at least 30 days of emergency cash reserves before taking on new fixed debt.';
  } else if (commitmentRatio >= 15 || totalFixedRatio >= 80) {
    pressureLevel = 'MODERATE_PRESSURE';
    guidanceSummary = 'Based on the information provided, this additional fixed commitment may moderately reduce your financial buffer.';
    advice = 'This repayment is manageable in average months, but narrows your emergency margin if weekly platform earnings dip.';
  } else {
    pressureLevel = 'LOWER_PRESSURE';
    guidanceSummary = 'Based on the information provided, this commitment appears to have a lower impact on your conservative cash flow.';
    advice = 'Estimated disposable cushion remains above standard emergency thresholds under baseline conditions.';
  }

  const formatINR = (n: number) => {
    const prefix = n < 0 ? '-₹' : '₹';
    return `${prefix}${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#059669] dark:text-[#34D399]">
            Responsible Decision Support
          </span>
          <h1 className="text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight mt-1">
            Repayment & Debt Affordability
          </h1>
          <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm mt-1 max-w-2xl">
            Evaluate whether an EMI commitment is safe before borrowing. We benchmark repayments strictly against your <strong>conservative baseline income</strong>.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg border border-[#D7E7F5] dark:border-[#2A3B52] text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start md:self-auto shadow-xs"
        >
          ← Back to Overview
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Card */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
            Proposed Fixed Commitment
          </h2>

          <div className="space-y-1.5">
            <label htmlFor="repayment-input" className="block text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              Proposed Monthly Repayment (₹)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold">₹</span>
              <input
                id="repayment-input"
                type="number"
                min="0"
                step="500"
                value={proposedRepaymentRupees}
                onChange={(e) => setProposedRepaymentRupees(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] text-sm font-mono bg-white dark:bg-[#17243A] text-[#0F2747] dark:text-[#F8FAFC] outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-[11px] text-[#52657A] dark:text-[#B8C5D6]">
              Enter the monthly instalment of a credit card, bike loan, or phone financing.
            </p>
          </div>

          <div className="pt-2 border-t border-[#D7E7F5] dark:border-[#2A3B52] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#52657A] dark:text-[#B8C5D6]">Conservative Baseline:</span>
              <span className="font-mono font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                {formatINR(conservativeIncome)}/mo
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#52657A] dark:text-[#B8C5D6]">Current Essential Burn:</span>
              <span className="font-mono font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                {formatINR(essentialBurn)}/mo
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#52657A] dark:text-[#B8C5D6]">Existing Debt Payments:</span>
              <span className="font-mono font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                {formatINR(currentDebt)}/mo
              </span>
            </div>
          </div>
        </div>

        {/* Evaluation Output */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D7E7F5] dark:border-[#2A3B52] pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
                  Affordability Assessment
                </span>
                <h3 className="text-xl font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                  Cash Flow Pressure Analysis
                </h3>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                  pressureLevel === 'LOWER_PRESSURE'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    : pressureLevel === 'MODERATE_PRESSURE'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                }`}
              >
                {pressureLevel.replace(/_/g, ' ')}
              </span>
            </div>

            <p className="text-xs text-[#0F2747] dark:text-[#F8FAFC] font-medium leading-relaxed">
              {guidanceSummary}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52]">
                <span className="text-xs text-[#52657A] dark:text-[#B8C5D6] font-bold">New Commitment Ratio</span>
                <div className="text-2xl font-black text-[#0F2747] dark:text-[#F8FAFC] font-mono mt-1">
                  {commitmentRatio}%
                </div>
                <span className="text-[10px] text-slate-400">Of conservative income</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52]">
                <span className="text-xs text-[#52657A] dark:text-[#B8C5D6] font-bold">Total Fixed Ratio</span>
                <div className="text-2xl font-black text-[#0F2747] dark:text-[#F8FAFC] font-mono mt-1">
                  {totalFixedRatio}%
                </div>
                <span className="text-[10px] text-slate-400">Essentials + Existing + New</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52]">
                <span className="text-xs text-[#52657A] dark:text-[#B8C5D6] font-bold">Remaining Floor Cushion</span>
                <div
                  className={`text-2xl font-black font-mono mt-1 ${
                    remainingConservativeSurplus < 1000
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-[#059669] dark:text-[#34D399]'
                  }`}
                >
                  {formatINR(remainingConservativeSurplus)}
                </div>
                <span className="text-[10px] text-slate-400">During a lean month</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <span className="font-bold block">Objective Guidance:</span>
              <p>{advice}</p>
            </div>

            <div className="flex justify-end pt-2">
              <ExplainButton
                topic="CREDIT_AFFORDABILITY"
                contextEvidence={{
                  metricName: 'Proposed Repayment Evaluation',
                  observedValue: formatINR(repayment),
                  explanation: guidanceSummary,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
