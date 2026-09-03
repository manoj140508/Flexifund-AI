'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/context/FinancialDataContext';
import { WorkerCategory } from '@/domain/schemes';
import StateSelect from '@/components/StateSelect';

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, updateProfile } = useFinancialData();

  const [workerType, setWorkerType] = useState<WorkerCategory>(
    (profile.workerType as WorkerCategory) || 'GIG_PLATFORM'
  );
  const [selectedState, setSelectedState] = useState<string>(profile.state || profile.jurisdiction || 'Karnataka');
  const [city, setCity] = useState<string>(profile.city || '');
  const [age, setAge] = useState<string>(profile.age ? String(profile.age) : '27');
  const [currentCashBalanceRupees, setCurrentCashBalanceRupees] = useState<string>(
    profile.currentCashBalanceRupees || ''
  );
  const [financialGoal, setFinancialGoal] = useState<string>(profile.financialGoal || '');
  const [primaryConcern, setPrimaryConcern] = useState<string>(profile.primaryConcern || '');
  const [hasBankAccount, setHasBankAccount] = useState<boolean>(profile.hasBankAccount ?? true);
  const [isCoveredUnderEPFO_ESIC, setIsCoveredUnderEPFO_ESIC] = useState<boolean>(
    profile.isCoveredUnderEPFO_ESIC ?? false
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      workerType,
      jurisdiction: selectedState,
      state: selectedState,
      city,
      age: age ? parseInt(age, 10) : undefined,
      currentCashBalanceRupees,
      financialGoal,
      primaryConcern,
      hasBankAccount,
      isCoveredUnderEPFO_ESIC,
    });
    router.push('/upload');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="text-center mb-6 space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-[#059669] dark:text-[#34D399]">
          Step 1 of 2
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
          Tell us about your financial situation
        </h1>
        <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm max-w-lg mx-auto leading-relaxed">
          We use this information to make your financial analysis and opportunity matches more relevant.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
      >
        {/* 1. Worker Category */}
        <div>
          <label htmlFor="worker-category-select" className="block text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] mb-1.5">
            Primary Work Category
          </label>
          <select
            id="worker-category-select"
            value={workerType}
            onChange={(e) => setWorkerType(e.target.value as WorkerCategory)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] text-sm text-[#0F2747] dark:text-[#F8FAFC] bg-white dark:bg-[#17243A] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none transition-colors"
          >
            <option value="GIG_PLATFORM">Food Delivery / Ride-Hailing / Quick Logistics</option>
            <option value="STREET_VENDOR">Street Vendor / Hawkers / Informal Retailer</option>
            <option value="FREELANCER">Digital Freelancer / Independent Contractor</option>
            <option value="CONSTRUCTION">Construction & Daily-Wage Trades</option>
            <option value="DOMESTIC_WORKER">Domestic Household Worker</option>
            <option value="OTHER_INFORMAL">Other Informal / Unorganised Worker</option>
          </select>
          <p className="text-[11px] text-[#52657A] dark:text-[#B8C5D6] mt-1">
            Helps us detect irregular income payout cycles and match relevant social security boards.
          </p>
        </div>

        {/* 2. State & City Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              Matches state-specific welfare programs and regional benefits.
            </p>
          </div>

          <div>
            <label htmlFor="onboarding-city-input" className="block text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] mb-1.5">
              City / District
            </label>
            <input
              id="onboarding-city-input"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Bengaluru"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] text-sm text-[#0F2747] dark:text-[#F8FAFC] bg-white dark:bg-[#17243A] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none transition-colors"
            />
          </div>
        </div>

        {/* 3. Age */}
        <div>
          <label htmlFor="onboarding-age-input" className="block text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] mb-1.5">
            Your Age
          </label>
          <input
            id="onboarding-age-input"
            type="number"
            min="18"
            max="80"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full sm:w-48 px-3.5 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] text-sm text-[#0F2747] dark:text-[#F8FAFC] bg-white dark:bg-[#17243A] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none transition-colors"
          />
          <p className="text-[11px] text-[#52657A] dark:text-[#B8C5D6] mt-1">
            Required strictly to check entry eligibility for government schemes (e.g., PM-SYM: 18-40, PMJJBY: 18-50).
          </p>
        </div>

        {/* 4. Current Cash Balance (Optional) */}
        <div>
          <label htmlFor="onboarding-cash-balance-input" className="block text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] mb-1.5">
            Current Cash in Hand & Bank (₹) — <span className="text-[#52657A] dark:text-[#B8C5D6] font-normal">Optional</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-medium">₹</span>
            <input
              id="onboarding-cash-balance-input"
              type="number"
              min="0"
              step="100"
              value={currentCashBalanceRupees}
              onChange={(e) => setCurrentCashBalanceRupees(e.target.value)}
              placeholder="e.g. 15000"
              className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] text-sm font-mono text-[#0F2747] dark:text-[#F8FAFC] bg-white dark:bg-[#17243A] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none transition-colors"
            />
          </div>
          <div className="p-3.5 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] text-[11px] text-[#52657A] dark:text-[#B8C5D6] mt-2 space-y-1">
            <p>
              <strong className="text-[#0F2747] dark:text-[#F8FAFC]">Cash buffer transparency:</strong> We do not infer your actual current balance from historical transactions.
            </p>
            <p>
              Entering this allows us to calculate how many days of emergency living expenses your current cushion can support.
            </p>
          </div>
        </div>

        {/* 5. Financial Goal & Primary Concern */}
        <div className="space-y-4">
          <div>
            <label htmlFor="onboarding-goal-input" className="block text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] mb-1.5">
              Primary Financial Goal
            </label>
            <input
              id="onboarding-goal-input"
              type="text"
              value={financialGoal}
              onChange={(e) => setFinancialGoal(e.target.value)}
              placeholder="e.g. Save ₹25,000 to cover monsoon slump weeks"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] text-sm text-[#0F2747] dark:text-[#F8FAFC] bg-white dark:bg-[#17243A] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="onboarding-concern-input" className="block text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] mb-1.5">
              Biggest Financial Concern
            </label>
            <input
              id="onboarding-concern-input"
              type="text"
              value={primaryConcern}
              onChange={(e) => setPrimaryConcern(e.target.value)}
              placeholder="e.g. Fluctuating weekly payouts and unexpected vehicle repair bills"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] text-sm text-[#0F2747] dark:text-[#F8FAFC] bg-white dark:bg-[#17243A] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none transition-colors"
            />
          </div>
        </div>

        {/* 6. Formal Inclusion Toggles */}
        <div className="pt-2 border-t border-[#D7E7F5] dark:border-[#2A3B52] space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasBankAccount}
              onChange={(e) => setHasBankAccount(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-[#0F2747] dark:text-[#F8FAFC]">
              I have an active bank account linked to Aadhaar
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isCoveredUnderEPFO_ESIC}
              onChange={(e) => setIsCoveredUnderEPFO_ESIC(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-[#0F2747] dark:text-[#F8FAFC]">
              I am enrolled in formal EPFO or ESIC (Check this only if you are formally registered)
            </span>
          </label>
        </div>

        {/* Submit */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#2563EB] text-white font-bold text-xs hover:bg-blue-600 transition-colors shadow-sm"
          >
            Continue to Statement Upload →
          </button>
        </div>
      </form>
    </div>
  );
}
