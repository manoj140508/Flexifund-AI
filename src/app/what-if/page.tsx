'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import EmptyState from '@/components/EmptyState';
import ExplainButton from '@/components/ExplainButton';

export default function WhatIfPage() {
  const { analysisResult } = useFinancialData();

  const [incomePct, setIncomePct] = useState<number>(0);
  const [expenseInflationRupees, setExpenseInflationRupees] = useState<string>('');
  const [proposedRepaymentRupees, setProposedRepaymentRupees] = useState<string>('');

  if (!analysisResult) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          title="Run a scenario after your financial data has been analyzed."
          description="Upload your financial statement to test how income drops, expense inflation, or loan repayments impact your runway."
          actionText="Upload financial data"
          actionHref="/upload"
        />
      </div>
    );
  }

  const inc = analysisResult.incomeAnalysis;
  const exp = analysisResult.expenseAnalysis;
  const res = analysisResult.resilienceAnalysis;

  // Real deterministic client calculation using same formula as domain
  const baseConservativeIncome = Number(inc.conservativeBaselineMonthly.paise) / 100;
  const baseEssentialMonthly = Number(exp.essentialMonthlyBurn.paise) / 100;
  const baseDailyBurn = Number(exp.dailyEssentialBurnRate.paise) / 100;
  const confirmedCash = res.userProvidedCurrentBalance ? Number(res.userProvidedCurrentBalance.paise) / 100 : null;

  const inflationNum = parseFloat(expenseInflationRupees) || 0;
  const repaymentNum = parseFloat(proposedRepaymentRupees) || 0;

  // Projected metrics
  const projectedIncome = Math.max(0, baseConservativeIncome * (1 + incomePct / 100));
  const projectedEssentials = baseEssentialMonthly + inflationNum + repaymentNum;
  const projectedSurplus = projectedIncome - projectedEssentials;

  // Projected buffer days
  let projectedCoverageDays: number | null = null;
  let coverageDelta: number | null = null;
  if (confirmedCash !== null && projectedEssentials > 0) {
    const projectedDailyBurn = (projectedEssentials / (baseEssentialMonthly || 1)) * baseDailyBurn;
    if (projectedDailyBurn > 0) {
      projectedCoverageDays = Math.round(confirmedCash / projectedDailyBurn);
      if (res.bufferCoverageDays !== null) {
        coverageDelta = projectedCoverageDays - res.bufferCoverageDays;
      }
    }
  }

  const formatINR = (val: number) => {
    const prefix = val < 0 ? '-₹' : '₹';
    return `${prefix}${Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#059669] dark:text-[#34D399]">
            Scenario Planning
          </span>
          <h1 className="text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight mt-1">
            What happens if your income drops?
          </h1>
          <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm mt-1 max-w-2xl">
            <strong>Scenario — not a prediction.</strong> Stress-test your irregular income against demand lulls, fuel inflation, or new fixed repayment commitments.
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
        {/* Controls Card */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 shadow-sm space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
            Scenario Parameters
          </h2>

          {/* Income Change Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="income-change-slider" className="font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                Income Shock (%)
              </label>
              <span
                className={`font-mono font-extrabold ${
                  incomePct < 0 ? 'text-red-600 dark:text-red-400' : 'text-[#059669] dark:text-[#34D399]'
                }`}
              >
                {incomePct > 0 ? `+${incomePct}%` : `${incomePct}%`}
              </span>
            </div>
            <input
              id="income-change-slider"
              type="range"
              min="-50"
              max="50"
              step="5"
              value={incomePct}
              onChange={(e) => setIncomePct(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 h-2 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#52657A] dark:text-[#B8C5D6]">
              <span>-50% (Severe slump)</span>
              <span>0%</span>
              <span>+50% (Surge)</span>
            </div>
          </div>

          {/* Expense Inflation Input */}
          <div className="space-y-1.5">
            <label htmlFor="expense-inflation-input" className="block text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              Cost Inflation Shock (₹/month)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-medium">₹</span>
              <input
                id="expense-inflation-input"
                type="number"
                min="0"
                step="500"
                value={expenseInflationRupees}
                onChange={(e) => setExpenseInflationRupees(e.target.value)}
                placeholder="e.g. 2000"
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] text-xs font-mono bg-white dark:bg-[#17243A] text-[#0F2747] dark:text-[#F8FAFC] outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-[11px] text-[#52657A] dark:text-[#B8C5D6]">
              Simulate sudden fuel price increases or living cost hikes.
            </p>
          </div>

          {/* New Repayment Commitment */}
          <div className="space-y-1.5">
            <label htmlFor="loan-repayment-input" className="block text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              Proposed Fixed Loan EMI (₹/month)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-medium">₹</span>
              <input
                id="loan-repayment-input"
                type="number"
                min="0"
                step="500"
                value={proposedRepaymentRupees}
                onChange={(e) => setProposedRepaymentRupees(e.target.value)}
                placeholder="e.g. 3500"
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] text-xs font-mono bg-white dark:bg-[#17243A] text-[#0F2747] dark:text-[#F8FAFC] outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-[11px] text-[#52657A] dark:text-[#B8C5D6]">
              Evaluate how an EMI fits within your conservative income baseline.
            </p>
          </div>

          <div className="pt-2 border-t border-[#D7E7F5] dark:border-[#2A3B52] flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIncomePct(-20);
                setExpenseInflationRupees('0');
                setProposedRepaymentRupees('0');
              }}
              className="px-3 py-1.5 rounded-lg border border-[#D7E7F5] dark:border-[#2A3B52] text-[11px] font-semibold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              -20% Gig Slump
            </button>
            <button
              type="button"
              onClick={() => {
                setIncomePct(0);
                setExpenseInflationRupees('3000');
                setProposedRepaymentRupees('0');
              }}
              className="px-3 py-1.5 rounded-lg border border-[#D7E7F5] dark:border-[#2A3B52] text-[11px] font-semibold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Fuel Shock
            </button>
          </div>
        </div>

        {/* Results Display */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Projected Baseline Income */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] shadow-sm space-y-1">
              <span className="text-xs font-bold text-[#52657A] dark:text-[#B8C5D6] uppercase">
                Projected Floor Income
              </span>
              <div className="text-2xl font-black text-[#0F2747] dark:text-[#F8FAFC] font-mono">
                {formatINR(projectedIncome)}
              </div>
              <p className="text-[11px] text-[#52657A] dark:text-[#B8C5D6]">
                Baseline: {formatINR(baseConservativeIncome)} ({incomePct > 0 ? `+${incomePct}%` : `${incomePct}%`})
              </p>
            </div>

            {/* Projected Essential Burn */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] shadow-sm space-y-1">
              <span className="text-xs font-bold text-[#52657A] dark:text-[#B8C5D6] uppercase">
                Projected Monthly Outflow
              </span>
              <div className="text-2xl font-black text-[#0F2747] dark:text-[#F8FAFC] font-mono">
                {formatINR(projectedEssentials)}
              </div>
              <p className="text-[11px] text-[#52657A] dark:text-[#B8C5D6]">
                Baseline: {formatINR(baseEssentialMonthly)} (+₹{inflationNum + repaymentNum})
              </p>
            </div>

            {/* Projected Survival Runway */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] shadow-sm space-y-1">
              <span className="text-xs font-bold text-[#52657A] dark:text-[#B8C5D6] uppercase">
                Simulated Runway
              </span>
              <div
                className={`text-2xl font-black font-mono ${
                  projectedCoverageDays !== null && projectedCoverageDays < 30
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-[#059669] dark:text-[#34D399]'
                }`}
              >
                {projectedCoverageDays !== null ? `${projectedCoverageDays} Days` : 'N/A'}
              </div>
              <p className="text-[11px] text-[#52657A] dark:text-[#B8C5D6]">
                {coverageDelta !== null
                  ? coverageDelta < 0
                    ? `${coverageDelta} days vs current`
                    : `+${coverageDelta} days vs current`
                  : 'Add cash balance in Profile'}
              </p>
            </div>
          </div>

          {/* Scenario Assessment Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                Scenario Resilience Assessment
              </h3>
              <ExplainButton
                topic="WHAT_IF_SIMULATION"
                contextEvidence={{
                  metricName: 'What-If Scenario Planning',
                  observedValue: `Income ${incomePct}%, Outflow +₹${inflationNum + repaymentNum}`,
                  explanation: `Projected surplus outcome is ${formatINR(projectedSurplus)}.`,
                }}
              />
            </div>

            {projectedSurplus >= 0 ? (
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                <span className="font-bold block">✓ Solvency Maintained Under Scenario</span>
                <p>
                  Your projected conservative floor covers all essential expenses with a remaining surplus of {formatINR(projectedSurplus)}/month.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-900 dark:text-red-200 space-y-1">
                <span className="font-bold block">⚠️ Potential Cash Flow Deficit</span>
                <p>
                  In this scenario, conservative earnings fall short of essential living commitments by {formatINR(Math.abs(projectedSurplus))}/month. An emergency reserve would be required to avoid distress borrowing.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
