import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Transparency & Data Rights</span>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
          Privacy Policy
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          How FlexiFund AI handles financial data, statement uploads, and user parameters.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">1. Core Privacy Architecture: Zero Credential Access</h2>
          <p>
            FlexiFund AI is engineered with a strict <strong>Zero Credential Access</strong> design. We never ask for, collect, process, or store:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
            <li>Net banking user IDs or passwords</li>
            <li>One-Time Passwords (OTPs)</li>
            <li>Unified Payments Interface (UPI) PINs</li>
            <li>Debit or credit card numbers, CVVs, or card PINs</li>
            <li>Bank account login credentials</li>
          </ul>
        </section>

        <section className="space-y-2 pt-4 border-t border-slate-100">
          <h2 className="text-base font-bold text-slate-900">2. How Statement Data is Processed</h2>
          <p>
            When you upload a transaction CSV file:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
            <li><strong>Transient Ingestion:</strong> Statements are parsed in server application memory or local browser session storage solely to compute deterministic cash flow metrics.</li>
            <li><strong>No Ad Targeting:</strong> Your transaction records are never shared with advertising networks, third-party data brokers, or marketing affiliates.</li>
            <li><strong>Local Control:</strong> You can clear your active statement session at any moment via the Profile or Settings screen.</li>
          </ul>
        </section>

        <section className="space-y-2 pt-4 border-t border-slate-100">
          <h2 className="text-base font-bold text-slate-900">3. Current Liquid Cash Balance</h2>
          <p>
            We do not infer or guess your liquid bank balance from historical statement inflows and outflows. Your available cash buffer is entered voluntarily by you. If you choose not to provide it, emergency runway metrics are marked as unconfirmed.
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-slate-100">
          <h2 className="text-base font-bold text-slate-900">4. Third-Party Welfare Portals</h2>
          <p>
            When you choose to verify government support schemes (e.g., e-Shram, PM-SYM, PM SVANidhi), you are redirected directly to official government portals (.gov.in / .nic.in). FlexiFund AI does not act as an intermediary or collect fees for government benefit enrollment.
          </p>
        </section>

        <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
          Last updated: January 2024 • FlexiFund AI Educational Architecture
        </div>
      </div>
    </div>
  );
}
