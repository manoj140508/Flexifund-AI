'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import EmptyState from '@/components/EmptyState';

export default function ExportPage() {
  const { analysisResult, profile } = useFinancialData();
  const [format, setFormat] = useState<'MARKDOWN' | 'JSON'>('MARKDOWN');
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!analysisResult) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <EmptyState
          title="No Statement Available for Export"
          description="Upload your financial statement to generate and export your personalized Financial Resilience Report."
          actionText="Upload financial data"
          actionHref="/upload"
        />
      </div>
    );
  }

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisData: analysisResult,
          format,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate export');

      if (format === 'MARKDOWN') {
        const text = await res.text();
        const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute(
          'download',
          `flexifund-resilience-report-${analysisResult.metadata.analysisId.slice(0, 8)}.md`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], {
          type: 'application/json;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute(
          'download',
          `flexifund-resilience-data-${analysisResult.metadata.analysisId.slice(0, 8)}.json`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      alert('Failed to generate report file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopySummary = () => {
    const summary = `FlexiFund AI Resilience Summary\n` +
      `Score: ${analysisResult.resilienceAnalysis.resilienceScore ?? 'N/A'}/100 (${analysisResult.resilienceAnalysis.scoreConfidence} confidence)\n` +
      `Conservative Baseline Income: ₹${(Number(analysisResult.incomeAnalysis.conservativeBaselineMonthly.paise) / 100).toLocaleString('en-IN')}/mo\n` +
      `Essential Monthly Outflow: ₹${(Number(analysisResult.expenseAnalysis.essentialMonthlyBurn.paise) / 100).toLocaleString('en-IN')}/mo\n` +
      `Emergency Runway: ${analysisResult.resilienceAnalysis.bufferCoverageDays ?? 'N/A'} days\n` +
      `Generated: ${new Date(analysisResult.metadata.generatedAt).toLocaleDateString()}`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#059669] dark:text-[#34D399]">
            Data Portability
          </span>
          <h1 className="text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight mt-1">
            Export Financial Resilience Report
          </h1>
          <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm mt-1 max-w-xl">
            Download your comprehensive resilience analysis, statistical findings, what-if stress tests, and prioritized action plan.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg border border-[#D7E7F5] dark:border-[#2A3B52] text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto shadow-xs"
        >
          ← Return to Overview
        </Link>
      </div>

      {/* Export Options Card */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#52657A] dark:text-[#B8C5D6]">
          Choose Export Format
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Markdown Option */}
          <button
            type="button"
            onClick={() => setFormat('MARKDOWN')}
            className={`p-5 rounded-2xl border text-left transition-all ${
              format === 'MARKDOWN'
                ? 'border-[#2563EB] dark:border-[#60A5FA] bg-[#E0F2FE]/40 dark:bg-blue-950/40 ring-2 ring-blue-500/10'
                : 'border-[#D7E7F5] dark:border-[#2A3B52] hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xl">📄</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                Human-Readable
              </span>
            </div>
            <h3 className="font-bold text-sm text-[#0F2747] dark:text-[#F8FAFC]">Markdown Report (.md)</h3>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] mt-1 leading-relaxed">
              Complete formatted report with executive summary, metric tables, risk indicators, and action steps.
            </p>
          </button>

          {/* JSON Option */}
          <button
            type="button"
            onClick={() => setFormat('JSON')}
            className={`p-5 rounded-2xl border text-left transition-all ${
              format === 'JSON'
                ? 'border-[#2563EB] dark:border-[#60A5FA] bg-[#E0F2FE]/40 dark:bg-blue-950/40 ring-2 ring-blue-500/10'
                : 'border-[#D7E7F5] dark:border-[#2A3B52] hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xl">📊</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Raw Data
              </span>
            </div>
            <h3 className="font-bold text-sm text-[#0F2747] dark:text-[#F8FAFC]">JSON Schema (.json)</h3>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] mt-1 leading-relaxed">
              Structured raw analysis payload suitable for importing into spreadsheets, databases, or API tools.
            </p>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-[#D7E7F5] dark:border-[#2A3B52]">
          <button
            onClick={handleDownload}
            disabled={downloading}
            type="button"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#2563EB] text-white font-bold text-xs hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {downloading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Generating {format}...
              </>
            ) : (
              <>
                <span>Download {format === 'MARKDOWN' ? 'Markdown Report' : 'JSON Payload'}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </>
            )}
          </button>

          <button
            onClick={handleCopySummary}
            type="button"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] bg-white dark:bg-[#111C2E] text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {copied ? '✓ Copied Summary to Clipboard' : 'Copy Brief Summary'}
          </button>
        </div>

        {/* Metadata Details */}
        <div className="pt-2 text-[11px] text-[#52657A] dark:text-[#B8C5D6] space-y-1">
          <div>
            <strong>Session Reference:</strong> {analysisResult.metadata.sourceReference} (ID: {analysisResult.metadata.analysisId})
          </div>
          <div>
            <strong>Profile State:</strong> {profile.state || profile.jurisdiction} • <strong>Worker Category:</strong> {profile.workerType}
          </div>
        </div>
      </div>
    </div>
  );
}
