'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import { useTheme } from '@/context/ThemeContext';
import { WorkerCategory } from '@/domain/schemes';
import StateSelect from '@/components/StateSelect';

export default function ProfilePage() {
  const { profile, updateProfile, analysisResult, clearData } = useFinancialData();
  const { theme, setTheme } = useTheme();

  const [workerType, setWorkerType] = useState<WorkerCategory>(
    (profile.workerType as WorkerCategory) || 'GIG_PLATFORM'
  );
  const [selectedState, setSelectedState] = useState(profile.state || profile.jurisdiction || 'Karnataka');
  const [city, setCity] = useState(profile.city || '');
  const [age, setAge] = useState(profile.age ? String(profile.age) : '27');
  const [cashBalance, setCashBalance] = useState(profile.currentCashBalanceRupees || '');
  const [goal, setGoal] = useState(profile.financialGoal || '');
  const [concern, setConcern] = useState(profile.primaryConcern || '');
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      workerType,
      jurisdiction: selectedState,
      state: selectedState,
      city,
      age: age ? parseInt(age, 10) : undefined,
      currentCashBalanceRupees: cashBalance,
      financialGoal: goal,
      primaryConcern: concern,
    });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  const quality = analysisResult?.dataQuality;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
            Financial Profile
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight mt-1.5">
            Tell us about your financial situation
          </h1>
          <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm mt-2 max-w-2xl leading-relaxed">
            We use this information to make your financial analysis and opportunity matches more relevant.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg border border-[#D7E7F5] dark:border-[#2A3B52] text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0 shadow-xs"
        >
          ← Back to Overview
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Edit Form */}
        <form onSubmit={handleSave} className="md:col-span-2 space-y-8">
          {/* 1. WORK PROFILE */}
          <section className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            <div className="border-b border-[#D7E7F5] dark:border-[#2A3B52] pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Work Profile
              </h2>
              <p className="text-sm font-semibold text-[#0F2747] dark:text-[#F8FAFC] mt-0.5">
                Your primary occupation & demographic category
              </p>
            </div>

            <div>
              <label htmlFor="worker-type-select" className="block text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] mb-1.5">
                Worker Type
              </label>
              <select
                id="worker-type-select"
                value={workerType}
                onChange={(e) => setWorkerType(e.target.value as WorkerCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] text-sm text-[#0F2747] dark:text-[#F8FAFC] bg-white dark:bg-[#17243A] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none transition-colors"
              >
                <option value="GIG_PLATFORM">Food Delivery / Ride-Hailing / Quick Logistics</option>
                <option value="STREET_VENDOR">Street Vendor / Informal Retailer</option>
                <option value="FREELANCER">Digital Freelancer / Independent Contractor</option>
                <option value="CONSTRUCTION">Construction & Daily-Wage Trades</option>
                <option value="DOMESTIC_WORKER">Domestic Household Worker</option>
                <option value="OTHER_INFORMAL">Other Informal Worker</option>
              </select>
            </div>

            <div>
              <label htmlFor="age-input" className="block text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] mb-1.5">
                Age
              </label>
              <input
                id="age-input"
                type="number"
                min="18"
                max="80"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] text-sm text-[#0F2747] dark:text-[#F8FAFC] bg-white dark:bg-[#17243A] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none transition-colors"
              />
              <p className="text-[11px] text-[#52657A] dark:text-[#B8C5D6] mt-1">
                Used strictly to verify eligibility for age-gated social welfare programs (e.g. PM-SYM, PMJJBY).
              </p>
            </div>
          </section>

          {/* 2. LOCATION */}
          <section className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            <div className="border-b border-[#D7E7F5] dark:border-[#2A3B52] pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Location
              </h2>
              <p className="text-sm font-semibold text-[#0F2747] dark:text-[#F8FAFC] mt-0.5">
                Your state jurisdiction and residential city
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] mb-1.5">
                  State / Union Territory
                </label>
                <StateSelect
                  value={selectedState}
                  onChange={(newState) => setSelectedState(newState)}
                  required
                />
                <p className="text-[11px] text-[#52657A] dark:text-[#B8C5D6] mt-1">
                  Connects your profile directly to state-specific welfare boards (e.g., BOCW) and regional benefits.
                </p>
              </div>

              <div>
                <label htmlFor="city-input" className="block text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] mb-1.5">
                  City
                </label>
                <input
                  id="city-input"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter your city"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] text-sm text-[#0F2747] dark:text-[#F8FAFC] bg-white dark:bg-[#17243A] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none transition-colors"
                />
              </div>
            </div>
          </section>

          {/* 3. FINANCIAL CONTEXT */}
          <section className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            <div className="border-b border-[#D7E7F5] dark:border-[#2A3B52] pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Financial Context
              </h2>
              <p className="text-sm font-semibold text-[#0F2747] dark:text-[#F8FAFC] mt-0.5">
                Available liquid cushion and financial priorities
              </p>
            </div>

            <div>
              <label htmlFor="cash-balance-input" className="block text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] mb-1.5">
                Current Cash Balance (₹)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-medium">₹</span>
                <input
                  id="cash-balance-input"
                  type="number"
                  min="0"
                  step="100"
                  value={cashBalance}
                  onChange={(e) => setCashBalance(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] text-sm font-mono text-[#0F2747] dark:text-[#F8FAFC] bg-white dark:bg-[#17243A] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none transition-colors"
                />
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] text-[11px] text-[#52657A] dark:text-[#B8C5D6] mt-2 space-y-1">
                <p>
                  <strong className="text-[#0F2747] dark:text-[#F8FAFC]">Optional.</strong> Enter your current available cash so we can estimate emergency-buffer coverage.
                </p>
                <p>
                  We never infer your current cash balance from historical transactions.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="financial-goal-input" className="block text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] mb-1.5">
                Primary Financial Goal
              </label>
              <input
                id="financial-goal-input"
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Build an emergency buffer of ₹30,000 for quiet gig months"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] text-sm text-[#0F2747] dark:text-[#F8FAFC] bg-white dark:bg-[#17243A] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="financial-concern-input" className="block text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] mb-1.5">
                Primary Financial Concern
              </label>
              <input
                id="financial-concern-input"
                type="text"
                value={concern}
                onChange={(e) => setConcern(e.target.value)}
                placeholder="e.g. Weekly fuel expenses and recurring loan repayments"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] text-sm text-[#0F2747] dark:text-[#F8FAFC] bg-white dark:bg-[#17243A] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none transition-colors"
              />
            </div>
          </section>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2">
            {savedMessage ? (
              <span className="text-xs font-bold text-[#059669] dark:text-[#34D399] flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Profile updated successfully
              </span>
            ) : (
              <span className="text-xs text-slate-400">All fields are stored locally for this session.</span>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#2563EB] text-white font-bold text-xs hover:bg-blue-600 transition-colors shadow-sm"
            >
              Save Profile Changes
            </button>
          </div>
        </form>

        {/* Sidebar: Theme & Data Quality */}
        <div className="space-y-6">
          {/* Theme Switcher Card (Requirement 1) */}
          <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Appearance
            </h3>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6]">
              Choose your interface color mode.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  theme === 'light'
                    ? 'border-[#2563EB] bg-[#E0F2FE]/50 text-[#2563EB] ring-2 ring-blue-500/10'
                    : 'border-[#D7E7F5] dark:border-[#2A3B52] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                ☀️ Light
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  theme === 'dark'
                    ? 'border-[#60A5FA] bg-blue-950/60 text-[#60A5FA] ring-2 ring-blue-500/10'
                    : 'border-[#D7E7F5] dark:border-[#2A3B52] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                🌙 Dark
              </button>
            </div>
          </div>

          {/* Data Quality Card */}
          <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Statement Health
            </h3>
            {quality ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
                  <span className="text-[#52657A] dark:text-[#B8C5D6]">Quality Rating:</span>
                  <span className="font-bold text-[#059669] dark:text-[#34D399] text-sm">
                    Grade {quality.scoreGrade}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#52657A] dark:text-[#B8C5D6]">Valid Entries:</span>
                  <span className="font-mono font-semibold text-[#0F2747] dark:text-[#F8FAFC]">
                    {quality.validRows}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#52657A] dark:text-[#B8C5D6]">Excluded Entries:</span>
                  <span className="font-mono font-semibold text-[#0F2747] dark:text-[#F8FAFC]">
                    {quality.rejectedRows}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#52657A] dark:text-[#B8C5D6]">Duplicate Suspects:</span>
                  <span className="font-mono font-semibold text-[#0F2747] dark:text-[#F8FAFC]">
                    {quality.duplicateSuspects}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#52657A] dark:text-[#B8C5D6]">Recorded Span:</span>
                  <span className="text-[#0F2747] dark:text-[#F8FAFC]">{quality.daysSpan} days</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-relaxed">
                No active statement loaded in this session. Upload a statement to view health metrics.
              </p>
            )}
          </div>

          {/* Session Data Reset */}
          <div className="bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F2747] dark:text-[#F8FAFC]">
              Data Management
            </h4>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-relaxed">
              Clear your active session data and uploaded transactions from browser memory.
            </p>
            <button
              type="button"
              onClick={() => {
                clearData();
                window.location.href = '/upload';
              }}
              className="w-full px-4 py-2 rounded-xl border border-red-200 dark:border-red-900 bg-white dark:bg-[#111C2E] text-red-700 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              Clear Session Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
