'use client';

import React, { useState } from 'react';
import ExportPlanModal from './ExportPlanModal';

interface ExportPlanButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
}

export default function ExportPlanButton({
  className = '',
  variant = 'secondary',
  size = 'md',
}: ExportPlanButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[#2563EB] text-white hover:bg-blue-600 shadow-sm';
      case 'subtle':
        return 'border border-slate-200 dark:border-slate-700 text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-slate-800';
      case 'secondary':
      default:
        return 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-[#2563EB] dark:text-[#60A5FA] hover:bg-blue-100 dark:hover:bg-blue-900/50 shadow-xs';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs rounded-lg gap-1.5';
      case 'lg':
        return 'px-6 py-3 text-sm sm:text-base rounded-2xl gap-2.5 font-bold';
      case 'md':
      default:
        return 'px-4 py-2.5 text-xs sm:text-sm rounded-xl gap-2 font-bold';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center justify-center font-bold transition-all cursor-pointer ${getVariantStyles()} ${getSizeStyles()} ${className}`}
        aria-label="Export My Plan"
      >
        <svg
          className="w-4 h-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span>Export My Plan</span>
      </button>

      <ExportPlanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
