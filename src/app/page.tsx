'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroSliderValue, setHeroSliderValue] = useState(20);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#070C16] text-[#0F2747] dark:text-[#F8FAFC] font-sans antialiased selection:bg-[#2563EB] selection:text-white transition-colors duration-200">
      {/* ============================================================ */}
      {/* 1. COMPACT LANDING PAGE HEADER (Requirement 2) */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#0B1220]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1E293B] transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:bg-blue-600 transition-colors">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[#0F2747] dark:text-[#F8FAFC] font-extrabold text-lg tracking-tight">
                FLEXIFUND
              </span>
              <span className="text-[#2563EB] dark:text-[#60A5FA] font-bold text-xs tracking-wider">AI</span>
            </div>
          </Link>

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#52657A] dark:text-[#94A3B8]">
            <a href="#how-it-works" className="hover:text-[#0F2747] dark:hover:text-white transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-[#0F2747] dark:hover:text-white transition-colors">
              Features
            </a>
            <a href="#safety" className="hover:text-[#0F2747] dark:hover:text-white transition-colors">
              Safety
            </a>
          </nav>

          {/* Right CTAs */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <ThemeToggle />
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-xs"
              >
                Go to my plan →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3.5 py-2 text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-xs"
                >
                  Get started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex sm:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0B1220] px-4 py-4 space-y-3 shadow-lg">
            <div className="flex flex-col space-y-2 text-sm font-semibold text-[#52657A] dark:text-[#94A3B8]">
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#0F2747] dark:hover:text-white"
              >
                How it works
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#0F2747] dark:hover:text-white"
              >
                Features
              </a>
              <a
                href="#safety"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#0F2747] dark:hover:text-white"
              >
                Safety
              </a>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold"
                >
                  Go to my plan →
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC]"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* MAIN BODY */}
      <main className="flex-grow">
        {/* ============================================================ */}
        {/* 2. HERO SECTION & TAGLINE (Requirements 1, 3, 4) */}
        {/* ============================================================ */}
        <section className="pt-12 sm:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center space-y-8">
          <div className="space-y-4 max-w-3xl mx-auto">
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider">
              FLEXIFUND AI
            </span>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight leading-[1.15]">
              Your money plan should move with your income.
            </h1>

            <p className="text-base sm:text-lg text-[#52657A] dark:text-[#CBD5E1] font-medium max-w-2xl mx-auto leading-relaxed">
              When your income changes, your financial plan should change with it.
            </p>

            <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
              FlexiFund AI helps gig and informal workers understand their income, control spending, find potential savings and prepare for lower-income months.
            </p>
          </div>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#2563EB] text-white font-bold text-sm sm:text-base hover:bg-blue-600 transition-all shadow-md active:scale-95"
              >
                Go to my plan ({user?.name}) →
              </Link>
            ) : (
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#2563EB] text-white font-bold text-sm sm:text-base hover:bg-blue-600 transition-all shadow-md active:scale-95"
              >
                Get started →
              </Link>
            )}
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-6 py-4 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#111C2E] text-xs sm:text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              See how it works
            </a>
          </div>

          {/* ============================================================ */}
          {/* 3. HERO VISUAL (Requirement 4: Abstract preview with ₹—) */}
          {/* ============================================================ */}
          <div className="pt-6 max-w-3xl mx-auto">
            <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]">
                    Personal Money Picture Preview
                  </span>
                </div>
                <span className="text-[11px] text-[#52657A] dark:text-[#94A3B8] font-mono">
                  Adaptive Engine
                </span>
              </div>

              {/* 4 Cards with Dash Placeholders */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-[#E2E8F0] dark:border-[#26354D] space-y-1">
                  <span className="text-[11px] font-bold text-[#52657A] dark:text-[#94A3B8] uppercase block">
                    Money coming in
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold font-mono text-[#0F2747] dark:text-[#F8FAFC] block">
                    ₹—
                  </span>
                  <span className="text-[10px] text-[#52657A] dark:text-[#94A3B8]">
                    monthly average
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-[#E2E8F0] dark:border-[#26354D] space-y-1">
                  <span className="text-[11px] font-bold text-[#52657A] dark:text-[#94A3B8] uppercase block">
                    Money going out
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold font-mono text-[#0F2747] dark:text-[#F8FAFC] block">
                    ₹—
                  </span>
                  <span className="text-[10px] text-[#52657A] dark:text-[#94A3B8]">
                    regular expenses
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-[#E2E8F0] dark:border-[#26354D] space-y-1">
                  <span className="text-[11px] font-bold text-[#52657A] dark:text-[#94A3B8] uppercase block">
                    Money left
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold font-mono text-[#2563EB] dark:text-[#60A5FA] block">
                    ₹—
                  </span>
                  <span className="text-[10px] text-[#52657A] dark:text-[#94A3B8]">
                    uncommitted cushion
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-[#E2E8F0] dark:border-[#26354D] space-y-1">
                  <span className="text-[11px] font-bold text-[#52657A] dark:text-[#94A3B8] uppercase block">
                    Potential savings
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 block">
                    ₹—
                  </span>
                  <span className="text-[10px] text-[#52657A] dark:text-[#94A3B8]">
                    sustainable target
                  </span>
                </div>
              </div>

              {/* What if I earn less interactive preview */}
              <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-[#2563EB] dark:text-[#60A5FA]">
                    What if I earn less?
                  </span>
                  <span className="text-xs font-extrabold font-mono text-[#0F2747] dark:text-[#F8FAFC]">
                    -{heroSliderValue}% scenario
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="10"
                  value={heroSliderValue}
                  onChange={(e) => setHeroSliderValue(Number(e.target.value))}
                  className="w-full accent-[#2563EB] cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[#52657A] dark:text-[#94A3B8] font-mono">
                  <span>0%</span>
                  <span>-10%</span>
                  <span>-20%</span>
                  <span>-30%</span>
                  <span>-40%</span>
                </div>
                <p className="text-xs text-[#52657A] dark:text-[#CBD5E1] pt-1">
                  Calculates your real remaining room and safety cushion live as gig income changes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 4. SIMPLE VALUE PROPOSITION (Requirement 5) */}
        {/* ============================================================ */}
        <section className="py-16 bg-white dark:bg-[#0B1220] border-y border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC]">
                Built for income that doesn&apos;t arrive the same way every month.
              </h2>
              <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#94A3B8]">
                Simple financial planning for people with changing income.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Point 1 */}
              <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-[#111C2E] border border-[#E2E8F0] dark:border-[#26354D] space-y-3">
                <span className="text-2xl font-mono font-extrabold text-[#2563EB] dark:text-[#60A5FA] block">
                  01
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                  Understand your money
                </h3>
                <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                  See what is coming in, what is going out and what you have left.
                </p>
              </div>

              {/* Point 2 */}
              <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-[#111C2E] border border-[#E2E8F0] dark:border-[#26354D] space-y-3">
                <span className="text-2xl font-mono font-extrabold text-[#2563EB] dark:text-[#60A5FA] block">
                  02
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                  Find room to save
                </h3>
                <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                  Get a saving target based on your actual income and expenses.
                </p>
              </div>

              {/* Point 3 */}
              <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-[#111C2E] border border-[#E2E8F0] dark:border-[#26354D] space-y-3">
                <span className="text-2xl font-mono font-extrabold text-[#2563EB] dark:text-[#60A5FA] block">
                  03
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                  Prepare for difficult months
                </h3>
                <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                  See what could happen if your income falls.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 5. HOW IT WORKS (Requirement 6) */}
        {/* ============================================================ */}
        <section id="how-it-works" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA]">
              HOW FLEXIFUND WORKS
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC]">
              Four simple steps to your personalized plan.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-xl font-bold">
                📄
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA] block">
                Step 1
              </span>
              <h3 className="text-sm sm:text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                Add your financial activity
              </h3>
              <p className="text-xs text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                Upload a CSV, bank statement PDF or payment screenshot.
              </p>
            </div>

            <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-xl font-bold">
                🔍
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA] block">
                Step 2
              </span>
              <h3 className="text-sm sm:text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                Review what we found
              </h3>
              <p className="text-xs text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                Check and correct your transactions before anything is analyzed.
              </p>
            </div>

            <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-xl font-bold">
                📊
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA] block">
                Step 3
              </span>
              <h3 className="text-sm sm:text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                Get your plan
              </h3>
              <p className="text-xs text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                See your income, expenses, possible savings and financial safety cushion.
              </p>
            </div>

            <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-xl font-bold">
                🛡️
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA] block">
                Step 4
              </span>
              <h3 className="text-sm sm:text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                Plan ahead
              </h3>
              <p className="text-xs text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                Try different income scenarios and understand how they could affect you.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 6. ONE SIMPLE MONEY TOOL: FEATURES (Requirement 7) */}
        {/* ============================================================ */}
        <section id="features" className="py-20 bg-white dark:bg-[#0B1220] border-y border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA]">
                ONE SIMPLE MONEY TOOL
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC]">
                Everything you need to stay in control.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="p-6 rounded-3xl bg-[#F8FAFC] dark:bg-[#111C2E] border border-[#E2E8F0] dark:border-[#26354D] space-y-2.5">
                <span className="text-2xl block">⚡</span>
                <h3 className="text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                  Quick Money Check
                </h3>
                <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                  See how you&apos;re doing in seconds with your cushion and saving target.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-3xl bg-[#F8FAFC] dark:bg-[#111C2E] border border-[#E2E8F0] dark:border-[#26354D] space-y-2.5">
                <span className="text-2xl block">🎙️</span>
                <h3 className="text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                  Add an Expense
                </h3>
                <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                  Type it, speak it or scan a receipt with confirmation before saving.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-3xl bg-[#F8FAFC] dark:bg-[#111C2E] border border-[#E2E8F0] dark:border-[#26354D] space-y-2.5">
                <span className="text-2xl block">💳</span>
                <h3 className="text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                  Can I Spend This?
                </h3>
                <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                  Check how a purchase could affect your budget and savings.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-6 rounded-3xl bg-[#F8FAFC] dark:bg-[#111C2E] border border-[#E2E8F0] dark:border-[#26354D] space-y-2.5">
                <span className="text-2xl block">📉</span>
                <h3 className="text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                  What If I Earn Less?
                </h3>
                <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                  Plan for a lower-income month with live slider scenarios.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="p-6 rounded-3xl bg-[#F8FAFC] dark:bg-[#111C2E] border border-[#E2E8F0] dark:border-[#26354D] space-y-2.5">
                <span className="text-2xl block">💡</span>
                <h3 className="text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                  Find Ways to Save
                </h3>
                <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                  See where you may be able to reduce spending from actual patterns.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="p-6 rounded-3xl bg-[#F8FAFC] dark:bg-[#111C2E] border border-[#E2E8F0] dark:border-[#26354D] space-y-2.5">
                <span className="text-2xl block">🏛️</span>
                <h3 className="text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                  Personalized Support
                </h3>
                <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
                  Find relevant financial support, welfare boards, and schemes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 7. GPAY / SCREENSHOT SUPPORT (Requirement 8) */}
        {/* ============================================================ */}
        <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-8 sm:p-12 shadow-sm space-y-4 text-center max-w-3xl mx-auto">
            <span className="text-3xl block">📱</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC]">
              Upload your payment history
            </h2>
            <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed max-w-xl mx-auto">
              Use a bank statement, CSV or payment screenshot. Review extracted transactions before building your plan.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-[#17243A] text-[#2563EB] dark:text-[#60A5FA] text-xs font-bold border border-slate-200 dark:border-slate-700">
                ✓ Always review before analysis
              </span>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 8. MADE FOR FLEXIBLE INCOME (Requirement 9) */}
        {/* ============================================================ */}
        <section className="py-16 bg-white dark:bg-[#0B1220] border-y border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA]">
                WHO IS IT FOR?
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC]">
                Made for flexible income.
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { label: 'Delivery workers', icon: '🛵' },
                { label: 'Drivers', icon: '🚕' },
                { label: 'Freelancers', icon: '💻' },
                { label: 'Domestic workers', icon: '🧹' },
                { label: 'Construction workers', icon: '🧱' },
                { label: 'Street vendors', icon: '🛒' },
                { label: 'Other informal workers', icon: '📦' },
              ].map((w) => (
                <div
                  key={w.label}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111C2E] border border-[#E2E8F0] dark:border-[#26354D] flex items-center gap-3"
                >
                  <span className="text-2xl">{w.icon}</span>
                  <span className="text-xs sm:text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                    {w.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 9. SAFETY SECTION (Requirement 11) */}
        {/* ============================================================ */}
        <section id="safety" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#0F2747] dark:bg-[#0E1726] text-white rounded-3xl p-8 sm:p-12 shadow-xl space-y-6 text-center max-w-3xl mx-auto border border-slate-700">
            <span className="text-3xl block">🛡️</span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#60A5FA] block">
              YOUR MONEY. YOUR CONTROL.
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold">
              We never need your UPI PIN, OTP, bank password or card security code.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl mx-auto">
              Your financial plan is based strictly on the information you choose to provide. No credential access, ever.
            </p>
            <div className="pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm transition-colors shadow-md"
              >
                <span>Get started with FlexiFund AI</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================ */}
      {/* 10. LANDING PAGE FOOTER (Requirement 26) */}
      {/* ============================================================ */}
      <footer className="border-t border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0B1220] py-10 px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-sm font-extrabold tracking-tight text-[#0F2747] dark:text-[#F8FAFC]">
                FLEXIFUND AI
              </span>
            </div>
            <p className="text-xs text-[#52657A] dark:text-[#94A3B8]">
              “When your income changes, your financial plan should change with it.”
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-[#52657A] dark:text-[#94A3B8]">
            <Link href="/privacy" className="hover:text-[#0F2747] dark:hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/security" className="hover:text-[#0F2747] dark:hover:text-white transition-colors">
              Security
            </Link>
            <Link href="/login" className="hover:text-[#0F2747] dark:hover:text-white transition-colors">
              Login
            </Link>
            <Link href="/signup" className="hover:text-[#0F2747] dark:hover:text-white transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
