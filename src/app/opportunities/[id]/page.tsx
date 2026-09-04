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
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-[#475569] dark:text-[#CBD5E1]">
        <span className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin inline-block mb-3"></span>
        <p className="text-xs">Loading verified scheme specifications...</p>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Program Not Found</h2>
        <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">{error || 'The requested scheme could not be found in the catalog.'}</p>
        <Link href="/opportunities" className="inline-block px-4 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold">
          ← Back to All Opportunities
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#475569] dark:text-[#CBD5E1]">
        <Link href="/opportunities" className="hover:text-[#2563EB] dark:hover:text-[#60A5FA]">
          Opportunities
        </Link>
        <span>/</span>
        <span className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold">{program.name}</span>
      </div>

      {/* Header Card */}
      <div className="bg-white dark:bg-[#0F1B2D] border border-[#D9E5F2] dark:border-[#263A55] rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-[#059669] dark:text-[#34D399] border border-emerald-200 dark:border-emerald-800/40">
            {program.verificationStatus.replace(/_/g, ' ')}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-[#CBD5E1]">
            {program.category}
          </span>
          <span className="text-xs text-[#475569] dark:text-[#CBD5E1]">
            Last verified: {program.lastVerifiedDate}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
          {program.name}
        </h1>
        <p className="text-xs text-[#475569] dark:text-[#CBD5E1] font-medium">
          {program.organization} • {program.jurisdiction}
        </p>
        <p className="text-sm text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed pt-1">
          {program.description}
        </p>

        {/* Highlighted Potential Benefit */}
        <div className="p-4 rounded-xl bg-[#F5F9FD] dark:bg-[#14233A] border border-[#D9E5F2] dark:border-[#263A55] text-xs space-y-1.5">
          <span className="font-bold text-[#059669] dark:text-[#34D399] uppercase text-[11px] tracking-wider block">
            Potential Financial Benefit:
          </span>
          <p className="text-[#0F172A] dark:text-[#F8FAFC] font-medium leading-relaxed">
            {program.potentialBenefit}
          </p>
        </div>

        {/* Verification CTA */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <a
            href={program.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-xs"
          >
            <span>Verify on Official Portal</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <span className="text-[11px] text-[#475569] dark:text-[#CBD5E1]">
            Opens official government portal directly
          </span>
        </div>
      </div>

      {/* Structured Concise Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WHAT IT OFFERS */}
        <div className="bg-white dark:bg-[#0F1B2D] border border-[#D9E5F2] dark:border-[#263A55] rounded-xl p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
            What It Offers
          </h3>
          <ul className="space-y-2 text-xs text-[#0F172A] dark:text-[#F8FAFC]">
            <li className="flex items-start gap-2">
              <span className="text-[#059669] dark:text-[#34D399] font-bold">•</span>
              <span>{program.potentialBenefit}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#059669] dark:text-[#34D399] font-bold">•</span>
              <span>Official social safety support backed by {program.organization}.</span>
            </li>
          </ul>
        </div>

        {/* WHO IT'S FOR */}
        <div className="bg-white dark:bg-[#0F1B2D] border border-[#D9E5F2] dark:border-[#263A55] rounded-xl p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
            Who It&apos;s For
          </h3>
          <ul className="space-y-2 text-xs text-[#0F172A] dark:text-[#F8FAFC]">
            <li className="flex items-start gap-2">
              <span className="text-[#059669] dark:text-[#34D399] font-bold">•</span>
              <span>Target occupations: {program.targetWorkerType}.</span>
            </li>
            {program.criteria.minAge && (
              <li className="flex items-start gap-2">
                <span className="text-[#059669] dark:text-[#34D399] font-bold">•</span>
                <span>Age requirement: {program.criteria.minAge} to {program.criteria.maxAge || 60} years.</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="text-[#059669] dark:text-[#34D399] font-bold">•</span>
              <span>Jurisdiction: {program.jurisdiction}.</span>
            </li>
          </ul>
        </div>

        {/* WHAT YOU NEED */}
        <div className="bg-white dark:bg-[#0F1B2D] border border-[#D9E5F2] dark:border-[#263A55] rounded-xl p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
            What You Need
          </h3>
          <ul className="space-y-2 text-xs text-[#0F172A] dark:text-[#F8FAFC]">
            {program.requiredDocuments.map((doc, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#059669] dark:text-[#34D399] font-bold">✓</span>
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* HOW TO APPLY */}
        <div className="bg-white dark:bg-[#0F1B2D] border border-[#D9E5F2] dark:border-[#263A55] rounded-xl p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
            How to Apply
          </h3>
          <ol className="space-y-2 text-xs text-[#0F172A] dark:text-[#F8FAFC]">
            {program.applicationSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#2563EB] dark:text-[#60A5FA] font-bold">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
