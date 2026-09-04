'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useFinancialData } from '@/context/FinancialDataContext';

function PlanAheadEmptyState() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-8 sm:p-12 shadow-sm space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-3xl mx-auto font-bold">
          🛡️
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC]">
            Plan Ahead
          </h1>
          <p className="text-sm text-[#52657A] dark:text-[#CBD5E1]">
            Upload your statement to see what could happen if your income changes and how long your savings cover essentials.
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

function PlanAheadActiveView({
  analysisResult,
  profile,
  updateCurrentCash,
}: {
  analysisResult: NonNullable<ReturnType<typeof useFinancialData>['analysisResult']>;
  profile: ReturnType<typeof useFinancialData>['profile'];
  updateCurrentCash: ReturnType<typeof useFinancialData>['updateCurrentCash'];
}) {
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'cushion' | 'what-if' | 'watch'>('cushion');

  useEffect(() => {
    if (tabParam === 'what-if') setActiveTab('what-if');
    else if (tabParam === 'watch') setActiveTab('watch');
    else if (tabParam === 'cushion') setActiveTab('cushion');
  }, [tabParam]);

  // Cash balance input state
  const [cashInput, setCashInput] = useState(profile.currentCashBalanceRupees || '');
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashError, setCashError] = useState<string | null>(null);
  const [isSavedCash, setIsSavedCash] = useState(false);

  // What-If Scenario State
  const [incomeDropPct, setIncomeDropPct] = useState<number>(0);
  const [expenseHikeRupees, setExpenseHikeRupees] = useState<number>(0);
  const [newEmiRupees, setNewEmiRupees] = useState<number>(0);

  const inc = analysisResult.incomeAnalysis;
  const exp = analysisResult.expenseAnalysis;
  const res = analysisResult.resilienceAnalysis;
  const stress = analysisResult.stressIndicators || [];

  // Base monthly metrics in Rupees
  const baseMonthlyIncome = Number(inc.monthlyAverage?.paise || inc.totalIncome.paise) / 100;
  const baseTotalExpenses = Number(exp.monthlyAverageExpenses?.paise || exp.totalExpenses.paise) / 100;
  const dailyEssentialBurn = Math.max(1, Math.round(Number(exp.dailyEssentialBurnRate.paise) / 100));

  // Safety Cushion Target (30 days starter)
  const target30DaysRupees = dailyEssentialBurn * 30;

  // Handlers for Cash Input
  const handleSaveCash = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = cashInput.trim().replace(/,/g, '');
    const num = parseFloat(clean);

    if (clean === '') {
      updateCurrentCash('');
      setIsEditingCash(false);
      return;
    }

    if (isNaN(num) || num < 0 || !isFinite(num)) {
      setCashError('Please enter a valid amount (e.g. 10000)');
      return;
    }

    setCashError(null);
    updateCurrentCash(clean);
    setIsEditingCash(false);
    setIsSavedCash(true);
    setTimeout(() => setIsSavedCash(false), 2500);
  };

  // 1. What If calculation
  const scenarioIncome = Math.max(0, baseMonthlyIncome * (1 - incomeDropPct / 100));
  const scenarioExpenses = baseTotalExpenses + expenseHikeRupees + newEmiRupees;
  const scenarioLeft = scenarioIncome - scenarioExpenses;
  const isScenarioSolvent = scenarioLeft >= 0;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (incomeDropPct > 0 || expenseHikeRupees > 0 || newEmiRupees > 0) {
        sessionStorage.setItem(
          'flexifund_latest_scenario',
          JSON.stringify({
            incomeDropPct,
            expenseHikeRupees,
            newEmiRupees,
            scenarioLeft,
            isScenarioSolvent,
          })
        );
      }
    }
  }, [incomeDropPct, expenseHikeRupees, newEmiRupees, scenarioLeft, isScenarioSolvent]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
          What happens if things change?
        </h1>
        <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
          Check your safety cushion, see what happens if you earn less, and find things to watch.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-[#E2E8F0]/60 dark:bg-[#1A283E] rounded-xl w-fit flex-wrap">
        <button
          onClick={() => setActiveTab('cushion')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'cushion'
              ? 'bg-white dark:bg-[#111C2E] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
              : 'text-[#52657A] dark:text-[#CBD5E1]'
          }`}
        >
          <span>🛡️</span>
          <span>Your Safety Cushion</span>
        </button>
        <button
          onClick={() => setActiveTab('what-if')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'what-if'
              ? 'bg-white dark:bg-[#111C2E] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
              : 'text-[#52657A] dark:text-[#CBD5E1]'
          }`}
        >
          <span>📉</span>
          <span>What If I Earn Less?</span>
        </button>
        <button
          onClick={() => setActiveTab('watch')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'watch'
              ? 'bg-white dark:bg-[#111C2E] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
              : 'text-[#52657A] dark:text-[#CBD5E1]'
          }`}
        >
          <span>⚠️</span>
          <span>Things to Watch ({stress.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: YOUR SAFETY CUSHION */}
      {/* ============================================================ */}
      {activeTab === 'cushion' && (
        <div className="space-y-6">
          {/* Question Banner */}
          <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA]">
                Your Safety Cushion
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] mt-1">
                How much money would you need if work stopped for a while?
              </h2>
              <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] mt-1">
                Your daily must-pay expenses (food, rent, electricity, work travel) are about{' '}
                <strong className="text-[#0F2747] dark:text-[#F8FAFC] font-mono">₹{dailyEssentialBurn} / day</strong>.
              </p>
            </div>

            {/* Target vs Available Cash */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#F8FAFC] dark:bg-[#17243A] rounded-2xl p-5 border border-[#E2E8F0] dark:border-[#26354D] space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8] block">
                  Target Cushion (30 days)
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono block">
                  ₹{target30DaysRupees.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-[#52657A] dark:text-[#CBD5E1] block">
                  Enough to cover essential food and rent for one full month.
                </span>
              </div>

              <div className="bg-[#F8FAFC] dark:bg-[#17243A] rounded-2xl p-5 border border-[#E2E8F0] dark:border-[#26354D] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]">
                    Current Available Cash
                  </span>
                  {!isEditingCash && res.bufferCoverageDays !== null && (
                    <button
                      onClick={() => setIsEditingCash(true)}
                      className="text-xs text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline"
                    >
                      Update
                    </button>
                  )}
                </div>

                {res.bufferCoverageDays !== null && !isEditingCash ? (
                  <div>
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#059669] dark:text-[#34D399] font-mono block">
                      ₹{parseFloat(profile.currentCashBalanceRupees || '0').toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-[#52657A] dark:text-[#CBD5E1] block mt-1">
                      You could cover about{' '}
                      <strong className="text-[#0F2747] dark:text-[#F8FAFC] font-mono">
                        {res.bufferCoverageDays} days
                      </strong>{' '}
                      of must-pay expenses.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <p className="text-xs text-[#52657A] dark:text-[#CBD5E1]">
                      We don’t know your current available cash yet.
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                        <input
                          type="number"
                          placeholder="e.g. 10000"
                          value={cashInput}
                          onChange={(e) => setCashInput(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0F2747] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveCash()}
                        className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors shrink-0"
                      >
                        Save
                      </button>
                    </div>
                    {cashError && (
                      <span className="text-[11px] text-rose-600 font-medium block">{cashError}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {isSavedCash && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                ✓ Available cash updated! Your cushion days have been recalculated.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: WHAT IF I EARN LESS? */}
      {/* ============================================================ */}
      {activeTab === 'what-if' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA]">
                Income Drop Simulation
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] mt-1">
                What would happen if you earned less next month?
              </h2>
              <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] mt-1">
                Slide to test what happens if your gigs or earnings drop.
              </p>
            </div>

            {/* Large Slider */}
            <div className="space-y-3 bg-[#F8FAFC] dark:bg-[#17243A] p-5 rounded-2xl border border-[#E2E8F0] dark:border-[#26354D]">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-[#52657A] dark:text-[#94A3B8]">
                  Income Change
                </span>
                <span className="text-base sm:text-lg font-extrabold font-mono text-[#2563EB] dark:text-[#60A5FA]">
                  {incomeDropPct === 0 ? 'No change (0%)' : `-${incomeDropPct}% drop`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="5"
                value={incomeDropPct}
                onChange={(e) => setIncomeDropPct(parseInt(e.target.value, 10))}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#52657A] dark:text-[#94A3B8] font-mono">
                <span>0%</span>
                <span>-10%</span>
                <span>-20%</span>
                <span>-30%</span>
                <span>-40%</span>
              </div>
            </div>

            {/* Optional Chips: Expenses increase by & Add monthly loan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] block">
                  My expenses increase by
                </span>
                <div className="flex flex-wrap gap-2">
                  {[0, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setExpenseHikeRupees(amt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        expenseHikeRupees === amt
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-[#52657A] dark:text-[#CBD5E1] hover:bg-slate-200'
                      }`}
                    >
                      {amt === 0 ? '₹0' : `+₹${amt}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] block">
                  Add a monthly loan repayment
                </span>
                <div className="flex flex-wrap gap-2">
                  {[0, 1000, 2000, 3000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setNewEmiRupees(amt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        newEmiRupees === amt
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-[#52657A] dark:text-[#CBD5E1] hover:bg-slate-200'
                      }`}
                    >
                      {amt === 0 ? '₹0' : `+₹${amt}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3 Live Numbers: Money coming in, Money going out, Money left */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
              <div className="p-3 sm:p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#17243A] border border-[#E2E8F0] dark:border-[#26354D]">
                <span className="text-[11px] font-bold text-[#52657A] dark:text-[#94A3B8] block uppercase">
                  Money Coming In
                </span>
                <span className="text-base sm:text-xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono block mt-0.5">
                  ₹{Math.round(scenarioIncome).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 sm:p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#17243A] border border-[#E2E8F0] dark:border-[#26354D]">
                <span className="text-[11px] font-bold text-[#52657A] dark:text-[#94A3B8] block uppercase">
                  Money Going Out
                </span>
                <span className="text-base sm:text-xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono block mt-0.5">
                  ₹{Math.round(scenarioExpenses).toLocaleString('en-IN')}
                </span>
              </div>
              <div
                className={`p-3 sm:p-4 rounded-2xl border ${
                  isScenarioSolvent
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
                }`}
              >
                <span className="text-[11px] font-bold text-[#52657A] dark:text-[#94A3B8] block uppercase">
                  {isScenarioSolvent ? 'Money Left' : 'Shortfall'}
                </span>
                <span
                  className={`text-base sm:text-xl font-extrabold font-mono block mt-0.5 ${
                    isScenarioSolvent ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {isScenarioSolvent
                    ? `₹${Math.round(scenarioLeft).toLocaleString('en-IN')}`
                    : `-₹${Math.round(Math.abs(scenarioLeft)).toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>

            {/* Immediate Deterministic Status Card */}
            {(() => {
              const isRoom = scenarioLeft >= (baseMonthlyIncome * 0.1);
              const isTight = isScenarioSolvent && !isRoom;

              const badge = !isScenarioSolvent ? '🔴' : isTight ? '🟡' : '🟢';
              const label = !isScenarioSolvent
                ? 'You may fall short'
                : isTight
                ? 'Your budget gets tighter'
                : 'You may still have room';

              const colorClasses = !isScenarioSolvent
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                : isTight
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200';

              const simpleExplanation = !isScenarioSolvent
                ? `If your income drops by ${incomeDropPct}%, your planned expenses may exceed earnings by ₹${Math.round(Math.abs(scenarioLeft)).toLocaleString('en-IN')}. You may need to cut optional spending or use your safety cushion.`
                : incomeDropPct === 0
                ? `With your regular earnings, you should have about ₹${Math.round(scenarioLeft).toLocaleString('en-IN')} left after paying regular expenses.`
                : `If your income drops by ${incomeDropPct}%, you should still have about ₹${Math.round(scenarioLeft).toLocaleString('en-IN')} left after regular expenses.`;

              return (
                <div className={`rounded-2xl p-5 border space-y-2 ${colorClasses}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{badge}</span>
                    <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                      {label}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed opacity-95">
                    {simpleExplanation}
                  </p>
                </div>
              );
            })()}

            {/* WHAT CAN YOU DO? Actionable Guidance */}
            <div className="p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA] block">
                What can you do?
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white dark:bg-[#111C2E] rounded-xl border border-blue-100 dark:border-blue-900/40 space-y-1">
                  <span className="text-base block">✂️</span>
                  <span className="text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] block">
                    Reduce Optional Spending
                  </span>
                  <p className="text-[11px] text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                    Pause eating out or impulse buys first to protect your rent and grocery essentials.
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-[#111C2E] rounded-xl border border-blue-100 dark:border-blue-900/40 space-y-1">
                  <span className="text-base block">🛡️</span>
                  <span className="text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] block">
                    Rely On Your Cushion
                  </span>
                  <p className="text-[11px] text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                    Use your starter savings to bridge temporary shortfalls without taking high-interest loans.
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-[#111C2E] rounded-xl border border-blue-100 dark:border-blue-900/40 space-y-1">
                  <span className="text-base block">🎯</span>
                  <span className="text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] block">
                    Lower Daily Spending Target
                  </span>
                  <p className="text-[11px] text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                    Temporarily ease your monthly saving goal to match this lower-income month.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: THINGS TO WATCH */}
      {/* ============================================================ */}
      {activeTab === 'watch' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]">
              Things to Watch
            </h2>
            <p className="text-xs text-[#52657A] dark:text-[#CBD5E1] mt-0.5">
              Important patterns in your recent money activity that are helpful to keep in mind.
            </p>
          </div>

          {stress.length === 0 ? (
            <div className="bg-white dark:bg-[#111C2E] border border-emerald-200 dark:border-emerald-800/80 rounded-3xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mx-auto">
                ✓
              </div>
              <h3 className="text-base font-extrabold text-[#0F2747] dark:text-[#F8FAFC]">
                Nothing urgent to flag
              </h3>
              <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] max-w-md mx-auto leading-relaxed">
                We didn’t find any major warning signs in the information you provided. Your observed income, essential expenses, and repayments are currently well-balanced.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {stress.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl p-5 sm:p-6 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base font-bold text-[#0F2747] dark:text-[#F8FAFC] flex items-center gap-2">
                      <span>⚠️</span> {item.title}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                      Watch
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                    {item.description}
                  </p>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-[#2563EB] dark:text-[#60A5FA]">
                    <strong>What to do: </strong>
                    <span>{item.recommendedAction}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlanAheadContent() {
  const { analysisResult, profile, updateCurrentCash } = useFinancialData();
  if (!analysisResult) {
    return <PlanAheadEmptyState />;
  }
  return (
    <PlanAheadActiveView
      analysisResult={analysisResult}
      profile={profile}
      updateCurrentCash={updateCurrentCash}
    />
  );
}

export default function PlanAheadPage() {
  return (
    <React.Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading plan...</div>}>
      <PlanAheadContent />
    </React.Suspense>
  );
}
