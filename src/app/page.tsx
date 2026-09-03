import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const capabilities = [
    {
      badge: 'Income Analysis',
      title: 'UNDERSTAND YOUR INCOME',
      description: 'Analyze irregular earnings and income volatility to establish a reliable planning baseline.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      link: '/onboarding',
    },
    {
      badge: 'Expense Categorization',
      title: 'UNDERSTAND YOUR EXPENSES',
      description: 'See where your money goes, separate essential living costs from flexible spending, and identify potential savings.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      link: '/onboarding',
    },
    {
      badge: 'Emergency Defense',
      title: 'BUILD RESILIENCE',
      description: 'Understand emergency-buffer coverage and financial resilience based on real essential daily burn rates.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      link: '/onboarding',
    },
    {
      badge: 'Scenario Planning',
      title: 'PREPARE FOR INCOME SHOCKS',
      description: 'See what happens if income falls or living expenses rise, helping you stress-test your cash buffer safely.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      link: '/onboarding',
    },
    {
      badge: 'Commitment Check',
      title: 'CHECK FINANCIAL COMMITMENTS',
      description: 'Understand how a proposed loan or EMI repayment could affect your cash flow during quiet and lean months.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      link: '/onboarding',
    },
    {
      badge: 'Surplus Identification',
      title: 'FIND POTENTIAL SAVINGS',
      description: 'Identify evidence-based areas where discretionary spending and recurring charges may potentially be reduced.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      link: '/onboarding',
    },
    {
      badge: 'Welfare Navigator',
      title: 'DISCOVER VERIFIED OPPORTUNITIES',
      description: 'Find potentially relevant government welfare programs and financial opportunities matched to your profile.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      link: '/opportunities',
    },
    {
      badge: 'Action Framework',
      title: 'BUILD YOUR ACTION PLAN',
      description: 'Get prioritized next steps based on your actual financial situation, organized by impact and urgency.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      link: '/onboarding',
    },
  ];

  return (
    <div className="space-y-24 py-8 md:py-12 transition-colors">
      {/* 1. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-12 text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E0F2FE]/80 dark:bg-blue-950/60 border border-[#D7E7F5] dark:border-[#2A3B52] text-[#2563EB] dark:text-[#60A5FA] text-xs font-bold tracking-wider uppercase mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          FINANCIAL RESILIENCE FOR VARIABLE INCOME
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight max-w-5xl mx-auto leading-[1.1]">
          Financial planning for income that{' '}
          <span className="underline decoration-[#2563EB] dark:decoration-[#60A5FA] decoration-3 underline-offset-8">
            doesn’t behave like a salary.
          </span>
        </h1>

        {/* Supporting Text */}
        <p className="mt-8 text-lg sm:text-xl text-[#52657A] dark:text-[#B8C5D6] max-w-3xl mx-auto leading-relaxed font-normal">
          FlexiFund AI helps gig and informal workers understand irregular income, find potential savings, prepare for income shocks, and discover verified financial-support opportunities.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/onboarding"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#2563EB] text-white font-bold text-base hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
          >
            Check my financial resilience
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-4 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] bg-white dark:bg-[#111C2E] text-[#0F2747] dark:text-[#F8FAFC] font-bold text-base hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            See how it works
          </a>
        </div>

        {/* Trust Notice */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-[#52657A] dark:text-[#B8C5D6]">
          <svg className="w-4 h-4 text-[#059669] dark:text-[#34D399]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>No bank password, PIN, OTP, CVV or UPI PIN required.</span>
        </div>

        {/* Clean Conceptual Flow Visual (NO fake values, NO fake charts) */}
        <div className="mt-16 max-w-4xl mx-auto bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-10 shadow-sm">
          <div className="text-center max-w-md mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
              Adaptive Model
            </span>
            <h2 className="text-xl font-bold text-[#0F2747] dark:text-[#F8FAFC] mt-1">
              How FlexiFund AI Works With Irregular Income
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] text-left space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[#2563EB]/10 dark:bg-blue-900/30 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="font-bold text-[#0F2747] dark:text-[#F8FAFC] text-base">Income Changes</h3>
              <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-relaxed">
                Gig earnings and contract payouts fluctuate weekly based on platform demand and seasonality.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] text-left space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[#2563EB]/10 dark:bg-blue-900/30 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="font-bold text-[#0F2747] dark:text-[#F8FAFC] text-base">Financial Analysis</h3>
              <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-relaxed">
                Evaluates essential living burn vs volatile cash flow to calculate your conservative floor and buffer runway.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] text-left space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[#059669]/10 dark:bg-emerald-900/30 text-[#059669] dark:text-[#34D399] flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="font-bold text-[#0F2747] dark:text-[#F8FAFC] text-base">Adaptive Planning</h3>
              <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-relaxed">
                Dynamic savings ranges, safe repayment thresholds, and prioritized steps that change when income changes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE 8 CORE CAPABILITIES */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12 scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
            Comprehensive Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight mt-2">
            Built for independent, gig, and informal workers.
          </h2>
          <p className="mt-4 text-[#52657A] dark:text-[#B8C5D6] text-base leading-relaxed">
            Everything you need to understand cash flow, safeguard essentials, and make confident financial decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {capabilities.map((item, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-[#2563EB]/40 dark:hover:border-[#60A5FA]/40 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#52657A] dark:text-[#8FA2B8]">
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
                  {item.title}
                </h3>
                <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <Link
                  href={item.link}
                  className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline inline-flex items-center gap-1"
                >
                  <span>Explore capability</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. THE PROBLEM VS FLEXIFUND COMPARISON */}
      <section className="bg-white dark:bg-[#111C2E] border-y border-[#D7E7F5] dark:border-[#2A3B52] py-20 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
              The Core Difference
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight mt-2">
              Traditional banking tools assume you earn the same amount on the 1st of every month.
            </h2>
            <p className="mt-4 text-[#52657A] dark:text-[#B8C5D6] text-base leading-relaxed">
              For delivery partners, cab drivers, tradespeople, and freelance contractors, earnings fluctuate significantly. Rigid rules like “save 20% every month” create cash flow distress when work slows down.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-3xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] space-y-4">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm">
                ✕
              </div>
              <h3 className="text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC]">The Salaried Banking Paradigm</h3>
              <ul className="space-y-3 text-sm text-[#52657A] dark:text-[#B8C5D6]">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>Assumes a single fixed monthly credit on a calendar date</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>Budgets around average earnings, triggering overdrafts during slow periods</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>Rigid recurring commitments that don&apos;t adapt to seasonal downturns</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>Ignores government welfare and social protection programs</span>
                </li>
              </ul>
            </div>

            <div className="p-8 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-[#059669] dark:bg-[#34D399] text-white dark:text-slate-950 flex items-center justify-center font-bold text-sm">
                ✓
              </div>
              <h3 className="text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC]">The FlexiFund AI Paradigm</h3>
              <ul className="space-y-3 text-sm text-[#0F2747] dark:text-[#F8FAFC]">
                <li className="flex items-start gap-2">
                  <span className="text-[#059669] dark:text-[#34D399] font-bold mt-0.5">✓</span>
                  <span>Designs around weekly platform disbursements and shifting work</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#059669] dark:text-[#34D399] font-bold mt-0.5">✓</span>
                  <span>Anchors living expenses to a conservative baseline floor</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#059669] dark:text-[#34D399] font-bold mt-0.5">✓</span>
                  <span>Dynamic savings targets: build cushion during peaks, ₹0 obligations during lulls</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#059669] dark:text-[#34D399] font-bold mt-0.5">✓</span>
                  <span>Direct matching with verified welfare schemes (e-Shram, PM-SYM, PM SVANidhi)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THREE STEPS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
            Simple Process
          </span>
          <h2 className="text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight mt-2">
            Three steps to complete financial clarity
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm mx-auto sm:mx-0">
              1
            </div>
            <h3 className="text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">Upload Your Statement</h3>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-relaxed">
              Provide a CSV, bank statement PDF, or a photo/screenshot of your statement. No banking login or credentials needed.
            </p>
          </div>

          <div className="space-y-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm mx-auto sm:mx-0">
              2
            </div>
            <h3 className="text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">Review Extracted Rows</h3>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-relaxed">
              Inspect extracted transactions, adjust classifications if needed, and confirm before our financial engine analyzes your data.
            </p>
          </div>

          <div className="space-y-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm mx-auto sm:mx-0">
              3
            </div>
            <h3 className="text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">Take Prioritized Action</h3>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-relaxed">
              Receive an explainable Resilience Score, discover verified government schemes, and test loan repayments safely.
            </p>
          </div>
        </div>
      </section>

      {/* 5. PRIVACY & SECURITY STATEMENT */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#0F2747] dark:bg-[#17243A] text-white p-8 sm:p-12 space-y-6 shadow-sm border border-transparent dark:border-[#2A3B52]">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-widest text-[#60A5FA]">
              Zero Credential Access
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-[#F8FAFC]">
              Your financial privacy is non-negotiable.
            </h2>
            <p className="text-[#B8C5D6] text-sm mt-3 leading-relaxed">
              FlexiFund AI will never ask for your net banking password, debit card PIN, OTP, UPI PIN, or CVV. You upload your statement or enter values voluntarily. All calculations are performed in temporary application memory without third-party ad brokers.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 pt-2 text-xs font-medium text-slate-200 dark:text-[#B8C5D6]">
            <span className="flex items-center gap-1.5">✓ No Bank Passwords</span>
            <span className="flex items-center gap-1.5">✓ No OTPs / UPI PINs</span>
            <span className="flex items-center gap-1.5">✓ Client-Side / Session Data Control</span>
            <span className="flex items-center gap-1.5">✓ Direct Official Portal Links</span>
          </div>
        </div>
      </section>

      {/* 6. BOTTOM CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6 py-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
          Ready to build genuine financial resilience?
        </h2>
        <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm max-w-xl mx-auto leading-relaxed">
          See how an adaptive financial plan protects your living essentials, prepares you for slow seasons, and unlocks verified worker benefits.
        </p>
        <div className="pt-2">
          <Link
            href="/onboarding"
            className="inline-block px-8 py-4 rounded-xl bg-[#2563EB] text-white font-bold text-sm hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
          >
            Check my financial resilience →
          </Link>
        </div>
      </section>
    </div>
  );
}
