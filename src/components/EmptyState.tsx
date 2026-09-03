'use client';

import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  actionHref?: string;
}

export default function EmptyState({
  title = 'Your financial picture starts here.',
  description = 'Upload a CSV, PDF statement, or statement screenshot to begin.',
  actionText = 'Upload financial data',
  actionHref = '/upload',
}: EmptyStateProps) {
  return (
    <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto shadow-sm my-8 transition-colors">
      <div className="w-12 h-12 bg-[#E0F2FE] dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      <h3 className="text-xl font-bold text-[#0F2747] dark:text-[#F8FAFC] mb-2 tracking-tight">
        {title}
      </h3>
      <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm max-w-md mx-auto mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex items-center justify-center">
        <Link
          href={actionHref}
          className="px-6 py-3 rounded-xl bg-[#2563EB] text-white font-bold text-xs sm:text-sm hover:bg-blue-600 transition-colors shadow-sm inline-flex items-center gap-2"
        >
          <span>{actionText}</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
