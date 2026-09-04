'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import { exportPdfReport, exportImageReport } from '@/lib/export-generators';

export default function ExportPage() {
  const { analysisResult, profile } = useFinancialData();
  const [selectedFormat, setSelectedFormat] = useState<'PDF' | 'IMAGE'>('PDF');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  if (!analysisResult) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-8 sm:p-12 shadow-sm space-y-6 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-3xl mx-auto font-bold shadow-inner">
            📄
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC]">
              Your financial plan isn&apos;t ready yet.
            </h1>
            <p className="text-sm text-[#52657A] dark:text-[#CBD5E1]">
              Upload your financial statement to create a personalized report.
            </p>
          </div>
          <div>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#2563EB] text-white font-bold text-sm hover:bg-blue-600 transition-colors shadow-sm"
            >
              <span>Upload statement →</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleExport = async () => {
    setIsGenerating(true);
    setStatusMessage(null);

    try {
      if (selectedFormat === 'PDF') {
        await exportPdfReport(analysisResult, profile);
        setStatusMessage({
          type: 'success',
          text: '✓ Financial Resilience PDF Report downloaded successfully.',
        });
      } else {
        await exportImageReport(analysisResult, profile);
        setStatusMessage({
          type: 'success',
          text: '✓ Mobile-readable PNG Financial Report image downloaded successfully.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Export failed: ${err?.message || 'Unable to render report file. Please try again.'}`,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySummary = () => {
    const res = analysisResult.resilienceAnalysis;
    const inc = analysisResult.incomeAnalysis;
    const exp = analysisResult.expenseAnalysis;
    const cap = analysisResult.savingsCapacity;

    const summary =
      `FlexiFund AI — Financial Resilience Summary\n` +
      `Resilience Score: ${res.resilienceScore !== null ? `${res.resilienceScore}/100` : 'N/A'}\n` +
      `Conservative Floor Income: ₹${(Number(inc.conservativeBaselineMonthly.paise) / 100).toLocaleString('en-IN')}/mo\n` +
      `Essential Monthly Outflow: ₹${(Number(exp.essentialMonthlyBurn.paise) / 100).toLocaleString('en-IN')}/mo\n` +
      `Emergency Runway: ${res.bufferCoverageDays !== null ? `${res.bufferCoverageDays} Days` : 'Cash balance not provided'}\n` +
      `Savings Capacity Range: ₹${(Number(cap.minimumMonthlySavings.paise) / 100).toLocaleString('en-IN')} – ₹${(Number(cap.maximumMonthlySavings.paise) / 100).toLocaleString('en-IN')}/mo\n` +
      `Generated: ${new Date(analysisResult.metadata.generatedAt).toLocaleDateString('en-IN')}`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const res = analysisResult.resilienceAnalysis;
  const inc = analysisResult.incomeAnalysis;
  const exp = analysisResult.expenseAnalysis;
  const cap = analysisResult.savingsCapacity;

  const formatINR = (paiseStr?: string | null) => {
    if (!paiseStr) return '₹0';
    const val = Number(paiseStr) / 100;
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#059669] dark:text-[#34D399]">
              Data Portability
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-[#52657A] dark:text-[#B8C5D6]">
              Professional Reports
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight mt-1">
            Export Financial Resilience Report
          </h1>
          <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm mt-1">
            Export your empirical financial resilience analysis as a clean multi-page PDF document or vertical mobile-friendly image.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg border border-[#D7E7F5] dark:border-[#2A3B52] text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto shadow-xs"
        >
          ← Back to Overview
        </Link>
      </div>

      {/* In-App Feedback Banner (No browser alerts) */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
          }`}
        >
          <span className="font-semibold">{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Export Format Selector */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
          Choose Export Format
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option 1: PDF */}
          <button
            type="button"
            onClick={() => setSelectedFormat('PDF')}
            className={`p-5 rounded-2xl border text-left transition-all ${
              selectedFormat === 'PDF'
                ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-600/20'
                : 'border-[#D7E7F5] dark:border-[#2A3B52] hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-[#0F2747] dark:text-[#F8FAFC]">
                📄 PDF Report (.pdf)
              </span>
              {selectedFormat === 'PDF' && (
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              )}
            </div>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-relaxed">
              Multi-page formal dossier containing executive summary, income volatility, burn rate tables, savings capacity range, identified opportunities, and prioritized actions.
            </p>
          </button>

          {/* Option 2: Image PNG */}
          <button
            type="button"
            onClick={() => setSelectedFormat('IMAGE')}
            className={`p-5 rounded-2xl border text-left transition-all ${
              selectedFormat === 'IMAGE'
                ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-600/20'
                : 'border-[#D7E7F5] dark:border-[#2A3B52] hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-[#0F2747] dark:text-[#F8FAFC]">
                🖼️ Image Report (.png)
              </span>
              {selectedFormat === 'IMAGE' && (
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              )}
            </div>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] leading-relaxed">
              Vertical, high-resolution visual financial health card designed for readability on phones and easy sharing via messaging apps.
            </p>
          </button>
        </div>

        <div className="pt-4 border-t border-[#D7E7F5] dark:border-[#2A3B52] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#52657A] dark:text-[#B8C5D6]">
            Statement ID: <span className="font-mono">{analysisResult.metadata.analysisId.slice(0, 12)}</span> • Safe export (zero credentials)
          </div>
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleExport}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating {selectedFormat}...</span>
              </>
            ) : (
              <span>Export as {selectedFormat === 'PDF' ? 'PDF' : 'Image (PNG)'}</span>
            )}
          </button>
        </div>
      </div>

      {/* Summary Preview Card */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-[#D7E7F5] dark:border-[#2A3B52] pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
              Verified Report Summary
            </span>
            <h2 className="text-lg font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              Included in Your Export
            </h2>
          </div>
          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3 py-1.5 rounded-lg border border-[#D7E7F5] dark:border-[#2A3B52] text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            {copied ? '✓ Copied!' : 'Copy Summary'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] space-y-1">
            <span className="text-[10px] font-bold text-[#52657A] dark:text-[#B8C5D6] uppercase">
              Resilience Score
            </span>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {res.resilienceScore !== null ? `${res.resilienceScore}/100` : 'N/A'}
            </div>
            <span className="text-[10px] text-[#52657A] dark:text-[#B8C5D6] block">
              {res.scoreConfidence} Confidence
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] space-y-1">
            <span className="text-[10px] font-bold text-[#52657A] dark:text-[#B8C5D6] uppercase">
              Conservative Floor
            </span>
            <div className="text-2xl font-black text-[#0F2747] dark:text-[#F8FAFC] font-mono">
              {formatINR(inc.conservativeBaselineMonthly.paise)}
            </div>
            <span className="text-[10px] text-[#52657A] dark:text-[#B8C5D6] block">
              Per Month Floor
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] space-y-1">
            <span className="text-[10px] font-bold text-[#52657A] dark:text-[#B8C5D6] uppercase">
              Essential Outflow
            </span>
            <div className="text-2xl font-black text-[#0F2747] dark:text-[#F8FAFC] font-mono">
              {formatINR(exp.essentialMonthlyBurn.paise)}
            </div>
            <span className="text-[10px] text-[#52657A] dark:text-[#B8C5D6] block">
              Monthly Burn
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] space-y-1">
            <span className="text-[10px] font-bold text-[#52657A] dark:text-[#B8C5D6] uppercase">
              Savings Capacity
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono pt-0.5">
              {formatINR(cap.minimumMonthlySavings.paise)} – {formatINR(cap.maximumMonthlySavings.paise)}
            </div>
            <span className="text-[10px] text-[#52657A] dark:text-[#B8C5D6] block">
              Adaptive Range
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-[#52657A] dark:text-[#B8C5D6] space-y-1">
          <strong className="text-[#0F2747] dark:text-[#F8FAFC]">Data Privacy & Security Note:</strong>
          <p className="leading-relaxed">
            Exported reports never include account passwords, debit PINs, CVVs, or unmasked sensitive account numbers. The report strictly contains your analyzed financial resilience metrics and empirical spending breakdowns.
          </p>
        </div>
      </div>
    </div>
  );
}
