'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useFinancialData } from '@/context/FinancialDataContext';
import { parseVoiceExpenseTranscript } from '@/lib/voice-expense-parser';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'VOICE' | 'RECEIPT' | 'MANUAL';
}

const CATEGORIES = [
  { id: 'WORK_FUEL_TRANSIT', label: 'Petrol & Travel', icon: '⛽' },
  { id: 'DISCRETIONARY', label: 'Food & Meals', icon: '🍔' },
  { id: 'ESSENTIAL_GROCERIES', label: 'Groceries', icon: '🛒' },
  { id: 'ESSENTIAL_UTILITIES', label: 'Bills & Recharge', icon: '💡' },
  { id: 'ESSENTIAL_HOUSING', label: 'Rent & Housing', icon: '🏠' },
  { id: 'WORK_EQUIPMENT', label: 'Work & Tools', icon: '🔧' },
  { id: 'HEALTHCARE', label: 'Medicine & Health', icon: '💊' },
  { id: 'OTHER', label: 'Other Spending', icon: '📦' },
];

export default function AddExpenseModal({
  isOpen,
  onClose,
  initialMode = 'VOICE',
}: AddExpenseModalProps) {
  const { addConfirmedExpense } = useFinancialData();

  const [activeTab, setActiveTab] = useState<'VOICE' | 'RECEIPT' | 'MANUAL'>(initialMode);

  // Review / Confirmation State
  const [reviewState, setReviewState] = useState<{
    merchant: string;
    amountRupees: string;
    category: string;
    date: string;
    uncertainMessage?: string;
    source: 'VOICE' | 'RECEIPT' | 'MANUAL';
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Manual Form State
  const [manualDesc, setManualDesc] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualCategory, setManualCategory] = useState('DISCRETIONARY');

  // Receipt File Ref
  const receiptFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setVoiceSupported(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setReviewState(null);
      setSpokenText('');
      setErrorMessage(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // --- 1. VOICE HANDLERS ---
  const startListening = () => {
    setErrorMessage(null);
    setSpokenText('');

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSpokenText(transcript);
        handleVoiceParsed(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions or enter manually.');
        } else if (event.error !== 'no-speech') {
          setErrorMessage('Could not hear clearly. Try again or enter manually.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setErrorMessage('Could not start voice recognition. Please enter manually.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleVoiceParsed = (transcript: string) => {
    const parsed = parseVoiceExpenseTranscript(transcript);
    setReviewState({
      merchant: parsed.description,
      amountRupees: parsed.amountRupees ? parsed.amountRupees.toString() : '',
      category: parsed.category,
      date: parsed.date,
      uncertainMessage: parsed.confidenceMessage,
      source: 'VOICE',
    });
  };

  // --- 2. RECEIPT OCR HANDLERS ---
  const handleReceiptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsProcessingOcr(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', 'RECEIPT');

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.receipt) {
        throw new Error(data.errorMessage || "Could not read this receipt. Try another photo or enter manually.");
      }

      const r = data.receipt;
      setReviewState({
        merchant: r.merchant || 'Receipt Expense',
        amountRupees: r.amountRupees ? r.amountRupees.toString() : '',
        category: r.category || 'OTHER',
        date: r.date || new Date().toISOString().slice(0, 10),
        uncertainMessage: r.message,
        source: 'RECEIPT',
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Could not read receipt. Please check and enter details manually.");
    } finally {
      setIsProcessingOcr(false);
      if (receiptFileRef.current) receiptFileRef.current.value = '';
    }
  };

  // --- 3. MANUAL SUBMISSION ---
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanAmt = manualAmount.trim().replace(/,/g, '');
    const num = Number(cleanAmt);

    if (!cleanAmt || isNaN(num) || num <= 0) {
      setErrorMessage('Please enter a valid amount (e.g. ₹250).');
      return;
    }

    setReviewState({
      merchant: manualDesc.trim() || 'General Expense',
      amountRupees: num.toString(),
      category: manualCategory,
      date: new Date().toISOString().slice(0, 10),
      source: 'MANUAL',
    });
  };

  // --- 4. FINAL CONFIRMATION ---
  const handleConfirmSave = async () => {
    if (!reviewState) return;

    const num = Number(reviewState.amountRupees);
    if (isNaN(num) || num <= 0) {
      setErrorMessage('Please check the amount before saving.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await addConfirmedExpense({
        description: reviewState.merchant,
        amountRupees: num,
        category: reviewState.category,
        date: reviewState.date,
        source: reviewState.source || 'Manual',
      });

      if (success) {
        onClose();
      } else {
        setErrorMessage("We couldn't add this expense. Your existing data is still safe.");
      }
    } catch (err: any) {
      setErrorMessage("We couldn't add this expense. Your existing data is still safe.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-expense-title"
    >
      <div
        className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">➕</span>
            <div>
              <h2 id="add-expense-title" className="text-xl sm:text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC]">
                {reviewState ? 'Did we get that right?' : 'Add an expense'}
              </h2>
              <p className="text-xs text-[#52657A] dark:text-[#94A3B8]">
                {reviewState
                  ? 'Confirm details before adding to your money plan'
                  : 'Voice, scan receipt, or enter manually'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 font-medium">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN A: CONFIRMATION REVIEW (Requirement 11) */}
        {/* ============================================================ */}
        {reviewState ? (
          <div className="space-y-5 animate-in fade-in duration-150">
            {reviewState.uncertainMessage && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 font-medium">
                💬 {reviewState.uncertainMessage}
              </div>
            )}

            <div className="bg-slate-50 dark:bg-[#17243A] rounded-2xl p-5 border border-[#E2E8F0] dark:border-[#26354D] space-y-4">
              {/* Merchant / Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#52657A] dark:text-[#94A3B8] block">
                  What was it for?
                </label>
                <input
                  type="text"
                  value={reviewState.merchant}
                  onChange={(e) => setReviewState({ ...reviewState, merchant: e.target.value })}
                  placeholder="e.g. Petrol, Lunch"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-700 text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC] outline-hidden focus:border-[#2563EB]"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#52657A] dark:text-[#94A3B8] block">
                  Amount in Rupees
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={reviewState.amountRupees}
                    onChange={(e) => setReviewState({ ...reviewState, amountRupees: e.target.value })}
                    placeholder="250"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-700 text-lg font-extrabold font-mono text-[#0F2747] dark:text-[#F8FAFC] outline-hidden focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Category Dropdown */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#52657A] dark:text-[#94A3B8] block">
                  Category
                </label>
                <select
                  value={reviewState.category}
                  onChange={(e) => setReviewState({ ...reviewState, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] outline-hidden focus:border-[#2563EB]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#52657A] dark:text-[#94A3B8] block">
                  Date
                </label>
                <input
                  type="date"
                  value={reviewState.date}
                  onChange={(e) => setReviewState({ ...reviewState, date: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-700 text-xs text-[#0F2747] dark:text-[#F8FAFC] outline-hidden"
                />
              </div>
            </div>

            {/* Confirmation Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={isSubmitting || !reviewState.amountRupees}
                onClick={handleConfirmSave}
                className="w-full sm:flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition-colors text-center"
              >
                {isSubmitting ? 'Saving expense…' : '✓ Save expense'}
              </button>
              <button
                type="button"
                onClick={() => setReviewState(null)}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Back / Re-enter
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* SCREEN B: UNIFIED ENTRY TABS (Voice / Receipt / Manual) */
          /* ============================================================ */
          <div className="space-y-5">
            {/* Format Tabs (Requirement 9) */}
            <div className="flex justify-center gap-1.5 p-1 bg-[#E2E8F0]/60 dark:bg-[#1A283E] rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('VOICE');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'VOICE'
                    ? 'bg-white dark:bg-[#111C2E] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                    : 'text-[#52657A] dark:text-[#CBD5E1]'
                }`}
              >
                <span>🎙</span>
                <span>Voice</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('RECEIPT');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'RECEIPT'
                    ? 'bg-white dark:bg-[#111C2E] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                    : 'text-[#52657A] dark:text-[#CBD5E1]'
                }`}
              >
                <span>📷</span>
                <span>Scan receipt</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('MANUAL');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'MANUAL'
                    ? 'bg-white dark:bg-[#111C2E] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                    : 'text-[#52657A] dark:text-[#CBD5E1]'
                }`}
              >
                <span>⌨</span>
                <span>Type it</span>
              </button>
            </div>

            {/* TAB 1: VOICE ENTRY */}
            {activeTab === 'VOICE' && (
              <div className="space-y-5 text-center py-3">
                {!voiceSupported ? (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-3">
                    <p className="font-semibold">Voice entry isn&apos;t available in this browser.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('MANUAL')}
                      className="px-4 py-2 rounded-xl bg-[#2563EB] text-white font-bold hover:bg-blue-600 transition-colors shadow-xs"
                    >
                      Enter expense manually →
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <p className="text-xs text-[#52657A] dark:text-[#94A3B8]">
                        Tap the microphone and say something like:
                      </p>
                      <p className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC] italic">
                        &ldquo;I spent 250 rupees on petrol&rdquo;
                      </p>
                    </div>

                    {/* Big Voice Button */}
                    <div className="py-4">
                      <button
                        type="button"
                        onClick={isListening ? stopListening : startListening}
                        className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl transition-all shadow-lg active:scale-95 ${
                          isListening
                            ? 'bg-rose-500 text-white animate-pulse shadow-rose-300 dark:shadow-rose-900/50 ring-4 ring-rose-300/40'
                            : 'bg-[#2563EB] hover:bg-blue-600 text-white shadow-blue-300 dark:shadow-blue-900/50'
                        }`}
                      >
                        {isListening ? '⏹' : '🎙'}
                      </button>
                    </div>

                    <p className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA]">
                      {isListening ? 'Listening… speak now' : 'Tap to start speaking'}
                    </p>

                    {spokenText && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-xl">
                        Heard: &ldquo;{spokenText}&rdquo;
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* TAB 2: RECEIPT SCANNER */}
            {activeTab === 'RECEIPT' && (
              <div className="space-y-4">
                <input
                  ref={receiptFileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleReceiptFile}
                  className="hidden"
                />

                <div
                  onClick={() => receiptFileRef.current?.click()}
                  className="border-2 border-dashed border-[#CBD5E1] dark:border-[#334155] hover:border-[#2563EB] rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40 space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-2xl mx-auto">
                    📷
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                      Take a photo or upload receipt
                    </p>
                    <p className="text-xs text-[#52657A] dark:text-[#94A3B8] mt-1">
                      We&apos;ll read the merchant, date, and final total for your confirmation.
                    </p>
                  </div>
                </div>

                {isProcessingOcr && (
                  <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 text-xs text-[#2563EB] dark:text-[#60A5FA] font-semibold flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                    Reading receipt totals…
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: MANUAL ENTRY */}
            {activeTab === 'MANUAL' && (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#52657A] dark:text-[#94A3B8] block">
                    What was it for?
                  </label>
                  <input
                    type="text"
                    required
                    value={manualDesc}
                    onChange={(e) => setManualDesc(e.target.value)}
                    placeholder="e.g. Petrol, Groceries, Lunch"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#17243A] border border-slate-200 dark:border-slate-700 text-sm font-semibold text-[#0F2747] dark:text-[#F8FAFC] outline-hidden focus:border-[#2563EB]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#52657A] dark:text-[#94A3B8] block">
                    Amount in Rupees
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      placeholder="250"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#17243A] border border-slate-200 dark:border-slate-700 text-lg font-extrabold font-mono text-[#0F2747] dark:text-[#F8FAFC] outline-hidden focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#52657A] dark:text-[#94A3B8] block">
                    Category
                  </label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#17243A] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] outline-hidden focus:border-[#2563EB]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm shadow-md transition-colors text-center"
                >
                  Continue to review →
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
