'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import EmptyState from '@/components/EmptyState';

export default function ResiliencePage() {
  const { analysisResult, profile, updateProfile } = useFinancialData();
  const [cashInput, setCashInput] = useState(profile.currentCashBalanceRupees || '');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!analysisResult) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          title="No resilience analysis yet."
          description="Upload financial data to calculate your runway and resilience."
          actionText="Upload financial data"
          actionHref="/upload"
        />
      </div>
    );
  }

  const res = analysisResult.resilienceAnalysis;
  const exp = analysisResult.expenseAnalysis;
  const stress = analysisResult.stressIndicators;

  const formatINR = (paiseStr?: string | null) => {
    if (!paiseStr) return '₹0.00';
    const n = Number(paiseStr) / 100;
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    updateProfile({ currentCashBalanceRupees: cashInput });
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  // 30-day and 90-day targets
  const dailyBurnPaise = BigInt(exp.dailyEssentialBurnRate.paise || '0');
  const target30Paise = dailyBurnPaise * 30n;
  const target90Paise = dailyBurnPaise * 90n;
  const currentCashPaise = res.userProvidedCurrentBalance ? BigInt(res.userProvidedCurrentBalance.paise) : 0n;
  const gap30Paise = target30Paise > currentCashPaise ? target30Paise - currentCashPaise : 0n;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#059669] dark:text-[#34D399]">
            Financial Defense
          </span>
          <h1 className="text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight mt-1">
            Resilience, Runway & Stress Signals
          </h1>
          <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm mt-1 max-w-2xl">
            Real liquid cash runway vs. essential daily burn rate, paired with empirical early warning indicators.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg border border-[#D7E7F5] dark:border-[#2A3B52] text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start md:self-auto shadow-xs"
        >
          ← Back to Overview
        </Link>
      </div>

      {/* 1. Emergency Buffer Runway Section */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D7E7F5] dark:border-[#2A3B52] pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
              Liquid Cash Cushion
            </span>
            <h2 className="text-xl font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              Emergency Expense Runway
            </h2>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
              res.coverageStatus === 'ROBUST' || res.coverageStatus === 'ADEQUATE'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                : res.coverageStatus === 'INSUFFICIENT_DATA'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
            }`}
          >
            Coverage Status: {res.coverageStatus}
          </span>
        </div>

        {res.userProvidedCurrentBalance ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52]">
                <span className="text-xs font-bold text-[#52657A] dark:text-[#B8C5D6] uppercase tracking-wide">
                  Confirmed Liquid Balance
                </span>
                <div className="text-2xl font-black text-[#0F2747] dark:text-[#F8FAFC] font-mono mt-1">
                  {formatINR(res.userProvidedCurrentBalance.paise)}
                </div>
                <p className="text-[11px] text-[#52657A] dark:text-[#B8C5D6] mt-1">
                  Confirmed by you in Profile (never inferred from historical statement).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52]">
                <span className="text-xs font-bold text-[#52657A] dark:text-[#B8C5D6] uppercase tracking-wide">
                  Calculated Survival Runway
                </span>
                <div className="text-2xl font-black text-[#059669] dark:text-[#34D399] font-mono mt-1">
                  {res.bufferCoverageDays !== null ? `${res.bufferCoverageDays} Days` : 'N/A'}
                </div>
                <p className="text-[11px] text-[#52657A] dark:text-[#B8C5D6] mt-1">
                  At daily essential burn rate of {formatINR(exp.dailyEssentialBurnRate.paise)}/day.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52]">
                <span className="text-xs font-bold text-[#52657A] dark:text-[#B8C5D6] uppercase tracking-wide">
                  Gap to 30-Day Buffer
                </span>
                <div className="text-2xl font-black text-[#0F2747] dark:text-[#F8FAFC] font-mono mt-1">
                  {gap30Paise > 0n ? formatINR(gap30Paise.toString()) : '₹0.00'}
                </div>
                <p className="text-[11px] text-[#52657A] dark:text-[#B8C5D6] mt-1">
                  Target for 1 full month of living essentials: {formatINR(target30Paise.toString())}.
                </p>
              </div>
            </div>

            {/* Runway Bar */}
            <div className="p-5 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                <span>Runway Progress (Target: 90 Days)</span>
                <span>{Math.min(100, Math.round(((res.bufferCoverageDays ?? 0) / 90) * 100))}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-[#2563EB] dark:bg-[#60A5FA] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((res.bufferCoverageDays ?? 0) / 90) * 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-[#52657A] dark:text-[#B8C5D6]">
                <span>0 Days</span>
                <span>30 Days (Min Recommended)</span>
                <span>90 Days (Target: {formatINR(target90Paise.toString())})</span>
              </div>
            </div>
          </div>
        ) : (
          /* Balance not provided banner */
          <div className="p-6 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div>
                <h3 className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                  Cash balance required for exact runway calculation
                </h3>
                <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] mt-1 max-w-xl leading-relaxed">
                  We never assume historical statement transactions equal your current liquid balance. Confirm your current available cash to calculate your exact emergency runway days.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateBalance} className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  placeholder="Enter current cash"
                  className="w-full pl-7 pr-3 py-2 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] text-xs font-mono bg-white dark:bg-[#111C2E] text-[#0F2747] dark:text-[#F8FAFC] outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isUpdating}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50"
              >
                {isUpdating ? 'Updating...' : 'Save & Calculate Runway'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 2. Stress Signals */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="border-b border-[#D7E7F5] dark:border-[#2A3B52] pb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
            Early Warning Signals
          </span>
          <h2 className="text-xl font-bold text-[#0F2747] dark:text-[#F8FAFC]">
            Financial Stress & Pressure Indicators
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stress.map((ind) => (
            <div
              key={ind.id}
              className={`p-5 rounded-2xl border ${
                ind.severity === 'ELEVATED_CAUTION'
                  ? 'border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20'
                  : ind.severity === 'MODERATE_CAUTION'
                  ? 'border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20'
                  : 'border-[#D7E7F5] dark:border-[#2A3B52] bg-[#F5FAFF]/50 dark:bg-[#17243A]/30'
              } space-y-2`}
            >
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-[#0F2747] dark:text-[#F8FAFC]">{ind.title}</h4>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    ind.severity === 'ELEVATED_CAUTION'
                      ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      : ind.severity === 'MODERATE_CAUTION'
                      ? 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                      : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                  }`}
                >
                  {ind.severity.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-relaxed">{ind.description}</p>
              {ind.recommendedAction && (
                <div className="text-[11px] font-medium text-slate-500 pt-1">
                  Action: {ind.recommendedAction}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
