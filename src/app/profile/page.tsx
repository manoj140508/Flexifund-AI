'use client';

import React, { useState } from 'react';
import { useFinancialData } from '@/context/FinancialDataContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { WorkerCategory } from '@/domain/schemes';
import StateSelect from '@/components/StateSelect';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { profile, updateProfile, updateCurrentCash, clearData } = useFinancialData();
  const { theme, setTheme } = useTheme();

  const [workerType, setWorkerType] = useState<WorkerCategory>(
    (profile.workerType as WorkerCategory) || 'DELIVERY_WORKER'
  );
  const [selectedState, setSelectedState] = useState(profile.state || profile.jurisdiction || 'Karnataka');
  const [age, setAge] = useState(profile.age ? String(profile.age) : '27');
  const [cashBalance, setCashBalance] = useState(profile.currentCashBalanceRupees || '');
  const [goal, setGoal] = useState(profile.financialGoal || 'Build emergency savings');
  const [concern, setConcern] = useState(profile.primaryConcern || 'Income changes');
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      workerType,
      jurisdiction: selectedState,
      state: selectedState,
      age: age ? parseInt(age, 10) : undefined,
      currentCashBalanceRupees: cashBalance,
      financialGoal: goal,
      primaryConcern: concern,
    });
    updateCurrentCash(cashBalance);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
          Tell us a little about you
        </h1>
        <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
          This helps us match the right support programs and customize your targets.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* 1. Worker Type */}
          <div className="space-y-1.5">
            <label htmlFor="worker-type" className="block text-xs sm:text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              What kind of work do you do?
            </label>
            <select
              id="worker-type"
              value={workerType}
              onChange={(e) => setWorkerType(e.target.value as WorkerCategory)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#14233A] text-sm text-[#0F2747] dark:text-[#F8FAFC] font-medium focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="DELIVERY_WORKER">Delivery worker (Swiggy, Zomato, Zepto, Blinkit)</option>
              <option value="DRIVER">Driver (Auto, Cab, Taxi, Rapido)</option>
              <option value="FREELANCER">Freelancer / Creator / Digital gig</option>
              <option value="DOMESTIC_WORKER">Domestic worker / Cook / Housekeeping</option>
              <option value="CONSTRUCTION">Construction / Daily wage worker</option>
              <option value="STREET_VENDOR">Street vendor / Small retail</option>
              <option value="AGRICULTURAL">Agricultural / Farm worker</option>
              <option value="ARTISAN">Artisan / Handloom / Craft worker</option>
              <option value="HOME_BASED">Home-based / Self-employed worker</option>
              <option value="GIG_PLATFORM">Other informal worker</option>
            </select>
            <p className="text-xs text-[#52657A] dark:text-[#94A3B8]">
              💡 Helps us match welfare boards and worker support schemes for your profession.
            </p>
          </div>

          {/* 2. State */}
          <div className="space-y-1.5">
            <label htmlFor="state-select" className="block text-xs sm:text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              Which state do you live in?
            </label>
            <StateSelect
              id="state-select"
              value={selectedState}
              onChange={(val) => setSelectedState(val)}
            />
            <p className="text-xs text-[#52657A] dark:text-[#94A3B8]">
              💡 Your state helps us find support programs and subsidies available near you.
            </p>
          </div>

          {/* 3. Age */}
          <div className="space-y-1.5">
            <label htmlFor="age-input" className="block text-xs sm:text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              Age (years)
            </label>
            <input
              id="age-input"
              type="number"
              min="18"
              max="90"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#14233A] text-sm text-[#0F2747] dark:text-[#F8FAFC] font-medium focus:ring-2 focus:ring-[#2563EB]"
              placeholder="e.g. 27"
            />
            <p className="text-xs text-[#52657A] dark:text-[#94A3B8]">
              💡 Helps verify official age rules for pensions (like APY) and insurance schemes.
            </p>
          </div>

          {/* 4. Main Financial Goal */}
          <div className="space-y-1.5">
            <label htmlFor="goal-select" className="block text-xs sm:text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              What is your primary financial goal?
            </label>
            <select
              id="goal-select"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#14233A] text-sm text-[#0F2747] dark:text-[#F8FAFC] font-medium focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="Build emergency savings">Build a safety cushion for slow weeks</option>
              <option value="Pay down debt">Pay down loans and debts</option>
              <option value="Cut living expenses">Find places to cut unnecessary spending</option>
              <option value="Buy equipment">Save for vehicle or work equipment</option>
              <option value="Family security">Family medical and health security</option>
            </select>
          </div>

          {/* 5. Main Concern */}
          <div className="space-y-1.5">
            <label htmlFor="concern-select" className="block text-xs sm:text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              What is your biggest financial concern?
            </label>
            <select
              id="concern-select"
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#14233A] text-sm text-[#0F2747] dark:text-[#F8FAFC] font-medium focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="Income changes">Income going up and down unexpectedly</option>
              <option value="Emergency costs">Sudden medical or bike repair expenses</option>
              <option value="High loan EMIs">High monthly loan or EMI payments</option>
              <option value="Rising bills">Daily expenses and fuel prices rising</option>
            </select>
          </div>

          {/* 6. Current Available Cash (Optional) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label htmlFor="cash-input" className="block text-xs sm:text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              Current available cash in hand & bank (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold text-sm">₹</span>
              <input
                id="cash-input"
                type="number"
                placeholder="e.g. 12000"
                value={cashBalance}
                onChange={(e) => setCashBalance(e.target.value)}
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#14233A] text-sm text-[#0F2747] dark:text-[#F8FAFC] font-medium focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
            <p className="text-xs text-[#52657A] dark:text-[#94A3B8]">
              💡 Used to calculate how many days your cash could cover essentials if work stopped.
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#2563EB] text-white font-bold text-sm hover:bg-blue-600 transition-colors shadow-md"
            >
              Save Preferences
            </button>
          </div>

          {savedMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              ✓ Preferences saved! Support schemes and cushion calculations updated.
            </div>
          )}
        </div>
      </form>

      {/* Theme & Clear Data */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">Appearance</h3>
            <p className="text-xs text-[#52657A] dark:text-[#94A3B8]">Switch between light and dark display</p>
          </div>
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>

        {/* Account & Logout */}
        {user && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">Signed in as</h3>
              <p className="text-xs text-[#52657A] dark:text-[#94A3B8]">
                {user.name} ({user.email})
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to log out of FlexiFund AI?')) {
                  logout();
                }
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#17243A] border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              Log Out
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">Statement Data</h3>
            <p className="text-xs text-[#52657A] dark:text-[#94A3B8]">Erase uploaded financial records for your account</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to clear your uploaded financial data?')) {
                clearData();
              }
            }}
            className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 transition-colors"
          >
            Clear Data
          </button>
        </div>
      </div>
    </div>
  );
}
