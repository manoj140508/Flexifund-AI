'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import { SerializedBenefitMatch } from '@/domain/schemes';
import EmptyState from '@/components/EmptyState';

export default function OpportunitiesPage() {
  const { profile } = useFinancialData();
  const [matches, setMatches] = useState<SerializedBenefitMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const hasProfile = Boolean(profile.age || profile.workerType);

  useEffect(() => {
    async function fetchMatches() {
      if (!hasProfile) {
        setLoading(false);
        return;
      }
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
  }, [profile, hasProfile]);

  if (!hasProfile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          title="No personalized opportunities yet."
          description="Complete your profile and financial analysis to see relevant verified opportunities."
          actionText="Complete Profile"
          actionHref="/profile"
        />
      </div>
    );
  }

  const likelyMatches = matches.filter((m) => m.status === 'LIKELY_MATCH' || m.status === 'POSSIBLE_MATCH');
  const otherOpportunities = matches.filter((m) => m.status === 'MORE_INFO_NEEDED' || m.status === 'NOT_MATCHED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#059669] dark:text-[#34D399]">
            Verified Social Security
          </span>
          <h1 className="text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight mt-1">
            Government Welfare & Worker Support
          </h1>
          <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm mt-1 max-w-2xl">
            Real, published Indian government schemes and social security programs tailored for gig and informal workers. <strong>All programs are verified against official portals.</strong>
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg border border-[#D7E7F5] dark:border-[#2A3B52] text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start md:self-auto shadow-xs"
        >
          ← Back to Overview
        </Link>
      </div>

      {/* Trust Notice */}
      <div className="p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] text-xs text-[#52657A] dark:text-[#B8C5D6] flex items-start gap-2">
        <svg className="w-4 h-4 text-[#059669] dark:text-[#34D399] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          <strong>Eligibility Transparency:</strong> We never claim “You are definitely eligible.” We provide objective preliminary match assessments based on your profile. Always verify your eligibility on the official government portal.
        </span>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-12 text-center text-[#52657A] dark:text-[#B8C5D6]">
          <span className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin inline-block mb-2"></span>
          <p className="text-xs">Matching your profile against verified welfare schemes...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* 1. Potential Matches for You */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#059669] dark:bg-[#34D399]"></span>
              <h2 className="text-xl font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                Potential Matches for You ({likelyMatches.length})
              </h2>
            </div>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] -mt-2">
              Schemes where your reported occupation, age, and unorganised status align with published criteria.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {likelyMatches.map((match) => (
                <div
                  key={match.program.id}
                  className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        {match.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-[#52657A] dark:text-[#B8C5D6] font-medium">
                        {match.program.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC] leading-snug">
                      {match.program.name}
                    </h3>
                    <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] font-medium">
                      {match.program.organization}
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                      {match.program.description}
                    </p>
                  </div>

                  {/* Potential Benefit Box */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1">
                    <span className="font-bold text-emerald-950 dark:text-emerald-200 uppercase text-[10px] tracking-wide">
                      Potential Benefit:
                    </span>
                    <p className="text-emerald-900 dark:text-emerald-300 font-medium leading-relaxed">
                      {match.program.potentialBenefit}
                    </p>
                  </div>

                  {/* Why it matched */}
                  <div className="text-xs text-[#52657A] dark:text-[#B8C5D6] space-y-1">
                    <div className="font-bold text-[#0F2747] dark:text-[#F8FAFC]">Why this was matched:</div>
                    <p>{match.whyMatched}</p>
                  </div>

                  {/* Required Documents */}
                  <div className="text-xs text-[#52657A] dark:text-[#B8C5D6] pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <span className="font-semibold text-[#0F2747] dark:text-[#F8FAFC]">Required Documents:</span>
                    <p className="text-[11px] text-[#52657A] dark:text-[#B8C5D6]">
                      {match.program.requiredDocuments.join(', ')}
                    </p>
                  </div>

                  {/* Action CTA */}
                  <div className="flex items-center justify-between pt-2">
                    <Link
                      href={`/opportunities/${match.program.id}`}
                      className="text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA] hover:underline"
                    >
                      View Details →
                    </Link>
                    <a
                      href={match.officialVerificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <span>Verify on Official Source</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Other Available Schemes */}
          {otherOpportunities.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-[#D7E7F5] dark:border-[#2A3B52]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <h2 className="text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                  Other Welfare Programs ({otherOpportunities.length})
                </h2>
              </div>
              <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] -mt-2">
                Schemes where profile data doesn&apos;t meet published criteria or more specific verification is needed.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {otherOpportunities.map((match) => (
                  <div
                    key={match.program.id}
                    className="bg-white/80 dark:bg-[#111C2E]/70 border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-5 shadow-sm space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm text-[#0F2747] dark:text-[#F8FAFC]">{match.program.name}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {match.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-[#52657A] dark:text-[#B8C5D6]">{match.program.description}</p>
                    <div className="text-[11px] text-[#52657A] dark:text-[#B8C5D6] pt-1">
                      <strong>Assessment:</strong> {match.whyMatched}
                    </div>
                    <div className="pt-2 flex justify-between items-center text-xs">
                      <Link
                        href={`/opportunities/${match.program.id}`}
                        className="text-[#2563EB] dark:text-[#60A5FA] font-semibold hover:underline"
                      >
                        Details →
                      </Link>
                      <a
                        href={match.officialVerificationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#52657A] dark:text-[#B8C5D6] hover:text-[#0F2747] dark:hover:text-white underline text-[11px]"
                      >
                        Official Portal
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
