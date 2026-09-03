import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#0F2747] dark:bg-[#070C16] text-slate-400 border-t border-slate-800 text-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Brand & Tagline */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#2563EB] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                F
              </div>
              <span className="text-white font-bold text-base tracking-tight">FlexiFund AI</span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed max-w-md">
              “When your income changes, your financial plan should change with it.”
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 text-emerald-400 text-xs font-medium border border-slate-700">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Zero Credential Access: No bank password, PIN, OTP, CVV or UPI PIN required.
              </span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">Planning Tools</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Overview</Link></li>
              <li><Link href="/income" className="hover:text-white transition-colors">Income Volatility</Link></li>
              <li><Link href="/expenses" className="hover:text-white transition-colors">Expense Analysis</Link></li>
              <li><Link href="/resilience" className="hover:text-white transition-colors">Resilience & Buffer</Link></li>
              <li><Link href="/savings" className="hover:text-white transition-colors">Savings Opportunities</Link></li>
              <li><Link href="/what-if" className="hover:text-white transition-colors">What-If Sensitivity</Link></li>
              <li><Link href="/credit" className="hover:text-white transition-colors">Responsible Credit</Link></li>
            </ul>
          </div>

          {/* Col 3: Legal & Trust */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">Trust & Security</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/security" className="hover:text-white transition-colors">Security Architecture</Link></li>
              <li><Link href="/opportunities" className="hover:text-white transition-colors">Verified Schemes</Link></li>
              <li><Link href="/help" className="hover:text-white transition-colors">Methodology & FAQs</Link></li>
              <li><Link href="/settings" className="hover:text-white transition-colors">Settings</Link></li>
            </ul>
          </div>
        </div>

        {/* Regulatory and Educational Disclaimer */}
        <div className="pt-8 border-t border-slate-800 text-xs text-slate-500 space-y-2">
          <p>
            <strong>Educational Planning Notice:</strong> FlexiFund AI is an educational financial resilience indicator, not a credit rating agency, bank, NBFC, or SEBI-registered investment adviser. Resilience scores and what-if calculations are deterministic planning aids derived strictly from user-provided statements.
          </p>
          <p className="flex justify-between items-center pt-2">
            <span>© {new Date().getFullYear()} FlexiFund AI. All rights reserved.</span>
            <span className="text-slate-500 font-medium">Built for Financial Inclusion</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
