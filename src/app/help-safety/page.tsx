import React from 'react';

export default function HelpSafetyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">

      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">❓</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
            Help &amp; Safety
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
          How FlexiFund works and how to keep your money safe.
        </p>
      </div>

      {/* 1. HOW FLEXIFUND WORKS */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F2747] dark:text-[#F8FAFC] flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-xs font-extrabold">
            1
          </span>
          How FlexiFund Works
        </h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <span className="w-10 h-10 rounded-xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] flex items-center justify-center text-xl shrink-0">
              📤
            </span>
            <div>
              <p className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                Upload your financial activity
              </p>
              <p className="text-xs text-[#52657A] dark:text-[#CBD5E1] mt-0.5">
                Share your bank statement (CSV or PDF) or a GPay / payment app screenshot. FlexiFund reads the transactions from it.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <span className="w-10 h-10 rounded-xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] flex items-center justify-center text-xl shrink-0">
              🔍
            </span>
            <div>
              <p className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                Review what we found
              </p>
              <p className="text-xs text-[#52657A] dark:text-[#CBD5E1] mt-0.5">
                You see every extracted transaction before anything is used. You can edit, remove, or add entries manually. Nothing is confirmed without your review.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <span className="w-10 h-10 rounded-xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] flex items-center justify-center text-xl shrink-0">
              📄
            </span>
            <div>
              <p className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                We build your financial plan
              </p>
              <p className="text-xs text-[#52657A] dark:text-[#CBD5E1] mt-0.5">
                FlexiFund uses your confirmed transactions to calculate your income, expenses, savings range, and safety cushion — and gives you a simple, personalised plan.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FINANCIAL SAFETY */}
      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-rose-800 dark:text-rose-200 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center justify-center text-xs font-extrabold">
            ⚠️
          </span>
          Financial Safety
        </h2>

        <div className="bg-white dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-700 p-5 space-y-2">
          <p className="text-sm font-extrabold text-rose-800 dark:text-rose-200">
            FlexiFund AI will <span className="underline">never</span> ask for:
          </p>
          <ul className="space-y-1.5 text-sm text-rose-700 dark:text-rose-300">
            {[
              'Your UPI PIN',
              'OTP (one-time password)',
              'Bank account password or net banking password',
              'CVV (the 3-digit number on the back of your card)',
              'Card PIN or ATM PIN',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-rose-700/80 dark:text-rose-300 leading-relaxed">
          If anyone contacts you claiming to be from FlexiFund and asks for any of these, do not share them. It is a scam.
        </p>
      </div>

      {/* 3. CHECK YOUR TRANSACTIONS */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F2747] dark:text-[#F8FAFC] flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-extrabold">
            ✓
          </span>
          Check Your Transactions
        </h2>
        <p className="text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
          After uploading your statement, FlexiFund shows you every extracted transaction for review.
          <strong className="text-[#0F2747] dark:text-[#F8FAFC]"> Always check that the amounts and descriptions look correct</strong> before confirming.
          If something looks wrong, you can remove or edit it.
        </p>
        <div className="p-4 rounded-xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] text-xs text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
          Entries you confirm are used to build your financial plan. Incorrect entries will produce incorrect results — so reviewing them is important.
        </div>
      </div>

      {/* 4. YOUR DATA */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F2747] dark:text-[#F8FAFC] flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-xs font-extrabold">
            🔒
          </span>
          Your Data
        </h2>
        <div className="space-y-3 text-sm text-[#52657A] dark:text-[#CBD5E1] leading-relaxed">
          <p>
            FlexiFund processes your uploaded statement to extract transactions and build your financial plan.
            Your session data is stored temporarily in your browser only.
          </p>
          <p>
            FlexiFund does not sell your financial data to third parties.
            FlexiFund does not give financial advice or broker loans.
          </p>
          <p>
            All calculations shown — income averages, savings ranges, resilience scores — are
            educational tools to help you understand your own financial situation.
            They are not guarantees or predictions.
          </p>
        </div>
      </div>

      {/* 5. Getting more help */}
      <div className="p-5 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <p className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
            Need further help?
          </p>
          <p className="text-xs text-[#52657A] dark:text-[#CBD5E1] mt-0.5">
            See how FlexiFund calculates your financial health scores and what each term means.
          </p>
        </div>
        <a
          href="/help"
          className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline shrink-0"
        >
          Methodology FAQ →
        </a>
      </div>

    </div>
  );
}
