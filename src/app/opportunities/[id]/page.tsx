'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BenefitProgram } from '@/domain/schemes';

export default function SingleOpportunityPage() {
  const params = useParams();
  const id = params.id as string;

  const [program, setProgram] = useState<BenefitProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProgram() {
      try {
        const res = await fetch(`/api/opportunities/${id}`);
        if (!res.ok) throw new Error('Scheme not found in catalog');
        const data = await res.json();
        setProgram(data.opportunity);
      } catch (err: any) {
        setError(err.message || 'Failed to load program details');
      } finally {
        setLoading(false);
      }
    }
    fetchProgram();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500">
        <span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin inline-block mb-2"></span>
        <p className="text-xs">Loading verified scheme specifications...</p>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Program Not Found</h2>
        <p className="text-sm text-slate-600">{error || 'The requested scheme could not be found in the catalog.'}</p>
        <Link href="/opportunities" className="inline-block px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold">
          ← Back to All Opportunities
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/opportunities" className="hover:text-slate-900">Opportunities</Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">{program.name}</span>
      </div>

      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            {program.verificationStatus.replace(/_/g, ' ')}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {program.category}
          </span>
          <span className="text-xs text-slate-400">
            Last verified: {program.lastVerifiedDate}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {program.name}
        </h1>
        <p className="text-sm text-slate-600 font-medium">
          Administering Body: {program.organization} ({program.jurisdiction})
        </p>
        <p className="text-sm text-slate-700 leading-relaxed pt-2">
          {program.description}
        </p>

        {/* Highlighted Potential Benefit */}
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm space-y-1">
          <span className="font-bold text-emerald-950 uppercase text-xs tracking-wider">Potential Financial Benefit</span>
          <p className="text-emerald-900 font-medium leading-relaxed">{program.potentialBenefit}</p>
        </div>

        {/* Verification CTA */}
        <div className="pt-2">
          <a
            href={program.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <span>Verify & Apply on Official Portal</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Application Steps & Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Application Steps */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">How to Apply</h3>
          <ol className="list-decimal pl-4 space-y-3 text-xs text-slate-700 leading-relaxed">
            {program.applicationSteps.map((step, i) => (
              <li key={i} className="pl-1">
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Required Documents Checklist */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Required Documents Checklist</h3>
          <ul className="space-y-2 text-xs text-slate-700">
            {program.requiredDocuments.map((doc, i) => (
              <li key={i} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
