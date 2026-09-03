'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/context/FinancialDataContext';
import { parseTransactionCSV } from '@/lib/csv-parser';

type UploadTab = 'CSV' | 'PDF' | 'IMAGE';

export default function UploadPage() {
  const router = useRouter();
  const { analyzeCSV, extractStatement, isLoading, error } = useFinancialData();

  const [activeTab, setActiveTab] = useState<UploadTab>('CSV');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<{
    validCount: number;
    rejectedCount: number;
    previewRows: any[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTabChange = (tab: UploadTab) => {
    setActiveTab(tab);
    setSelectedFile(null);
    setCsvPreview(null);
    setExtractionError(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    setSelectedFile(file);
    setExtractionError(null);

    // If CSV, do instant client-side preview
    if (activeTab === 'CSV' || file.name.toLowerCase().endsWith('.csv')) {
      try {
        const text = await file.text();
        const result = parseTransactionCSV(text, file.name);
        setCsvPreview({
          validCount: result.validTransactions.length,
          rejectedCount: result.rejectedRows.length,
          previewRows: result.validTransactions.slice(0, 5),
        });
      } catch (err: any) {
        setExtractionError('Failed to read CSV preview: ' + err.message);
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    if (activeTab === 'CSV') {
      const success = await analyzeCSV(selectedFile, selectedFile.name);
      if (success) {
        router.push('/dashboard');
      }
    } else {
      // PDF or Image extraction -> goes to /review
      try {
        setExtractionError(null);
        await extractStatement(selectedFile, activeTab);
        router.push('/review');
      } catch (err: any) {
        setExtractionError(
          err.message ||
            "We couldn't reliably read the transaction table from this file. Please ensure it is unencrypted and clearly readable."
        );
      }
    }
  };

  const getAcceptTypes = () => {
    if (activeTab === 'CSV') return '.csv,text/csv';
    if (activeTab === 'PDF') return '.pdf,application/pdf';
    return '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
          Financial Statement Ingestion
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
          Upload your financial data
        </h1>
        <p className="text-sm text-[#52657A] dark:text-[#B8C5D6] leading-relaxed">
          Use a CSV, bank statement PDF, or a screenshot of your statement. We process statements without requiring your bank account login.
        </p>
      </div>

      {/* Zero Credential Guarantee Alert */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] shadow-sm flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm shrink-0">
          🛡️
        </div>
        <div className="text-xs text-[#52657A] dark:text-[#B8C5D6] space-y-0.5">
          <strong className="text-[#0F2747] dark:text-[#F8FAFC] block font-semibold">
            Security Guarantee:
          </strong>
          <p>
            Never upload your bank password, OTP, UPI PIN, CVV or card PIN. We only need the transaction statement itself to calculate your financial resilience.
          </p>
        </div>
      </div>

      {/* Main Upload Card */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">
        {/* Three Option Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Tab 1: CSV */}
          <button
            type="button"
            onClick={() => handleTabChange('CSV')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              activeTab === 'CSV'
                ? 'border-[#2563EB] dark:border-[#60A5FA] bg-[#E0F2FE]/40 dark:bg-blue-950/40 ring-2 ring-blue-500/10'
                : 'border-[#D7E7F5] dark:border-[#2A3B52] hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">📊</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                Fastest
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">Upload CSV</h3>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] mt-1">Best for structured transaction data</p>
          </button>

          {/* Tab 2: PDF */}
          <button
            type="button"
            onClick={() => handleTabChange('PDF')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              activeTab === 'PDF'
                ? 'border-[#2563EB] dark:border-[#60A5FA] bg-[#E0F2FE]/40 dark:bg-blue-950/40 ring-2 ring-blue-500/10'
                : 'border-[#D7E7F5] dark:border-[#2A3B52] hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">📄</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Multi-Page
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">Upload PDF</h3>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] mt-1">Upload a bank statement PDF</p>
          </button>

          {/* Tab 3: Screenshot / Image */}
          <button
            type="button"
            onClick={() => handleTabChange('IMAGE')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              activeTab === 'IMAGE'
                ? 'border-[#2563EB] dark:border-[#60A5FA] bg-[#E0F2FE]/40 dark:bg-blue-950/40 ring-2 ring-blue-500/10'
                : 'border-[#D7E7F5] dark:border-[#2A3B52] hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">🖼️</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                OCR Auto
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">Upload Screenshot</h3>
            <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] mt-1">Screenshot or photo of statement</p>
          </button>
        </div>

        {/* File Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all ${
            dragActive
              ? 'border-[#2563EB] bg-blue-50/50 dark:bg-blue-950/20'
              : selectedFile
              ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/20 dark:bg-emerald-950/10'
              : 'border-[#D7E7F5] dark:border-[#2A3B52] hover:border-slate-400 bg-[#F5FAFF]/50 dark:bg-[#17243A]/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptTypes()}
            onChange={handleFileChange}
            className="hidden"
          />

          {!selectedFile ? (
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] text-slate-700 dark:text-slate-300 flex items-center justify-center mx-auto shadow-xs text-2xl">
                {activeTab === 'CSV' ? '📊' : activeTab === 'PDF' ? '📄' : '📷'}
              </div>

              <div>
                <p className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                  Drag and drop your {activeTab === 'CSV' ? 'CSV file' : activeTab === 'PDF' ? 'bank statement PDF' : 'statement screenshot'}
                </p>
                <p className="text-xs text-[#52657A] dark:text-[#B8C5D6] mt-1">
                  Supported formats: {activeTab === 'CSV' ? '.csv (up to 5MB)' : activeTab === 'PDF' ? '.pdf (up to 15MB)' : '.png, .jpg, .jpeg, .webp (up to 10MB)'}
                </p>
              </div>

              <div className="flex items-center justify-center pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-8 py-3 rounded-xl bg-[#2563EB] text-white text-xs sm:text-sm font-bold hover:bg-blue-600 transition-colors shadow-sm"
                >
                  Browse Files
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs uppercase">
                    {activeTab}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#0F2747] dark:text-[#F8FAFC] truncate max-w-xs sm:max-w-md">
                      {selectedFile.name}
                    </h4>
                    <p className="text-xs text-[#52657A] dark:text-[#B8C5D6]">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready to process
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setCsvPreview(null);
                    setExtractionError(null);
                  }}
                  className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline px-2 py-1"
                >
                  Remove
                </button>
              </div>

              {/* Instant CSV Preview if CSV */}
              {csvPreview && (
                <div className="text-left space-y-2 p-4 rounded-xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52]">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                      Transactions Preview ({csvPreview.validCount} valid rows)
                    </span>
                    {csvPreview.rejectedCount > 0 && (
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">
                        {csvPreview.rejectedCount} quarantined
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                    {csvPreview.previewRows.map((r, i) => (
                      <div key={i} className="py-1 flex justify-between">
                        <span className="text-slate-600 dark:text-slate-300">{r.date} — {r.description}</span>
                        <span className="font-mono font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                          ₹{(Number(r.amount.paise) / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-8 py-3 rounded-lg bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Processing Statement...
                    </>
                  ) : (
                    <span>
                      {activeTab === 'CSV' ? 'Analyze CSV Transactions →' : 'Extract & Review Transactions →'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Extraction Failure Handling (Requirement 3) */}
        {extractionError && (
          <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 space-y-3">
            <div>
              <strong className="font-bold text-sm block mb-1">Extraction Unsuccessful:</strong>
              <p>{extractionError}</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('PDF');
                  setSelectedFile(null);
                  fileInputRef.current?.click();
                }}
                className="px-3 py-1.5 rounded-md bg-white dark:bg-[#111C2E] border border-red-300 dark:border-red-700 font-semibold hover:bg-red-50"
              >
                Try another PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('IMAGE');
                  setSelectedFile(null);
                  fileInputRef.current?.click();
                }}
                className="px-3 py-1.5 rounded-md bg-white dark:bg-[#111C2E] border border-red-300 dark:border-red-700 font-semibold hover:bg-red-50"
              >
                Upload a screenshot
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('CSV');
                  setSelectedFile(null);
                  fileInputRef.current?.click();
                }}
                className="px-3 py-1.5 rounded-md bg-white dark:bg-[#111C2E] border border-red-300 dark:border-red-700 font-semibold hover:bg-red-50"
              >
                Upload CSV
              </button>
            </div>
          </div>
        )}

        {/* Global Error */}
        {error && !extractionError && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Help & Templates */}
        <div className="pt-4 border-t border-[#D7E7F5] dark:border-[#2A3B52] flex flex-col sm:flex-row items-center justify-between text-xs text-[#52657A] dark:text-[#B8C5D6] gap-3">
          <div className="flex items-center gap-3">
            <a
              href="/template-statement.csv"
              download="flexifund-template.csv"
              className="text-[#2563EB] dark:text-[#60A5FA] font-semibold underline underline-offset-2 flex items-center gap-1"
            >
              Download CSV Template
            </a>
          </div>
          <span className="text-[11px] text-[#52657A] dark:text-[#B8C5D6]">Format support: CSV, PDF statement, PNG / JPG screenshots</span>
        </div>
      </div>
    </div>
  );
}
