'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/context/FinancialDataContext';
import Link from 'next/link';

export default function AnalyzePage() {
  const router = useRouter();
  const { analysisResult, isLoading, error } = useFinancialData();

  useEffect(() => {
    if (analysisResult) {
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [analysisResult, router]);

  const steps = [
    { title: 'Validating Financial Data', desc: 'Checking dates, amounts, and column structures' },
    { title: 'Analyzing Irregular Income', desc: 'Computing CV volatility and conservative floor' },
    { title: 'Categorizing Essential Burn', desc: 'Mapping housing, groceries, transit, and debt' },
    { title: 'Assessing Cash-Flow Resilience', desc: 'Evaluating buffer runway against daily burn' },
    { title: 'Finding Savings Opportunities', desc: 'Detecting recurring leaks and avoidable charges' },
    { title: 'Matching Verified Welfare Programs', desc: 'Checking e-Shram, PM-SYM, and social security' },
    { title: 'Synthesizing Action Plan', desc: 'Ranking top prioritized recommendations' },
  ];

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
      <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl mx-auto">
        <span className="animate-spin text-2xl">⚡</span>
      </div>

      <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
        {isLoading ? 'Analyzing Your Cash Flow...' : analysisResult ? 'Analysis Complete' : 'Ready to Analyze'}
      </h1>

      <p className="text-slate-600 text-sm max-w-md mx-auto">
        All financial figures are calculated directly from your uploaded statement records.
      </p>

      {/* Pipeline Steps Animation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left space-y-3 shadow-sm">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-3 text-xs">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
              ✓
            </span>
            <div>
              <span className="font-bold text-slate-900">{step.title}</span>
              <span className="text-slate-500 ml-1.5">— {step.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 text-left">
          <strong>Analysis Error:</strong> {error}
        </div>
      )}

      <div className="pt-2">
        <Link
          href="/dashboard"
          className="inline-block px-6 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-sm"
        >
          View Dashboard Results →
        </Link>
      </div>
    </div>
  );
}
