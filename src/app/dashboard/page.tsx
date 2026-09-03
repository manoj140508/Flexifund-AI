'use client';

import React from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import EmptyState from '@/components/EmptyState';
import ExplainButton from '@/components/ExplainButton';

export default function DashboardPage() {
  const { analysisResult } = useFinancialData();

  if (!analysisResult) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          title="Your financial picture starts here."
          description="Upload a CSV, PDF statement, or statement screenshot to begin."
          actionText="Upload financial data"
          actionHref="/upload"
        />
      </div>
    );
  }

  const res = analysisResult.resilienceAnalysis;
  const inc = analysisResult.incomeAnalysis;
  const exp = analysisResult.expenseAnalysis;
  const quality = analysisResult.dataQuality;
  const actions = analysisResult.prioritizedActions;

  // Format currency helpers
  const formatINR = (paiseStr?: string | null) => {
    if (!paiseStr) return '₹0.00';
    const n = Number(paiseStr) / 100;
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Requirement 14: Data Source Indicator
  const rawSourceType = analysisResult.metadata.sourceType;
  const dataSourceText =
    rawSourceType === 'PDF'
      ? 'Data source: Bank statement PDF'
      : rawSourceType === 'IMAGE'
      ? 'Data source: Statement image'
      : 'Data source: CSV';

  // Requirement 15: Data Quality Indicator
  const isQualityGood = quality.scoreGrade === 'A' || quality.scoreGrade === 'B';
  const qualityStatusText = isQualityGood ? 'Data quality: Good' : 'Data quality: Needs review';

  const qualityReasons: string[] = [];
  if (quality.observedMonths <= 1) {
    qualityReasons.push('Short statement period (≤ 1 month of records)');
  }
  if (quality.rejectedRows > 0) {
    qualityReasons.push(`${quality.rejectedRows} unreadable/corrupted row(s) quarantined`);
  }
  if (quality.duplicateSuspects > 0) {
    qualityReasons.push(`${quality.duplicateSuspects} suspect duplicate(s) flagged`);
  }
  if (quality.uncategorizedPercentage > 20) {
    qualityReasons.push(`${quality.uncategorizedPercentage}% transactions unclassified`);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header & Resilience Overview */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
          <div>
            {/* Badges: Source + Quality */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E0F2FE] dark:bg-blue-950/80 text-[#2563EB] dark:text-[#60A5FA] border border-blue-200 dark:border-blue-900">
                {dataSourceText}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isQualityGood
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                }`}
              >
                {qualityStatusText} (Grade {quality.scoreGrade})
              </span>
              <span className="text-xs text-[#52657A] dark:text-[#B8C5D6] font-mono">
                {quality.observedMonths} month(s) • {quality.daysSpan} days ({quality.startDate} to {quality.endDate})
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
              Your Financial Resilience
            </h1>
            <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm mt-1 max-w-2xl">
              Your cash-flow health, emergency buffer, and financial resilience overview.
            </p>

            {/* Quality explanation if issues present */}
            {qualityReasons.length > 0 && (
              <div className="mt-2 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-medium">
                <span>⚠️ Note:</span>
                <span>{qualityReasons.join(' • ')}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/export"
              className="px-4 py-2 rounded-lg border border-[#D7E7F5] dark:border-[#2A3B52] text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Report
            </Link>
            <Link
              href="/upload"
              className="px-4 py-2 rounded-lg bg-[#2563EB] text-xs font-bold text-white hover:bg-blue-600 transition-colors shadow-xs"
            >
              Upload Statement
            </Link>
          </div>
        </div>

        {/* Resilience Score Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
          {/* Main Score Gauge */}
          <div className="flex flex-col justify-center items-center p-6 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
              Resilience Score
            </span>
            <div className="my-3 flex items-baseline gap-1">
              <span className="text-5xl font-black text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
                {res.resilienceScore !== null ? res.resilienceScore : 'N/A'}
              </span>
              <span className="text-slate-400 font-bold text-lg">/ 100</span>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                (res.resilienceScore ?? 0) >= 70
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  : (res.resilienceScore ?? 0) >= 45
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                  : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
              }`}
            >
              Confidence: {res.scoreConfidence}
            </span>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] mt-3 leading-relaxed max-w-xs">
              {res.summaryExplanation}
            </p>
            <div className="mt-3">
              <ExplainButton
                topic="RESILIENCE_SCORE"
                contextEvidence={{
                  metricName: 'Resilience Score',
                  observedValue: `${res.resilienceScore ?? 'N/A'}/100`,
                  explanation: res.summaryExplanation,
                }}
              />
            </div>
          </div>

          {/* 4 Weighted Score Components */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
              Explainable Scoring Components
            </h3>
            <div className="space-y-3">
              {res.scoreComponents.map((comp, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] bg-white dark:bg-[#111C2E] space-y-1.5"
                >
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-[#0F2747] dark:text-[#F8FAFC]">{comp.name}</span>
                    <span className="font-mono font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                      {comp.earnedPoints}{' '}
                      <span className="text-slate-400 font-normal">
                        / {comp.maxPoints} pts ({comp.weightPercentage}%)
                      </span>
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#2563EB] dark:bg-[#60A5FA] h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (comp.earnedPoints / comp.maxPoints) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-[#52657A] dark:text-[#B8C5D6] pt-0.5">
                    <span className="truncate max-w-md">{comp.calculationBasis}</span>
                    <span className="text-[#0F2747] dark:text-[#F8FAFC] font-medium shrink-0 ml-2">
                      {comp.explanation}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Regulatory Notice */}
        <div className="mt-6 pt-4 border-t border-[#D7E7F5] dark:border-[#2A3B52] flex items-start gap-2 text-xs text-[#52657A] dark:text-[#B8C5D6]">
          <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <strong>Educational Planning Indicator:</strong> This metric quantifies cash-flow volatility and buffer coverage. It is an educational planning aid, not a credit score or regulated banking assessment.
          </span>
        </div>
      </div>

      {/* 2. Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Conservative Baseline */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
              Conservative Baseline
            </span>
            <Link href="/income" className="text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA] hover:underline">
              Details →
            </Link>
          </div>
          <div className="text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono">
            {formatINR(inc.conservativeBaselineMonthly.paise)}
          </div>
          <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-snug">
            Planning floor reference with {inc.volatilityRating.toLowerCase()} volatility (
            {inc.coefficientOfVariation ? (inc.coefficientOfVariation * 100).toFixed(1) + '%' : 'N/A'}).
          </p>
        </div>

        {/* Essential Monthly Burn */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
              Essential Monthly Burn
            </span>
            <Link href="/expenses" className="text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA] hover:underline">
              Details →
            </Link>
          </div>
          <div className="text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono">
            {formatINR(exp.essentialMonthlyBurn.paise)}
          </div>
          <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-snug">
            {(exp.essentialExpenseRatioBasisPoints / 100).toFixed(1)}% of spending goes to non-negotiable living needs.
          </p>
        </div>

        {/* Emergency Runway */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
              Emergency Runway
            </span>
            <Link href="/resilience" className="text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA] hover:underline">
              Details →
            </Link>
          </div>
          <div className="text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono">
            {res.bufferCoverageDays !== null ? `${res.bufferCoverageDays} Days` : 'N/A'}
          </div>
          <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-snug">
            {res.userProvidedCurrentBalance
              ? `Estimated buffer based on confirmed ₹${(Number(res.userProvidedCurrentBalance.paise) / 100).toLocaleString('en-IN')}`
              : 'Add your available cash balance in Profile to calculate exact runway days.'}
          </p>
        </div>

        {/* Savings Opportunities */}
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
              Potential Savings
            </span>
            <Link href="/savings" className="text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA] hover:underline">
              Details →
            </Link>
          </div>
          <div className="text-2xl font-extrabold text-[#059669] dark:text-[#34D399] font-mono">
            {formatINR(analysisResult.savingsOpportunities.reduce((acc, curr) => acc + BigInt(curr.potentialMonthlySaving?.paise || '0'), 0n).toString())}
            <span className="text-xs font-normal text-slate-400">/mo</span>
          </div>
          <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-snug">
            {analysisResult.savingsOpportunities.length} potential area(s) found to reduce leaking recurring spend.
          </p>
        </div>
      </div>

      {/* 3. Prioritized Action Plan */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex justify-between items-center pb-3 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
              Action Plan
            </span>
            <h3 className="text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC] mt-0.5">
              Top Recommended Next Steps
            </h3>
          </div>
          <Link
            href="/action-plan"
            className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline"
          >
            View Full Action Plan ({actions.length}) →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.slice(0, 3).map((action, i) => (
            <div
              key={action.id}
              className="p-4 rounded-2xl border border-[#D7E7F5] dark:border-[#2A3B52] bg-[#F5FAFF]/50 dark:bg-[#17243A]/40 space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                  #{i + 1} • {action.urgency}
                </span>
                <span className="text-[10px] font-semibold text-[#52657A] dark:text-[#B8C5D6]">
                  {action.effort} Effort
                </span>
              </div>
              <h4 className="font-bold text-[#0F2747] dark:text-[#F8FAFC] text-sm">{action.title}</h4>
              <p className="text-[#52657A] dark:text-[#B8C5D6] text-xs leading-relaxed line-clamp-2">
                {action.description}
              </p>
              <div className="pt-2 text-[11px] font-semibold text-[#059669] dark:text-[#34D399]">
                {action.potentialMonthlySaving
                  ? `Potential impact: ${formatINR(action.potentialMonthlySaving.paise)}/mo`
                  : 'Impact: Preserves emergency runway'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Signature Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* What-If Module */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0F2747] dark:bg-[#17243A] text-white space-y-3 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-widest text-[#60A5FA]">Scenario Planning</span>
          <h3 className="text-xl font-bold">What happens if your income drops?</h3>
          <p className="text-slate-300 text-xs leading-relaxed">
            Test upfront how a decline in gig platform demand or an unexpected inflation shock affects your daily survival runway.
          </p>
          <div className="pt-2">
            <Link
              href="/what-if"
              className="inline-block px-4 py-2 rounded-lg bg-[#2563EB] text-white font-bold text-xs hover:bg-blue-600 transition-colors shadow-sm"
            >
              Explore Scenario →
            </Link>
          </div>
        </div>

        {/* Verified Opportunities */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#059669] dark:bg-[#064E3B] text-white space-y-3 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-200">Social Protection</span>
          <h3 className="text-xl font-bold">Verified Welfare & Worker Schemes</h3>
          <p className="text-emerald-100 text-xs leading-relaxed">
            Check your profile against real, published Indian welfare programs including e-Shram, PM-SYM, PM SVANidhi, and PMJJBY with official verification portals.
          </p>
          <div className="pt-2">
            <Link
              href="/opportunities"
              className="inline-block px-4 py-2 rounded-lg bg-white text-emerald-950 font-bold text-xs hover:bg-emerald-50 transition-colors shadow-sm"
            >
              Discover Welfare Matches →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
