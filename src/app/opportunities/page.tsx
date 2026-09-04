'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import { SerializedBenefitMatch } from '@/domain/schemes';

export default function OpportunitiesPage() {
  const { profile } = useFinancialData();
  const [matches, setMatches] = useState<SerializedBenefitMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const query = new URLSearchParams({
          workerCategory: profile.workerType || 'GIG_PLATFORM',
          age: profile.age ? String(profile.age) : '28',
          hasBankAccount: profile.hasBankAccount ? 'true' : 'false',
          isCoveredUnderEPFO_ESIC: profile.isCoveredUnderEPFO_ESIC ? 'true' : 'false',
          state: profile.state || profile.jurisdiction || 'Karnataka',
        });
        const res = await fetch(`/api/opportunities?${query.toString()}`);
        const data = await res.json();
        setMatches(data.matches || []);
      } catch {
        // Fallback gracefully
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, [profile]);

  const likelyMatches = matches.filter(
    (m) => m.status === 'LIKELY_MATCH' || m.status === 'POSSIBLE_MATCH'
  );
  const topMatches = likelyMatches.length > 0 ? likelyMatches : matches.slice(0, 6);

  const getWhyItFits = (match: SerializedBenefitMatch) => {
    const userWorker = (profile.workerType || 'informal worker').replace(/_/g, ' ').toLowerCase();
    const userState = profile.state || profile.jurisdiction || 'your state';

    if (match.status === 'LIKELY_MATCH' || match.status === 'POSSIBLE_MATCH') {
      return `Designed for ${userWorker}s living in ${userState}.`;
    }
    return `Available for informal and self-employed workers meeting age and income requirements.`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
            Support you may be able to use
          </h1>
          <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
            Government support, worker benefits, insurance, and pensions matched to your work.
          </p>
        </div>

        <Link
          href="/profile"
          className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline shrink-0"
        >
          Change worker type or state ({profile.state || 'Karnataka'}) →
        </Link>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="py-16 text-center text-[#52657A] dark:text-[#CBD5E1] space-y-3">
          <div className="w-8 h-8 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs">Finding programs that match your work and state...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-8 text-center space-y-4">
          <span className="text-3xl">🏛️</span>
          <h3 className="text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">
            No programs found yet
          </h3>
          <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] max-w-md mx-auto">
            Update your profile with your occupation and state to view matching welfare programs.
          </p>
          <Link
            href="/profile"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors"
          >
            Update Profile →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {topMatches.map((match) => (
            <div
              key={match.program.id}
              className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#2563EB] dark:hover:border-[#60A5FA] transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA]">
                    {match.program.category.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-[#059669] dark:text-[#34D399]">
                    Eligible match
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-[#0F2747] dark:text-[#F8FAFC] leading-snug">
                  {match.program.name}
                </h3>

                <p className="text-xs text-[#52657A] dark:text-[#CBD5E1] line-clamp-2 leading-relaxed">
                  {match.program.description}
                </p>

                {/* Why this may be relevant to you */}
                <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#17243A] border border-[#E2E8F0] dark:border-[#26354D] text-xs space-y-1">
                  <span className="font-bold text-[#0F2747] dark:text-[#F8FAFC] block">
                    Why this may be relevant to you:
                  </span>
                  <p className="text-[#52657A] dark:text-[#CBD5E1]">
                    {getWhyItFits(match)}
                  </p>
                </div>

                {/* Potential Benefit */}
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-[#0F2747] dark:text-[#F8FAFC] block">
                    Benefit:
                  </span>
                  <span className="text-xs font-semibold text-[#059669] dark:text-[#34D399]">
                    {match.program.potentialBenefit}
                  </span>
                </div>
              </div>

              {/* Check Official Eligibility Button */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <a
                  href={match.program.officialUrl || 'https://eshram.gov.in'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#2563EB] hover:text-white dark:hover:bg-[#2563EB] text-[#0F2747] dark:text-[#F8FAFC] text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <span>Check official eligibility</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Official Disclaimer */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-[11px] text-[#52657A] dark:text-[#94A3B8] leading-relaxed">
        <strong>Important notice: </strong>
        Eligibility is determined solely by government welfare boards and official program guidelines. FlexiFund AI does not guarantee enrollment or award benefits. Always verify terms on the official government website before applying.
      </div>
    </div>
  );
}
