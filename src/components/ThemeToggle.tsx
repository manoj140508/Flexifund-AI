'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggle({ className = '', showLabel = false }: { className?: string; showLabel?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
        isDark
          ? 'bg-[#17243A] border-[#2A3B52] text-[#FBBF24] hover:bg-[#1E304C]'
          : 'bg-white border-[#D7E7F5] text-[#0F2747] hover:bg-[#F5FAFF]'
      } ${className}`}
    >
      {isDark ? (
        <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
      {showLabel && (
        <span className="font-medium">{isDark ? 'Light' : 'Dark'}</span>
      )}
    </button>
  );
}
