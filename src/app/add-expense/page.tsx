'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import { parseVoiceExpenseText } from '@/lib/voice-expense-parser';
import { extractReceiptFromText } from '@/lib/receipt-extractor';

export default function AddExpensePage() {
  const { addConfirmedExpense } = useFinancialData();

  const [activeTab, setActiveTab] = useState<'VOICE' | 'RECEIPT' | 'MANUAL'>('VOICE');

  // Manual Form State
  const [manualAmount, setManualAmount] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualCategory, setManualCategory] = useState('ESSENTIAL_GROCERIES');
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceParsed, setVoiceParsed] = useState<{
    amountRupees?: number | null;
    description?: string;
    category?: string;
  } | null>(null);

  // Receipt OCR State
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  const [receiptParsed, setReceiptParsed] = useState<{
    merchant?: string;
    amountRupees?: number | null;
    category?: string;
    date?: string;
  } | null>(null);

  // Shared Submitting / Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Web Speech Voice Handler
  const startVoiceInput = () => {
    setErrorMessage(null);
    setVoiceParsed(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage(
        'Speech recognition is not supported in this browser. You can type your sentence directly below!'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      setIsListening(true);

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setVoiceTranscript(text);
        const parsed = parseVoiceExpenseText(text);
        setVoiceParsed(parsed);
        setIsListening(false);
      };

      recognition.onerror = (err: any) => {
        console.error('Speech error:', err);
        setIsListening(false);
        setErrorMessage('Could not understand voice. Please speak clearly or type it below.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      setErrorMessage('Could not access microphone.');
    }
  };

  // 2. Receipt Scanner Handler
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingReceipt(true);
    setErrorMessage(null);
    setReceiptParsed(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', 'RECEIPT');

      const res = await fetch('/api/extract?mode=RECEIPT', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to extract receipt data');
      }

      const data = await res.json();
      if (data.receipt) {
        setReceiptParsed(data.receipt);
      } else if (data.rawText) {
        const localExtracted = extractReceiptFromText(data.rawText);
        setReceiptParsed(localExtracted);
      } else {
        throw new Error('Could not identify totals on this receipt. Please enter manually.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Receipt scan failed. Please check photo clarity or enter manually.');
    } finally {
      setIsProcessingReceipt(false);
    }
  };

  // 3. Save Expense to Context
  const handleSaveExpense = async (expense: {
    description: string;
    amountRupees: number;
    category?: string;
    date?: string;
    source?: string;
  }) => {
    if (!expense.amountRupees || expense.amountRupees <= 0) {
      setErrorMessage('Please provide a valid expense amount.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const success = await addConfirmedExpense(expense);
    setIsSaving(false);

    if (success) {
      setSuccessMessage('Expense added. Your financial plan has been updated.');
      // Reset inputs
      setVoiceTranscript('');
      setVoiceParsed(null);
      setReceiptParsed(null);
      setManualAmount('');
      setManualDesc('');
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      setErrorMessage("We couldn't add this expense. Your existing data is still safe.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">➕</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
            Add Expense
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
          Record an expense quickly using voice, a receipt photo, or by typing it in.
        </p>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Step 1: Mode Chooser */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]">
            How would you like to add it?
          </span>
          <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-[#17243A]">
            <button
              type="button"
              onClick={() => setActiveTab('VOICE')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'VOICE'
                  ? 'bg-white dark:bg-[#2563EB] text-[#2563EB] dark:text-white shadow-xs'
                  : 'text-[#52657A] dark:text-[#94A3B8] hover:text-[#0F2747] dark:hover:text-white'
              }`}
            >
              <span>🎙️</span>
              <span>Voice</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('RECEIPT')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'RECEIPT'
                  ? 'bg-white dark:bg-[#2563EB] text-[#2563EB] dark:text-white shadow-xs'
                  : 'text-[#52657A] dark:text-[#94A3B8] hover:text-[#0F2747] dark:hover:text-white'
              }`}
            >
              <span>📷</span>
              <span>Scan receipt</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MANUAL')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'MANUAL'
                  ? 'bg-white dark:bg-[#2563EB] text-[#2563EB] dark:text-white shadow-xs'
                  : 'text-[#52657A] dark:text-[#94A3B8] hover:text-[#0F2747] dark:hover:text-white'
              }`}
            >
              <span>⌨️</span>
              <span>Enter manually</span>
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2">
            <span>✓ {successMessage}</span>
            <Link href="/my-money" className="underline whitespace-nowrap">
              View in My Money →
            </Link>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 font-medium">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: VOICE */}
        {/* ============================================================ */}
        {activeTab === 'VOICE' && (
          <div className="space-y-6 pt-2">
            <div className="text-center space-y-4 py-4">
              <button
                type="button"
                onClick={startVoiceInput}
                disabled={isListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl mx-auto shadow-md transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-[#2563EB] hover:bg-blue-600 text-white'
                }`}
                title="Click and speak your expense"
              >
                🎙️
              </button>
              <div className="space-y-1">
                <span className="text-xs font-bold block text-[#0F2747] dark:text-[#F8FAFC]">
                  {isListening ? 'Listening… Speak now' : 'Tap the microphone and speak'}
                </span>
                <p className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">
                  Example: &quot;I spent ₹250 on petrol&quot; or &quot;₹180 for lunch&quot;
                </p>
              </div>
            </div>

            {/* Direct sentence input fallback */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label
                htmlFor="voice-sentence"
                className="block text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]"
              >
                Or type what you spent:
              </label>
              <div className="flex gap-2">
                <input
                  id="voice-sentence"
                  type="text"
                  placeholder="e.g. ₹350 for mobile recharge"
                  value={voiceTranscript}
                  onChange={(e) => {
                    setVoiceTranscript(e.target.value);
                    if (e.target.value.trim().length > 3) {
                      setVoiceParsed(parseVoiceExpenseText(e.target.value));
                    }
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#17243A] border border-slate-200 dark:border-slate-700 text-xs font-medium text-[#0F2747] dark:text-[#F8FAFC]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (voiceTranscript.trim()) {
                      setVoiceParsed(parseVoiceExpenseText(voiceTranscript));
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC]"
                >
                  Parse
                </button>
              </div>
            </div>

            {/* Voice Confirmation Card */}
            {voiceParsed && voiceParsed.amountRupees && (
              <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA]">
                  Did we get that right?
                </div>
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div>
                    <span className="text-[10px] text-[#52657A] dark:text-[#94A3B8] block">Item / Purpose</span>
                    <span className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                      {voiceParsed.description || 'General Expense'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#52657A] dark:text-[#94A3B8] block">Amount</span>
                    <span className="text-lg font-mono font-extrabold text-[#2563EB] dark:text-[#60A5FA]">
                      ₹{voiceParsed.amountRupees.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() =>
                      handleSaveExpense({
                        description: voiceParsed.description || 'General Expense',
                        amountRupees: voiceParsed.amountRupees!,
                        category: voiceParsed.category || 'OTHER_EXPENSE',
                        source: 'Voice',
                      })
                    }
                    className="flex-1 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-colors"
                  >
                    {isSaving ? 'Saving…' : 'Save expense'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualAmount(String(voiceParsed.amountRupees));
                      setManualDesc(voiceParsed.description || '');
                      setActiveTab('MANUAL');
                    }}
                    className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-white"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: RECEIPT SCANNER */}
        {/* ============================================================ */}
        {activeTab === 'RECEIPT' && (
          <div className="space-y-6 pt-2">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center space-y-3">
              <span className="text-3xl block">🧾</span>
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] block">
                  Upload or snap a receipt photo
                </span>
                <p className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">
                  We will extract the merchant, date and final total for your confirmation.
                </p>
              </div>

              <label className="inline-block px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs">
                <span>{isProcessingReceipt ? 'Scanning receipt…' : 'Choose photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isProcessingReceipt}
                  onChange={handleReceiptUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Receipt Confirmation Card */}
            {receiptParsed && receiptParsed.amountRupees && (
              <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA]">
                  Check your expense
                </div>
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div>
                    <span className="text-[10px] text-[#52657A] dark:text-[#94A3B8] block">Merchant</span>
                    <span className="text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                      {receiptParsed.merchant || 'Store Receipt'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#52657A] dark:text-[#94A3B8] block">Total Amount</span>
                    <span className="text-lg font-mono font-extrabold text-[#2563EB] dark:text-[#60A5FA]">
                      ₹{receiptParsed.amountRupees.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {receiptParsed.date && (
                    <div>
                      <span className="text-[10px] text-[#52657A] dark:text-[#94A3B8] block">Date</span>
                      <span className="text-xs font-medium text-[#0F2747] dark:text-[#F8FAFC]">
                        {receiptParsed.date}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() =>
                      handleSaveExpense({
                        description: receiptParsed.merchant || 'Store Receipt',
                        amountRupees: receiptParsed.amountRupees!,
                        category: receiptParsed.category || 'ESSENTIAL_GROCERIES',
                        date: receiptParsed.date,
                        source: 'Receipt',
                      })
                    }
                    className="flex-1 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-colors"
                  >
                    {isSaving ? 'Saving…' : 'Add expense'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualAmount(String(receiptParsed.amountRupees));
                      setManualDesc(receiptParsed.merchant || '');
                      setActiveTab('MANUAL');
                    }}
                    className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-white"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: MANUAL ENTRY */}
        {/* ============================================================ */}
        {activeTab === 'MANUAL' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveExpense({
                description: manualDesc || 'General Expense',
                amountRupees: Number(manualAmount),
                category: manualCategory,
                date: manualDate,
                source: 'Manual',
              });
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="manual-amount"
                className="block text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]"
              >
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">
                  ₹
                </span>
                <input
                  id="manual-amount"
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="250"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-[#17243A] border border-slate-200 dark:border-slate-700 text-base font-mono font-bold text-[#0F2747] dark:text-[#F8FAFC] outline-hidden focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="manual-desc"
                className="block text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]"
              >
                What was it for?
              </label>
              <input
                id="manual-desc"
                type="text"
                required
                placeholder="e.g. Petrol, Groceries, Medicine"
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#17243A] border border-slate-200 dark:border-slate-700 text-xs font-medium text-[#0F2747] dark:text-[#F8FAFC] outline-hidden focus:border-[#2563EB]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="manual-category"
                  className="block text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]"
                >
                  Category
                </label>
                <select
                  id="manual-category"
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#17243A] border border-slate-200 dark:border-slate-700 text-xs font-medium text-[#0F2747] dark:text-[#F8FAFC]"
                >
                  <option value="ESSENTIAL_GROCERIES">Groceries / Food</option>
                  <option value="FUEL_TRANSPORT">Fuel / Transport</option>
                  <option value="UTILITY_BILLS">Bills / Utilities</option>
                  <option value="MEDICAL_HEALTH">Healthcare / Medicine</option>
                  <option value="RENT_HOUSING">Rent / Housing</option>
                  <option value="OTHER_EXPENSE">Other Expense</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="manual-date"
                  className="block text-xs font-bold uppercase tracking-wider text-[#52657A] dark:text-[#94A3B8]"
                >
                  Date
                </label>
                <input
                  id="manual-date"
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#17243A] border border-slate-200 dark:border-slate-700 text-xs font-medium text-[#0F2747] dark:text-[#F8FAFC]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-md mt-2"
            >
              {isSaving ? 'Recording expense…' : 'Add expense'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
