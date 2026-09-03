import React from 'react';

export default function SecurityPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-[#059669] dark:text-[#34D399]">Engineering Defense</span>
        <h1 className="text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight mt-1">
          Security Architecture
        </h1>
        <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm mt-1">
          Technical specifications, input sanitization, and server-side secret isolation.
        </p>
      </div>

      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-sm text-[#52657A] dark:text-[#B8C5D6] leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">1. Server-Side Secret Isolation</h2>
          <p>
            All external API keys (including optional AI explanation endpoints) are strictly confined to server-side runtime environments via <code>AI_API_KEY</code>. No secret keys or authentication tokens are ever bundled into client-side JavaScript.
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-[#D7E7F5] dark:border-[#2A3B52]">
          <h2 className="text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">2. Strict Input Validation & Quarantine</h2>
          <p>
            All uploaded statement files and API endpoints undergo rigorous schema validation:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-[#52657A] dark:text-[#B8C5D6]">
            <li><strong>Schema Enforcement:</strong> Every request body is validated against explicit boundary schemas.</li>
            <li><strong>Line-by-Line Quarantine:</strong> Malformed rows, non-date timestamps, and corrupt numeric characters are quarantined into dedicated inspection buckets without crashing processing or discarding valid rows.</li>
            <li><strong>Integer Paise Arithmetic:</strong> All financial arithmetic is computed in integer minor units (paise) to prevent IEEE-754 floating point rounding distortions.</li>
          </ul>
        </section>

        <section className="space-y-2 pt-4 border-t border-[#D7E7F5] dark:border-[#2A3B52]">
          <h2 className="text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">3. Non-Custodial Data Lifecycle</h2>
          <p>
            FlexiFund AI operates on a non-custodial model. We do not maintain unencrypted multi-user databases of consumer banking records. Statements are processed in-memory for the duration of the analysis session.
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-[#D7E7F5] dark:border-[#2A3B52]">
          <h2 className="text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">4. Transparent Calculation Models</h2>
          <p>
            All core financial resilience score calculations, volatility ratings, conservative baseline floors, and what-if scenario planning calculations are transparent pure functions. No opaque models or black-box algorithms determine your numbers.
          </p>
        </section>
      </div>
    </div>
  );
}
