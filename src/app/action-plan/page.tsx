'use client';

import React from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import EmptyState from '@/components/EmptyState';
import ExplainButton from '@/components/ExplainButton';

export default function ActionPlanPage() {
  const { analysisResult } = useFinancialData();

  if (!analysisResult) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          title="Your action plan will be generated after your financial analysis."
          description="Upload your financial data to see prioritized next steps tailored to your income stability and expenses."
          actionText="Upload financial data"
          actionHref="/upload"
        />
      </div>
    );
  }

  const actions = analysisResult.prioritizedActions;

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
            Personalized Guidance
          </span>
          <h1 className="text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight mt-1">
            Prioritized Financial Action Plan
          </h1>
          <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm mt-1 max-w-2xl">
            Ranked using multi-factor scoring (Urgency 35%, Impact 30%, Effort 20%, Evidence 15%). <strong>Only recommendations backed by your actual data are displayed.</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-[#D7E7F5] dark:border-[#2A3B52] text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            ← Back to Overview
          </Link>
          <Link
            href="/export"
            className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span>Export Report</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Top Focus Banner */}
      <div className="bg-[#0F2747] dark:bg-[#17243A] text-white rounded-3xl p-6 sm:p-8 shadow-sm space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#34D399]"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-[#34D399]">Primary Focus</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight">Focus on Your Top Actions First</h2>
        <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
          Taking small, decisive steps on the highest-priority recommendations builds resilience faster than trying to overhaul all spending habits at once.
        </p>
      </div>

      {/* Action List */}
      <div className="space-y-4">
        {actions.map((action, idx) => (
          <div
            key={action.id}
            className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 shadow-sm space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#E0F2FE] dark:bg-blue-950 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-xs">
                  {idx + 1}
                </span>
                <h3 className="font-bold text-base text-[#0F2747] dark:text-[#F8FAFC]">{action.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    action.urgency === 'CRITICAL'
                      ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                      : action.urgency === 'HIGH'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {action.urgency.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] text-[#52657A] dark:text-[#B8C5D6] font-semibold">
                  {action.effort} Effort
                </span>
              </div>
            </div>

            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-relaxed pl-0 sm:pl-9">
              {action.description}
            </p>

            {action.rankingJustification && (
              <div className="pl-0 sm:pl-9 pt-1">
                <p className="text-[11px] text-slate-500 font-mono">
                  Why prioritized: {action.rankingJustification}
                </p>
              </div>
            )}

            <div className="pl-0 sm:pl-9 pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="font-semibold text-[#059669] dark:text-[#34D399]">
                {action.potentialMonthlySaving
                  ? `Estimated monthly recovery: ${formatINR(action.potentialMonthlySaving.paise)}/mo`
                  : 'Impact: Bolsters runway during lean weeks'}
              </span>
              <div className="flex items-center gap-3">
                {action.actionUrlOrPrompt && action.actionUrlOrPrompt.startsWith('/') && (
                  <Link
                    href={action.actionUrlOrPrompt}
                    className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline"
                  >
                    Open Tool →
                  </Link>
                )}
                <ExplainButton
                  topic="PRIORITIZED_ACTIONS"
                  contextEvidence={{
                    metricName: action.title,
                    observedValue: action.urgency,
                    explanation: action.description,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
