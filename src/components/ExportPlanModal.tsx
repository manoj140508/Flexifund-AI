'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import { exportPdfReport, exportPngReport } from '@/lib/export-generators';

interface ExportPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportPlanModal({ isOpen, onClose }: ExportPlanModalProps) {
  const { analysisResult, profile } = useFinancialData();
  const [generatingType, setGeneratingType] = useState<'PDF' | 'IMAGE' | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportPDF = async () => {
    if (!analysisResult) return;
    setGeneratingType('PDF');
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await exportPdfReport(analysisResult, profile);
      setSuccessMessage('Your report is ready.');
    } catch (err: any) {
      setErrorMessage("We couldn't create the report. Please try again.");
    } finally {
      setGeneratingType(null);
    }
  };

  const handleExportImage = async () => {
    if (!analysisResult) return;
    setGeneratingType('IMAGE');
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await exportPngReport(analysisResult, profile);
      setSuccessMessage('Your report is ready.');
    } catch (err: any) {
      setErrorMessage("We couldn't create the report. Please try again.");
    } finally {
      setGeneratingType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 z-10">
        {/* Header with Close */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC]">
              {analysisResult ? 'Export your financial plan' : 'Export My Plan'}
            </h2>
            <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1] mt-1">
              {analysisResult
                ? 'Download a simple summary of your FlexiFund financial plan.'
                : "Your financial plan isn't ready yet."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export dialog"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-[#52657A] dark:text-[#CBD5E1] hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-sm font-bold transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Missing Data State */}
        {!analysisResult ? (
          <div className="space-y-5 py-2">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1">
              <span className="font-bold block">No financial statement found</span>
              <p>Upload your financial statement to create a personalized report.</p>
            </div>
            <Link
              href="/upload"
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-xl bg-[#2563EB] text-white font-bold text-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Upload statement →</span>
            </Link>
          </div>
        ) : (
          /* Available Analysis Export Options */
          <div className="space-y-4">
            {/* Option 1: PDF */}
            <button
              type="button"
              disabled={generatingType !== null}
              onClick={handleExportPDF}
              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-[#2563EB] dark:hover:border-[#60A5FA] bg-slate-50/70 dark:bg-[#14233A] hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all text-left flex items-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                📄
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                  {generatingType === 'PDF' ? 'Creating PDF…' : 'Export as PDF'}
                </div>
                <div className="text-xs text-[#52657A] dark:text-[#CBD5E1] mt-0.5">
                  Download a PDF report
                </div>
              </div>
              <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] shrink-0">
                {generatingType === 'PDF' ? '⏳' : '↓'}
              </span>
            </button>

            {/* Option 2: Image (PNG) */}
            <button
              type="button"
              disabled={generatingType !== null}
              onClick={handleExportImage}
              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-[#2563EB] dark:hover:border-[#60A5FA] bg-slate-50/70 dark:bg-[#14233A] hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all text-left flex items-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                🖼
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                  {generatingType === 'IMAGE' ? 'Creating image…' : 'Export as Image'}
                </div>
                <div className="text-xs text-[#52657A] dark:text-[#CBD5E1] mt-0.5">
                  Download as PNG (readable on phone)
                </div>
              </div>
              <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] shrink-0">
                {generatingType === 'IMAGE' ? '⏳' : '↓'}
              </span>
            </button>

            {/* Success State */}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-center justify-between">
                <span>✓ {successMessage}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Downloaded</span>
              </div>
            )}

            {/* Error State */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 font-medium flex items-center justify-between">
                <span>⚠️ {errorMessage}</span>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="text-xs font-bold underline hover:text-rose-950 dark:hover:text-white"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            🔒 Real analyzed data only. Never requires bank login or password.
          </p>
        </div>
      </div>
    </div>
  );
}
