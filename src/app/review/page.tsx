'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import { ExtractedStatementTransaction } from '@/lib/statement-extractor';

export default function ReviewExtractionPage() {
  const router = useRouter();
  const { extractedDraft, analyzeTransactions, confirmedTransactions, isLoading } = useFinancialData();

  const [transactions, setTransactions] = useState<ExtractedStatementTransaction[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [useClosingBalance, setUseClosingBalance] = useState<boolean>(false);
  const [closingBalanceRupees, setClosingBalanceRupees] = useState<string>('');
  const [showDevOcr, setShowDevOcr] = useState<boolean>(false);

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

  const handleFieldChange = (
    id: string,
    field: keyof ExtractedStatementTransaction,
    value: string
  ) => {
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id !== id) return tx;

        if (field === 'amountPaise') {
          const paise = Math.round(parseFloat(value || '0') * 100);
          const remainingUncertain = (tx.uncertainFields || []).filter((f) => f !== 'amount');
          return {
            ...tx,
            amountPaise: paise.toString(),
            uncertainFields: remainingUncertain,
            needsReview: remainingUncertain.length > 0,
          };
        }

        if (field === 'type') {
          const remainingUncertain = (tx.uncertainFields || []).filter((f) => f !== 'type');
          return {
            ...tx,
            type: value as 'CREDIT' | 'DEBIT',
            uncertainFields: remainingUncertain,
            needsReview: remainingUncertain.length > 0,
            confidence: remainingUncertain.length === 0 ? 'HIGH' : tx.confidence,
          };
        }

        if (field === 'date') {
          const remainingUncertain = (tx.uncertainFields || []).filter((f) => f !== 'date');
          return {
            ...tx,
            date: value,
            dateNeedsReview: false,
            uncertainFields: remainingUncertain,
            needsReview: remainingUncertain.length > 0,
          };
        }

        if (field === 'description') {
          const remainingUncertain = (tx.uncertainFields || []).filter((f) => f !== 'description');
          return {
            ...tx,
            description: value,
            uncertainFields: remainingUncertain,
            needsReview: remainingUncertain.length > 0,
          };
        }

        return { ...tx, [field]: value };
      })
    );
  };

  const handleDelete = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  };

  const handleAddRow = () => {
    const today = new Date().toISOString().slice(0, 10);
    const newTx: ExtractedStatementTransaction = {
      id: `manual_${Date.now()}`,
      date: today,
      description: 'Manual Entry',
      amountPaise: '0',
      type: 'DEBIT',
      confidence: 'HIGH',
      confidenceReason: 'Manually added by user during review.',
      needsReview: false,
    };
    setTransactions((prev) => [newTx, ...prev]);
    setEditingId(newTx.id);
  };

  const handleConfirmAndAnalyze = async () => {
    const confirmedBal = useClosingBalance && closingBalanceRupees ? closingBalanceRupees : undefined;
    const existing = confirmedTransactions || [];
    const merged = [
      ...existing,
      ...transactions.filter((tx) => !existing.some((e) => e.id === tx.id)),
    ];
    const success = await analyzeTransactions(
      merged,
      extractedDraft.sourceType,
      'Extracted Statement',
      confirmedBal
    );
    if (success) {
      router.push('/dashboard');
    }
  };

  const highCount = transactions.filter((t) => t.confidence === 'HIGH' && !t.needsReview).length;
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
                • {extractedDraft.pagesProcessed} screenshots processed
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight mt-1.5">
            Review your transactions
          </h1>
          <p className="text-[#52657A] dark:text-[#B8C5D6] text-sm mt-1 max-w-2xl">
            Verify the extracted records below. You can edit dates, amounts, descriptions, switch Income/Expense, or delete incorrect lines before building your plan.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAddRow}
            className="px-3.5 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] bg-white dark:bg-[#111C2E] text-xs font-semibold text-[#0F2747] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            + Add Transaction
          </button>
          <button
            type="button"
            onClick={handleConfirmAndAnalyze}
            disabled={isLoading || transactions.length === 0}
            className="px-6 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Analyzing...
              </>
            ) : (
              <span>Use these transactions →</span>
            )}
          </button>
        </div>
      </div>

      {/* Extraction Quality Banner (Requirement 8 & 23) */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
          reviewCount > 0
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
            : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">
            {reviewCount > 0 ? '⚠️' : '✓'}
          </span>
          <div>
            <p className="text-sm font-bold">
              {reviewCount > 0
                ? `Found ${transactions.length} transactions. ${reviewCount} need your review.`
                : `Found ${transactions.length} transactions.`}
            </p>
            <p className="text-xs opacity-90 mt-0.5">
              {reviewCount > 0
                ? "We could read this screenshot, but highlighted fields require your confirmation. Check direction, dates, or amounts below."
                : 'All transactions were confidently detected from your upload.'}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-xs font-bold font-mono">
          {highCount}/{transactions.length} confident
        </div>
      </div>

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
                const isRowUncertain = tx.needsReview || (tx.uncertainFields && tx.uncertainFields.length > 0);

                return (
                  <tr
                    key={tx.id}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                      isRowUncertain ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                    }`}
                  >
                    {/* Date Field (Requirement 10) */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                      {isEditing ? (
                        <input
                          type="date"
                          value={tx.date}
                          onChange={(e) => handleFieldChange(tx.id, 'date', e.target.value)}
                          className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span>{tx.date}</span>
                          {(tx.uncertainFields?.includes('date') || tx.dateNeedsReview) && (
                            <span
                              title="Year was inferred or omitted in screenshot. Please verify date."
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            >
                              Confirm date
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Description Field (Requirement 8 & 10) */}
                    <td className="py-3 px-4 font-medium text-[#0F2747] dark:text-[#F8FAFC]">
                      {isEditing ? (
                        <input
                          type="text"
                          value={tx.description}
                          onChange={(e) => handleFieldChange(tx.id, 'description', e.target.value)}
                          className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={tx.description === 'Unclear merchant' ? 'italic text-amber-600 dark:text-amber-400' : ''}>
                            {tx.description}
                          </span>
                          {(tx.uncertainFields?.includes('description') || tx.description === 'Unclear merchant') && (
                            <span
                              title="Merchant name was unclear in screenshot. Tap Edit to adjust."
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            >
                              Unclear
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Type Field (Requirement 5 & 10) */}
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
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleFieldChange(tx.id, 'type', tx.type === 'CREDIT' ? 'DEBIT' : 'CREDIT')}
                            title="Click to switch between Income and Expense"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                              tx.type === 'CREDIT'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700'
                                : 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            <span>{tx.type === 'CREDIT' ? '↓ Income' : '↑ Expense'}</span>
                            <span className="text-[10px] opacity-60">⇄</span>
                          </button>
                          {tx.uncertainFields?.includes('type') && (
                            <span
                              title="Direction was not explicitly visible in screenshot text. Please confirm."
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            >
                              Confirm direction
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Amount Field (Requirement 4 & 10) */}
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
                        <div className="flex items-center justify-end gap-1.5">
                          {tx.uncertainFields?.includes('amount') && (
                            <span
                              title="Amount context was ambiguous. Please verify."
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            >
                              Check
                            </span>
                          )}
                          <span className={tx.type === 'CREDIT' ? 'text-[#059669] dark:text-[#34D399]' : 'text-slate-900 dark:text-white'}>
                            {tx.type === 'CREDIT' ? '+' : '-'}₹{Number(rupees).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Confidence Field */}
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <span
                        title={tx.confidenceReason}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.confidence === 'HIGH' && !isRowUncertain
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : tx.confidence === 'MEDIUM'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                        }`}
                      >
                        {tx.confidence === 'HIGH' && !isRowUncertain ? 'High' : tx.confidence === 'MEDIUM' ? 'Medium' : 'Needs Review'}
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
            {transactions.length > 0 && (
              <tfoot className="bg-[#F5FAFF] dark:bg-[#17243A] border-t-2 border-[#D7E7F5] dark:border-[#2A3B52] font-mono text-xs">
                <tr>
                  <td colSpan={3} className="py-3 px-4 font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                    Total Expenses ({transactions.filter(t => t.type === 'DEBIT').length})
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-[#0F2747] dark:text-[#F8FAFC]">
                    -₹{(Number(transactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + BigInt(t.amountPaise || 0), 0n)) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2}></td>
                </tr>
                {transactions.some(t => t.type === 'CREDIT') && (
                  <tr>
                    <td colSpan={3} className="py-3 px-4 font-bold text-[#059669] dark:text-[#34D399]">
                      Total Income ({transactions.filter(t => t.type === 'CREDIT').length})
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#059669] dark:text-[#34D399]">
                      +₹{(Number(transactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + BigInt(t.amountPaise || 0), 0n)) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                )}
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Development-Only OCR Debugger Panel (Requirement 2) */}
      {extractedDraft.debugOcr && (
        <div className="mt-8 p-5 rounded-2xl bg-slate-900 text-slate-100 border border-slate-700 text-xs font-mono space-y-3 shadow-md">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setShowDevOcr(!showDevOcr)}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-400">🛠️ Dev OCR Debugger</span>
              <span className="text-[10px] text-slate-400 font-normal">
                (Development Only: What Was Read vs What Was Extracted)
              </span>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              {showDevOcr ? 'Hide Debugger ▲' : 'Inspect Raw OCR Stream ▼'}
            </button>
          </div>

          {showDevOcr && (
            <div className="space-y-4 pt-3 border-t border-slate-800">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-bold text-slate-300">Raw OCR Text Stream:</p>
                  <span className="text-[10px] text-slate-400">
                    {extractedDraft.debugOcr.rawText.length} characters
                  </span>
                </div>
                <pre className="p-3 bg-black/60 rounded-xl text-[11px] text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono border border-slate-800">
                  {extractedDraft.debugOcr.rawText}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-bold text-slate-300">
                    Detected Spatial Line Coordinates ({extractedDraft.debugOcr.lineCount} lines):
                  </p>
                </div>
                <div className="max-h-56 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800 bg-black/40">
                  {extractedDraft.debugOcr.lines.map((l, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 hover:bg-slate-800/40 text-[11px]">
                      <span className="truncate max-w-[360px] text-slate-200">
                        {idx + 1}. {l.text}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        y: {l.y0}–{l.y1} | conf: {l.conf}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
