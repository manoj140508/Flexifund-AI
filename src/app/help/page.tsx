import React from 'react';
import Link from 'next/link';

export default function HelpPage() {
  const faqs = [
    {
      q: 'How does FlexiFund AI differ from regular budgeting apps?',
      a: 'Standard apps ask “What is your monthly salary?” and assume steady income on the 1st of each month. FlexiFund AI recognizes that gig and informal workers experience 30% to 70% income variance. We calculate a conservative planning floor, dynamic savings ranges (down to ₹0 in lean months), and test what happens when income drops.',
    },
    {
      q: 'What is the Conservative Planning Reference?',
      a: 'Instead of budgeting around your average income, which creates deficits during slow weeks, the conservative baseline is your estimated 20th percentile income floor (or mean minus standard deviation factor). If your essential living commitments fit within this floor, you remain solvent during lean seasons.',
    },
    {
      q: 'How is the Resilience Score (0–100) calculated?',
      a: 'The score is 100% explainable across four weighted components: Emergency Expense Coverage (40%), Income Predictability (25%), Expense Flexibility (20%), and Debt Burden (15%). Each component shows exact earned points and calculation basis.',
    },
    {
      q: 'Why do you ask for my current liquid cash balance separately?',
      a: 'A historical bank statement only records past transactions. It does not prove how much liquid cash you have in your account or wallet today. We never pretend past statement net flow is your current bank balance.',
    },
    {
      q: 'What CSV file formats does the upload tool accept?',
      a: 'We automatically detect Format A (Date, Description, Amount, Type), Format B (Date, Description, Debit, Credit), and Format C (Date, Particulars, Withdrawal, Deposit, Balance). You can download a standard template on the Upload page.',
    },
    {
      q: 'Are government welfare matches guaranteed benefits?',
      a: 'No. FlexiFund matches your reported occupation, age, and unorganised status against published criteria for official programs (e-Shram, PM-SYM, PM SVANidhi, PMJJBY, PMSBY). We show what matched, what documents you need, and provide direct links to official .gov.in portals to verify and apply.',
    },
    {
      q: 'Does FlexiFund AI sell or approve loans?',
      a: 'No. FlexiFund provides responsible educational decision support only. We evaluate whether a proposed monthly repayment might create cash flow stress during lean months. We do not sell, broker, or underwrite credit.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-[#059669] dark:text-[#34D399]">Educational Guidance</span>
        <h1 className="text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight mt-1">
          Methodology & Frequently Asked Questions
        </h1>
        <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm mt-1">
          How our models evaluate volatility, buffer runway, and welfare matches.
        </p>
      </div>

      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm divide-y divide-[#D7E7F5] dark:divide-[#2A3B52]">
        {faqs.map((faq, idx) => (
          <div key={idx} className="py-5 first:pt-0 last:pb-0 space-y-2">
            <h3 className="font-bold text-[#0F2747] dark:text-[#F8FAFC] text-base">
              {faq.q}
            </h3>
            <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm leading-relaxed">
              {faq.a}
            </p>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-base text-[#0F2747] dark:text-[#F8FAFC]">Ready to analyze your statement?</h4>
          <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] mt-0.5">Upload a bank statement in CSV, PDF, or screenshot format to get started.</p>
        </div>
        <Link
          href="/upload"
          className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white font-bold text-xs hover:bg-blue-600 transition-colors shrink-0 text-center shadow-sm"
        >
          Go to Statement Upload →
        </Link>
      </div>
    </div>
  );
}
