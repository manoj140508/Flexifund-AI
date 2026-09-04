'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';

interface CanISpendThisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAsExpense?: (_item: { description: string; amountRupees: number; category: string }) => void;
}

const CATEGORIES = [
  { id: 'FOOD', label: 'Food & Dining', icon: '🍔' },
  { id: 'TRAVEL', label: 'Travel & Petrol', icon: '⛽' },
  { id: 'SHOPPING', label: 'Shopping & Clothes', icon: '🛍️' },
  { id: 'BILL', label: 'Bill or Recharge', icon: '💡' },
  { id: 'WORK', label: 'Work Tools', icon: '🔧' },
  { id: 'OTHER', label: 'Other', icon: '📦' },
];

const PRESET_AMOUNTS = [200, 500, 1000, 2000, 5000];

export default function CanISpendThisModal({ isOpen, onClose, onAddAsExpense }: CanISpendThisModalProps) {
  const { analysisResult } = useFinancialData();
  const [spendAmount, setSpendAmount] = useState<string>('500');
  const [selectedCategory, setSelectedCategory] = useState<string>('FOOD');

  if (!isOpen) return null;

  // Format currency in Rupees
  const formatRupees = (paiseVal: bigint) => {
    const rupees = Math.round(Number(paiseVal) / 100);
    return `₹${rupees.toLocaleString('en-IN')}`;
  };

  // If no financial activity uploaded (Requirement 14)
  if (!analysisResult) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="can-i-spend-title"
      >
        <div
          className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center text-2xl mx-auto">
            💳
          </div>
          <div className="space-y-2">
            <h2 id="can-i-spend-title" className="text-xl sm:text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC]">
              Can I Spend This?
            </h2>
            <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
              Upload your financial activity first so we can give you a useful answer based on your actual income and expenses.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/upload"
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-[#2563EB] text-white font-bold text-xs sm:text-sm hover:bg-blue-600 transition-colors shadow-sm"
            >
              Upload statement →
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inc = analysisResult.incomeAnalysis;
  const exp = analysisResult.expenseAnalysis;
  const sav = analysisResult.savingsCapacity;

  const earnedPaise = BigInt(inc.monthlyAverage?.paise || inc.totalIncome.paise);
  const spentPaise = BigInt(exp.monthlyAverageExpenses?.paise || exp.totalExpenses.paise);
  const leftPaise = earnedPaise - spentPaise;
  const savingTargetPaise = BigInt(sav.conservativeMonthlyReference?.paise || '0');

  // Parse entered amount
  const cleanInput = spendAmount.trim().replace(/,/g, '');
  const parsedNum = Number(cleanInput);
  const isValidAmount = !isNaN(parsedNum) && parsedNum > 0 && isFinite(parsedNum);
  const purchasePaise = isValidAmount ? BigInt(Math.round(parsedNum * 100)) : 0n;

  // Impact calculations
  const newLeftPaise = leftPaise - purchasePaise;
  const isVolatile = inc.volatilityRating === 'HIGH' || inc.volatilityRating === 'EXTREME';

  // Deterministic Verdict
  type VerdictType = {
    badge: string;
    label: string;
    colorClass: string;
    headline: string;
  };

  let verdict: VerdictType;

  if (!isValidAmount) {
    verdict = {
      badge: '💬',
      label: 'ENTER AN AMOUNT',
      colorClass: 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
      headline: 'Type an amount above to see how it affects your money.',
    };
  } else if (newLeftPaise < 0n || leftPaise <= 0n) {
    // 🔴 Deficit or creates deficit
    verdict = {
      badge: '🔴',
      label: 'MAY PUT PRESSURE ON YOUR BUDGET',
      colorClass: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
      headline: 'This purchase could leave you with too little room for your regular expenses.',
    };
  } else if (newLeftPaise < savingTargetPaise || (isVolatile && purchasePaise > (earnedPaise * 15n) / 100n)) {
    // 🟡 Tighter cushion or encroaches on saving target
    verdict = {
      badge: '🟡',
      label: 'THINK ABOUT IT',
      colorClass: 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
      headline: 'This purchase may reduce the amount you can put toward your saving target this month.',
    };
  } else {
    // 🟢 Fits comfortably
    verdict = {
      badge: '🟢',
      label: 'LOOKS AFFORDABLE',
      colorClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
      headline: 'This purchase appears to fit within your current planned spending.',
    };
  }

  // Explanation text
  const currentLeftDisplay = formatRupees(leftPaise);
  const newLeftDisplay = formatRupees(newLeftPaise);
  const purchaseDisplay = isValidAmount ? `₹${Math.round(parsedNum).toLocaleString('en-IN')}` : '₹0';

  const explanation = isValidAmount
    ? newLeftPaise >= 0n
      ? `If you spend ${purchaseDisplay}, your remaining monthly cushion could fall from ${currentLeftDisplay} to ${newLeftDisplay}.`
      : `Spending ${purchaseDisplay} would push your monthly expenses ₹${Math.abs(Math.round(Number(newLeftPaise) / 100)).toLocaleString('en-IN')} beyond your current earnings.`
    : '';

  const handleLogAsExpense = () => {
    if (!isValidAmount || !onAddAsExpense) return;
    const catObj = CATEGORIES.find((c) => c.id === selectedCategory);
    onAddAsExpense({
      description: catObj ? catObj.label : 'Purchase',
      amountRupees: parsedNum,
      category: selectedCategory === 'FOOD' ? 'DISCRETIONARY' : selectedCategory === 'TRAVEL' ? 'WORK_FUEL_TRANSIT' : 'OTHER',
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="can-i-spend-title"
    >
      <div
        className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">💳</span>
            <div>
              <h2 id="can-i-spend-title" className="text-xl sm:text-2xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC]">
                Can I Spend This?
              </h2>
              <p className="text-xs text-[#52657A] dark:text-[#94A3B8]">
                Check a purchase before you make it
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

        {/* 1. Amount Input & Preset Chips */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC] uppercase tracking-wider block">
            How much do you want to spend?
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
              ₹
            </span>
            <input
              type="number"
              min="1"
              step="1"
              value={spendAmount}
              onChange={(e) => setSpendAmount(e.target.value)}
              placeholder="500"
              className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-[#CBD5E1] dark:border-[#2A3B52] focus:border-[#2563EB] text-2xl font-extrabold font-mono text-[#0F2747] dark:text-[#F8FAFC] outline-hidden transition-colors"
            />
          </div>

          {/* Quick Amount Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setSpendAmount(amt.toString())}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  spendAmount === amt.toString()
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-[#52657A] dark:text-[#CBD5E1] hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                ₹{amt}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Optional: What is it for? */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] uppercase tracking-wider block">
            What is it for? <span className="text-[11px] font-normal normal-case opacity-75">(optional)</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  selectedCategory === cat.id
                    ? 'border-[#2563EB] bg-blue-50/60 dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA] font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C2E] text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50'
                }`}
              >
                <span className="text-base block mb-0.5">{cat.icon}</span>
                <span className="text-[11px] block truncate">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Deterministic Verdict Card */}
        <div className={`p-5 rounded-2xl border ${verdict.colorClass} space-y-2`}>
          <div className="flex items-center gap-2">
            <span className="text-base">{verdict.badge}</span>
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
              {verdict.label}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold leading-relaxed">
            {verdict.headline}
          </p>
          {explanation && (
            <p className="text-xs leading-relaxed opacity-90 pt-1 border-t border-current/15">
              {explanation}
            </p>
          )}
        </div>

        {/* 4. After This Purchase Snapshot */}
        {isValidAmount && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-[#E2E8F0] dark:border-[#26354D] space-y-0.5">
              <span className="text-[11px] font-bold uppercase text-[#52657A] dark:text-[#94A3B8] block">
                Money Left After
              </span>
              <span
                className={`text-base sm:text-lg font-extrabold font-mono block ${
                  newLeftPaise >= 0n ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {newLeftPaise >= 0n ? newLeftDisplay : `-₹${Math.abs(Math.round(Number(newLeftPaise) / 100)).toLocaleString('en-IN')}`}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#17243A] border border-[#E2E8F0] dark:border-[#26354D] space-y-0.5">
              <span className="text-[11px] font-bold uppercase text-[#52657A] dark:text-[#94A3B8] block">
                Saving Target Impact
              </span>
              <span className="text-base sm:text-lg font-extrabold text-[#0F2747] dark:text-[#F8FAFC] font-mono block">
                {newLeftPaise >= savingTargetPaise
                  ? 'No delay'
                  : newLeftPaise > 0n
                  ? `Takes ₹${Math.round(Number(savingTargetPaise - newLeftPaise) / 100).toLocaleString('en-IN')}`
                  : 'Paused'}
              </span>
            </div>
          </div>
        )}

        {/* Friendly Disclaimer */}
        <p className="text-[11px] text-[#52657A] dark:text-[#94A3B8] text-center leading-relaxed">
          Based on the information you&apos;ve provided. This is planning guidance, not financial approval.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          {onAddAsExpense && isValidAmount && (
            <button
              type="button"
              onClick={handleLogAsExpense}
              className="w-full sm:flex-1 py-3.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs sm:text-sm hover:opacity-90 transition-opacity text-center shadow-xs"
            >
              I made this purchase → Log expense
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
