'use client';

import React from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import { useTheme } from '@/context/ThemeContext';

export default function SettingsPage() {
  const { clearData, analysisResult } = useFinancialData();
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-[#059669] dark:text-[#34D399]">
          App Preferences
        </span>
        <h1 className="text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight mt-1">
          Settings & Preferences
        </h1>
        <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm mt-1">
          Manage your color appearance, session persistence, and local browser data.
        </p>
      </div>

      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Appearance / Theme setting (Requirement 1) */}
        <div className="flex items-center justify-between py-4 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
          <div>
            <h3 className="font-bold text-[#0F2747] dark:text-[#F8FAFC] text-sm">Theme Appearance</h3>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6]">
              Switch between clean fintech Light mode and high-contrast Dark mode.
            </p>
          </div>
          <div className="inline-flex rounded-xl p-1 bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52]">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                theme === 'light'
                  ? 'bg-white text-[#2563EB] shadow-xs'
                  : 'text-[#52657A] hover:text-[#0F2747]'
              }`}
            >
              ☀️ Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                theme === 'dark'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-[#B8C5D6] hover:text-white'
              }`}
            >
              🌙 Dark
            </button>
          </div>
        </div>

        {/* Currency setting */}
        <div className="flex items-center justify-between py-4 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
          <div>
            <h3 className="font-bold text-[#0F2747] dark:text-[#F8FAFC] text-sm">Currency Display</h3>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6]">Default reporting currency used across all modules.</p>
          </div>
          <span className="px-3 py-1 rounded-lg bg-[#F5FAFF] dark:bg-[#17243A] text-[#0F2747] dark:text-[#F8FAFC] text-xs font-mono font-bold border border-[#D7E7F5] dark:border-[#2A3B52]">
            INR (₹) - Indian Rupee
          </span>
        </div>

        {/* Number formatting */}
        <div className="flex items-center justify-between py-4 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
          <div>
            <h3 className="font-bold text-[#0F2747] dark:text-[#F8FAFC] text-sm">Number System</h3>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6]">Sub-continent numbering grouping (Lakhs & Crores).</p>
          </div>
          <span className="px-3 py-1 rounded-lg bg-[#F5FAFF] dark:bg-[#17243A] text-[#0F2747] dark:text-[#F8FAFC] text-xs font-mono border border-[#D7E7F5] dark:border-[#2A3B52]">
            ₹1,00,000.00
          </span>
        </div>

        {/* Active Session Status */}
        <div className="flex items-center justify-between py-4 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
          <div>
            <h3 className="font-bold text-[#0F2747] dark:text-[#F8FAFC] text-sm">Active Statement Session</h3>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6]">
              {analysisResult
                ? `Loaded: ${analysisResult.metadata.sourceReference} (${analysisResult.transactionStatistics.validCount} transactions)`
                : 'No statement loaded'}
            </p>
          </div>
          {analysisResult && (
            <button
              onClick={() => {
                clearData();
                window.location.reload();
              }}
              className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold hover:bg-red-100"
            >
              Clear Statement Data
            </button>
          )}
        </div>

        <div className="pt-2 flex justify-between items-center text-xs text-[#52657A] dark:text-[#B8C5D6]">
          <span>FlexiFund AI v0.1.0 • Built for Financial Inclusion</span>
          <Link
            href="/dashboard"
            className="text-[#2563EB] dark:text-[#60A5FA] font-semibold hover:underline"
          >
            ← Return to Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
