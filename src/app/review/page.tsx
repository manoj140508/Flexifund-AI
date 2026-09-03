'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import { ExtractedStatementTransaction } from '@/lib/statement-extractor';

export default function ReviewExtractionPage() {
  const router = useRouter();
  const { extractedDraft, analyzeTransactions, isLoading, error } = useFinancialData();

  const [transactions, setTransactions] = useState<ExtractedStatementTransaction[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [useClosingBalance, setUseClosingBalance] = useState<boolean>(false);
  const [closingBalanceRupees, setClosingBalanceRupees] = useState<string>('');

  useEffect(() => {
    if (extractedDraft && extractedDraft.transactions) {
      setTransactions(extractedDraft.transactions);
      if (extractedDraft.closingBalancePaise) {
        const inr = (Number(extractedDraft.closingBalancePaise) / 100).toFixed(2);
        setClosingBalanceRupees(inr);
      }
    }
  }, [extractedDraft]);

  if (!extractedDraft || transactions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mx-auto">
          📋
        </div>
        <h1 className="text-2xl font-bold text-[#0F2747] dark:text-[#F8FAFC]">
          No Extracted Transactions to Review
        </h1>
        <p className="text-sm text-[#52657A] dark:text-[#B8C5D6] max-w-md mx-auto">
          Please upload a bank statement (PDF, image, or CSV) to extract and review transactions.
        </p>
        <Link
          href="/upload"
          className="inline-block px-6 py-2.5 rounded-lg bg-[#2563EB] text-white font-bold text-xs hover:bg-blue-600 transition-colors shadow-sm"
        >
          ← Go to Statement Upload
        </Link>
      </div>
    );
  }

  const handleFieldChange = (id: string, field: keyof ExtractedStatementTransaction, value: any) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (field === 'amountPaise') {
          const num = Math.round(Number(value) * 100);
          return { ...t, amountPaise: isNaN(num) ? t.amountPaise : num.toString() };
        }
        return { ...t, [field]: value };
      })
    );
  };

  const handleDelete = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddRow = () => {
    const newTx: ExtractedStatementTransaction = {
      id: `manual_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      description: 'New Transaction',
      amountPaise: '50000',
      type: 'DEBIT',
      confidence: 'HIGH',
      confidenceReason: 'Manually added transaction',
    };
    setTransactions((prev) => [...prev, newTx]);
    setEditingId(newTx.id);
  };

  const handleConfirmAndAnalyze = async () => {
    if (transactions.length === 0) return;
    const confirmedCash = useClosingBalance && closingBalanceRupees ? closingBalanceRupees : undefined;
    const success = await analyzeTransactions(
      transactions,
      extractedDraft.sourceType,
      `statement_${extractedDraft.sourceType.toLowerCase()}`,
      confirmedCash
    );
    if (success) {
      router.push('/dashboard');
    }
  };

  const highCount = transactions.filter((t) => t.confidence === 'HIGH').length;
  const reviewCount = transactions.length - highCount;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#D7E7F5] dark:border-[#2A3B52]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
              Extraction Review
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA] font-semibold">
              Source: {extractedDraft.sourceType}
            </span>
            {extractedDraft.pagesProcessed && extractedDraft.pagesProcessed > 1 && (
              <span className="text-xs text-slate-500 font-mono">
                • {extractedDraft.pagesProcessed} pages processed
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight mt-1.5">
            Review Extracted Transactions
          </h1>
          <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm mt-1 max-w-2xl">
            Verify the extracted records below. You can correct descriptions, edit amounts, adjust Income/Expense classification, or remove inaccurate lines before calculating financial resilience.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAddRow}
            className="px-3.5 py-2 rounded-lg border border-[#D7E7F5] dark:border-[#2A3B52] bg-white dark:bg-[#111C2E] text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            + Add Transaction
          </button>
          <button
            type="button"
            onClick={handleConfirmAndAnalyze}
            disabled={isLoading || transactions.length === 0}
            className="px-6 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Analyzing...
              </>
            ) : (
              <span>Confirm & Analyze →</span>
            )}
          </button>
        </div>
      </div>

      {/* Confidence Alert Banner if any items need review */}
      {reviewCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <span className="text-base leading-none">⚠️</span>
          <div className="space-y-1">
            <span className="font-bold">
              {reviewCount} transaction(s) have medium/low confidence.
            </span>
            <p className="text-amber-800 dark:text-amber-300">
              Some transaction columns or expense directions could not be determined with 100% certainty. Please review highlighted rows before continuing.
            </p>
          </div>
        </div>
      )}

      {/* Statement Closing Balance Safety Card (Requirement 9) */}
      {closingBalanceRupees && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Statement Closing Balance
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  Historical End Balance
                </span>
              </div>
              <div className="text-xl font-black font-mono text-[#0F2747] dark:text-[#F8FAFC] mt-0.5">
                ₹{Number(closingBalanceRupees).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-[#0F2747] dark:text-[#F8FAFC] font-medium cursor-pointer p-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] bg-slate-50 dark:bg-[#17243A]">
              <input
                type="checkbox"
                checked={useClosingBalance}
                onChange={(e) => setUseClosingBalance(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Use this as my current available cash balance</span>
            </label>
          </div>
          <p className="text-[11px] text-[#52657A] dark:text-[#B8C5D6] leading-relaxed">
            <strong>Important Safety Notice:</strong> A bank statement only reflects historical activity up to its end date. We never assume historical statement balances equal your current cash in hand unless you explicitly confirm above.
          </p>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5FAFF] dark:bg-[#17243A] text-slate-500 dark:text-slate-400 border-b border-[#D7E7F5] dark:border-[#2A3B52] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                <th className="py-3.5 px-4 text-center">Confidence</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7E7F5] dark:divide-[#2A3B52]">
              {transactions.map((tx) => {
                const isEditing = editingId === tx.id;
                const rupees = (Number(tx.amountPaise) / 100).toFixed(2);

                return (
                  <tr
                    key={tx.id}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                      tx.confidence === 'LOW'
                        ? 'bg-amber-50/30 dark:bg-amber-950/20'
                        : ''
                    }`}
                  >
                    {/* Date */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                      {isEditing ? (
                        <input
                          type="date"
                          value={tx.date}
                          onChange={(e) => handleFieldChange(tx.id, 'date', e.target.value)}
                          className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      ) : (
                        tx.date
                      )}
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 font-medium text-[#0F2747] dark:text-[#F8FAFC]">
                      {isEditing ? (
                        <input
                          type="text"
                          value={tx.description}
                          onChange={(e) => handleFieldChange(tx.id, 'description', e.target.value)}
                          className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      ) : (
                        <span>{tx.description}</span>
                      )}
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isEditing ? (
                        <select
                          value={tx.type}
                          onChange={(e) => handleFieldChange(tx.id, 'type', e.target.value)}
                          className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                        >
                          <option value="CREDIT">Income (Credit)</option>
                          <option value="DEBIT">Expense (Debit)</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.type === 'CREDIT'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {tx.type === 'CREDIT' ? 'Income' : 'Expense'}
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-bold">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={rupees}
                          onChange={(e) => handleFieldChange(tx.id, 'amountPaise', e.target.value)}
                          className="w-24 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-right font-mono"
                        />
                      ) : (
                        <span className={tx.type === 'CREDIT' ? 'text-[#059669] dark:text-[#34D399]' : 'text-slate-900 dark:text-white'}>
                          {tx.type === 'CREDIT' ? '+' : '-'}₹{Number(rupees).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>

                    {/* Confidence */}
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <span
                        title={tx.confidenceReason}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.confidence === 'HIGH'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : tx.confidence === 'MEDIUM'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                        }`}
                      >
                        {tx.confidence === 'HIGH' ? 'High' : tx.confidence === 'MEDIUM' ? 'Medium' : 'Low'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 whitespace-nowrap text-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(isEditing ? null : tx.id)}
                        className="text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA] hover:underline"
                      >
                        {isEditing ? 'Done' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tx.id)}
                        className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Summary & Action Bar */}
        <div className="p-4 bg-[#F5FAFF] dark:bg-[#17243A] border-t border-[#D7E7F5] dark:border-[#2A3B52] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#52657A] dark:text-[#B8C5D6]">
          <div>
            Total extracted: <strong>{transactions.length} rows</strong> ({highCount} High Confidence, {reviewCount} Review Needed)
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/upload"
              className="px-4 py-2 rounded-lg border border-[#D7E7F5] dark:border-[#2A3B52] text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel / Re-upload
            </Link>
            <button
              type="button"
              onClick={handleConfirmAndAnalyze}
              disabled={isLoading || transactions.length === 0}
              className="px-6 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50"
            >
              Confirm & Analyze ({transactions.length} Transactions) →
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
