'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/context/FinancialDataContext';

type StatementTab = 'IMAGE' | 'PDF' | 'CSV';

export default function UploadPage() {
  const router = useRouter();
  const { analyzeCSV, extractStatement, isLoading } = useFinancialData();

  const [activeTab, setActiveTab] = useState<StatementTab>('IMAGE');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<number>(0);
  const [stepLabel, setStepLabel] = useState<string>('');
  const [devDebug, setDevDebug] = useState<any>(null);
  const [showDevDebug, setShowDevDebug] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTabChange = (tab: StatementTab) => {
    setActiveTab(tab);
    setSelectedFiles([]);
    setExtractionError(null);
    setDevDebug(null);
    setUploadStep(0);
  };

  const handleFileSelection = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setExtractionError(null);
    setDevDebug(null);

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const name = f.name.toLowerCase();

      if (activeTab === 'CSV') {
        if (name.endsWith('.csv') || f.type === 'text/csv') {
          validFiles.push(f);
        } else {
          setExtractionError('Please upload a valid .csv bank statement file.');
          return;
        }
      } else if (activeTab === 'PDF') {
        if (name.endsWith('.pdf') || f.type === 'application/pdf') {
          validFiles.push(f);
        } else {
          setExtractionError('Please upload a valid .pdf bank statement file.');
          return;
        }
      } else {
        // IMAGE / GPay Screenshot
        if (/\.(png|jpe?g|webp|bmp)$/i.test(name) || f.type.startsWith('image/')) {
          validFiles.push(f);
        } else {
          setExtractionError('Please upload a screenshot image (PNG, JPG, or WEBP).');
          return;
        }
      }
    }

    if (validFiles.length > 0) {
      if (activeTab === 'IMAGE') {
        // Support multi-screenshot upload
        setSelectedFiles(validFiles);
      } else {
        setSelectedFiles([validFiles[0]]);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelection(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const resetUpload = () => {
    setSelectedFiles([]);
    setExtractionError(null);
    setDevDebug(null);
    setUploadStep(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return;
    setExtractionError(null);
    setDevDebug(null);

    try {
      if (activeTab === 'CSV') {
        setUploadStep(1);
        setStepLabel('Reading CSV statement…');
        const success = await analyzeCSV(selectedFiles[0], selectedFiles[0].name);
        if (success) {
          setUploadStep(4);
          setStepLabel('Ready for review');
          router.push('/dashboard');
        } else {
          setUploadStep(0);
        }
      } else if (activeTab === 'PDF') {
        setUploadStep(1);
        setStepLabel('Reading PDF statement…');
        setUploadStep(2);
        setStepLabel('Extracting visible transactions…');
        await extractStatement(selectedFiles[0], 'PDF');
        setUploadStep(4);
        setStepLabel('Ready for review');
        router.push('/review');
      } else {
        // IMAGE / GPay Screenshot(s)
        setUploadStep(1);
        setStepLabel('Reading image…');

        await new Promise((r) => setTimeout(r, 80));

        setUploadStep(2);
        setStepLabel('Extracting visible transactions…');

        const result = await extractStatement(selectedFiles, 'IMAGE');

        setUploadStep(3);
        setStepLabel('Checking transaction details…');

        if (result && result.transactions && result.transactions.length > 0) {
          setUploadStep(4);
          setStepLabel('Ready for review');
          router.push('/review');
        } else {
          throw new Error("We couldn't read transactions from this image. Try a clearer screenshot or upload a PDF/CSV statement.");
        }
      }
    } catch (err: any) {
      setExtractionError(
        err?.message || "We couldn't read transactions from this image. Try a clearer screenshot or upload a PDF/CSV statement."
      );
      if (err?.devDebug) {
        setDevDebug(err.devDebug);
      }
    } finally {
      setUploadStep(0);
    }
  };

  const getAcceptTypes = () => {
    if (activeTab === 'CSV') return '.csv,text/csv';
    if (activeTab === 'PDF') return '.pdf,application/pdf';
    return '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-8">
      {/* 1. Header (Requirement 20) */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
          Upload your financial activity
        </h1>
        <p className="text-sm sm:text-base text-[#52657A] dark:text-[#CBD5E1] max-w-md mx-auto">
          Add your GPay transaction history screenshots or bank statements to build your personalized resilience plan.
        </p>
      </div>

      {/* 2. Format Selector Tabs */}
      <div className="flex justify-center gap-2 p-1.5 bg-[#E2E8F0]/60 dark:bg-[#1A283E] rounded-2xl max-w-md mx-auto">
        <button
          type="button"
          onClick={() => handleTabChange('IMAGE')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'IMAGE'
              ? 'bg-white dark:bg-[#111C2E] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
              : 'text-[#52657A] dark:text-[#CBD5E1]'
          }`}
        >
          GPay / Screenshot
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('PDF')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'PDF'
              ? 'bg-white dark:bg-[#111C2E] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
              : 'text-[#52657A] dark:text-[#CBD5E1]'
          }`}
        >
          PDF statement
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('CSV')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'CSV'
              ? 'bg-white dark:bg-[#111C2E] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
              : 'text-[#52657A] dark:text-[#CBD5E1]'
          }`}
        >
          CSV file
        </button>
      </div>

      {/* 3. Supported Formats Badge List */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[#52657A] dark:text-[#94A3B8]">
        <span className="font-semibold text-slate-700 dark:text-slate-300">Supported:</span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">GPay / payment screenshots</span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">Bank statement PDF</span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">CSV</span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">Other statement images</span>
      </div>

      {/* 4. Dropzone Card */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-[#2563EB] bg-blue-50/50 dark:bg-blue-950/20'
              : 'border-[#CBD5E1] dark:border-[#334155] hover:border-[#2563EB]/70 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptTypes()}
            multiple={activeTab === 'IMAGE'}
            onChange={(e) => handleFileSelection(e.target.files)}
            className="hidden"
          />

          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center mx-auto text-xl shadow-xs">
              {activeTab === 'IMAGE' ? '📱' : activeTab === 'PDF' ? '📄' : '📊'}
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} file(s) selected`
                  : activeTab === 'IMAGE'
                  ? 'Click or drag GPay screenshots here'
                  : `Click or drag your ${activeTab} file here`}
              </p>
              <p className="text-xs text-[#52657A] dark:text-[#94A3B8] mt-1">
                {activeTab === 'IMAGE'
                  ? 'PNG, JPG, or WEBP from Google Pay, PhonePe, Paytm (you can select multiple)'
                  : `Max size 15MB`}
              </p>
            </div>
          </div>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Selected for Scan ({selectedFiles.length})
              </span>
              <button
                type="button"
                onClick={resetUpload}
                className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline"
              >
                Clear all
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {selectedFiles.map((f, i) => (
                <div key={i} className="py-1.5 flex items-center justify-between">
                  <span className="truncate max-w-[280px] font-medium text-[#0F2747] dark:text-[#F8FAFC]">
                    {f.name}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Progress Indicator during extraction */}
        {(isLoading || uploadStep > 0) && (
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA]">
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                {stepLabel || 'Processing statement…'}
              </span>
              <span>Step {Math.max(1, uploadStep)} of 4</span>
            </div>
            <div className="w-full h-1.5 bg-blue-100 dark:bg-blue-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(15, uploadStep * 25))}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error Message with Quality Context (Requirement 15, 16, 18) */}
        {extractionError && (
          <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="text-base shrink-0">⚠️</span>
              <div>
                <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  {extractionError}
                </p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-1">
                  Try uploading a clearer screenshot of your GPay transaction history or individual payment details.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setExtractionError(null);
                  setDevDebug(null);
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Try another image
              </button>
              <button
                type="button"
                onClick={() => {
                  setExtractionError(null);
                  setDevDebug(null);
                  resetUpload();
                }}
                className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
              >
                Back to upload
              </button>
            </div>
          </div>
        )}

        {/* Development-Only Raw OCR Inspection Drawer (Requirement 2) */}
        {devDebug && process.env.NODE_ENV === 'development' && (
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs space-y-3 shadow-md border border-slate-700">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setShowDevDebug(!showDevDebug)}
            >
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                <span>🛠️ Dev OCR Debugger</span>
                <span className="text-[10px] text-slate-400 font-normal">(What OCR Read vs Parser Result)</span>
              </span>
              <span className="text-xs text-blue-400 hover:underline">
                {showDevDebug ? 'Hide Debugger ▲' : 'Inspect Raw OCR Stream ▼'}
              </span>
            </div>

            {showDevDebug && (
              <div className="space-y-3 pt-3 border-t border-slate-800">
                {devDebug.imageMeta && (
                  <p className="text-[11px] text-slate-400">
                    Image dimensions: {devDebug.imageMeta.width}×{devDebug.imageMeta.height} ({devDebug.imageMeta.format})
                  </p>
                )}
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                    Raw OCR Text ({devDebug.ocrText?.length || 0} characters):
                  </p>
                  <pre className="p-3 bg-black/60 rounded-xl text-[11px] text-slate-200 max-h-36 overflow-y-auto whitespace-pre-wrap font-mono border border-slate-800">
                    {devDebug.ocrText || '(No text read from image)'}
                  </pre>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                    Detected Spatial Blocks ({devDebug.detectedBlocks?.length || 0}):
                  </p>
                  <div className="max-h-36 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl bg-black/40">
                    {devDebug.detectedBlocks?.map((b: any, i: number) => (
                      <div key={i} className="p-1.5 flex justify-between text-[10px]">
                        <span className="truncate max-w-[280px] text-slate-300">{b.text}</span>
                        <span className="text-slate-400 font-mono shrink-0">y:{b.y} conf:{b.conf}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scan & Review Submit Button */}
        <button
          type="button"
          disabled={selectedFiles.length === 0 || isLoading || uploadStep > 0}
          onClick={handleSubmit}
          className="w-full py-4 rounded-xl bg-[#2563EB] text-white text-sm sm:text-base font-bold hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-98"
        >
          {isLoading || uploadStep > 0
            ? (stepLabel || 'Understanding your statement…')
            : extractionError
            ? 'Retry Scan & Review →'
            : 'Scan & Review Transactions →'}
        </button>

        {/* Zero Password Guarantee (Requirement 23) */}
        <div className="pt-1 text-center">
          <p className="text-xs text-[#52657A] dark:text-[#94A3B8] flex items-center justify-center gap-1.5">
            <span>🔒</span>
            <span>We never need your UPI PIN, OTP or banking password.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
