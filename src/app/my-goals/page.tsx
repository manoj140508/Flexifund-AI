'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFinancialData } from '@/context/FinancialDataContext';
import { useAuth } from '@/context/AuthContext';
import {
  useGoals,
  GOAL_TYPE_LABELS,
  GoalType,
  Goal,
} from '@/lib/use-goals';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupees(rupees: number): string {
  return `₹${Math.round(rupees).toLocaleString('en-IN')}`;
}

function getMonthlyGuidance(
  targetRupees: number,
  currentRupees: number,
  targetDateStr?: string
): { text: string; isPast: boolean } | null {
  if (!targetDateStr) return null;
  const target = new Date(targetDateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (target < now) {
    return {
      text: `Target date passed on ${target.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}. Consider editing your target date.`,
      isPast: true,
    };
  }

  const remaining = Math.max(0, targetRupees - currentRupees);
  if (remaining === 0) return null;

  const months =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth());

  const validMonths = Math.max(1, months);
  const monthlyAmount = Math.ceil(remaining / validMonths);
  const targetMonthYear = target.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return {
    text: `Save about ${formatRupees(monthlyAmount)}/month to reach this goal by ${targetMonthYear}.`,
    isPast: false,
  };
}

// ─── Goal Progress Card ────────────────────────────────────────────────────────

// ─── Goal Progress Card ────────────────────────────────────────────────────────

function GoalCard({
  goal,
  currentCashRupees,
  onAddMoney,
  onEditGoal,
  onDelete,
  isSaving,
}: {
  goal: Goal;
  currentCashRupees: number | null;
  onAddMoney: (_goalId: string, _amount: number) => Promise<{ success: boolean; error?: string }>;
  onEditGoal: (_goalId: string, _updates: { title?: string; targetAmount?: number; targetDate?: string | null }) => Promise<{ success: boolean; error?: string }>;
  onDelete: (_id: string) => Promise<boolean>;
  isSaving: boolean;
}) {
  const meta = GOAL_TYPE_LABELS[goal.type];
  const effectiveCurrent =
    (goal.currentRupees !== undefined && goal.currentRupees > 0)
      ? goal.currentRupees
      : (currentCashRupees !== null ? currentCashRupees : 0);

  const hasProgress = effectiveCurrent > 0 || currentCashRupees !== null;
  const isCompleted = effectiveCurrent >= goal.targetRupees;
  const progressPercent = Math.min(100, Math.round((effectiveCurrent / goal.targetRupees) * 100));
  const remainingRupees = Math.max(0, goal.targetRupees - effectiveCurrent);
  const monthlyGuidance = getMonthlyGuidance(goal.targetRupees, effectiveCurrent, goal.targetDate);

  // Modal / Action states
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addAmountInput, setAddAmountInput] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.label);
  const [editTarget, setEditTarget] = useState(String(goal.targetRupees));
  const [editTargetDate, setEditTargetDate] = useState(goal.targetDate || '');
  const [editError, setEditError] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Add Money Handler
  const handleAddMoneySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setAddError('');

    const parsed = Number(addAmountInput.replace(/,/g, '').trim());
    if (!addAmountInput || isNaN(parsed) || parsed <= 0) {
      setAddError('Please enter an amount greater than ₹0.');
      return;
    }
    if (parsed > 100_000_000) {
      setAddError('Amount is too large (max ₹10 crore).');
      return;
    }

    const res = await onAddMoney(goal.id, parsed);
    if (res.success) {
      setAddSuccess(true);
      setAddAmountInput('');
      setTimeout(() => {
        setAddSuccess(false);
        setShowAddMoney(false);
      }, 700);
    } else {
      setAddError(res.error || 'Failed to update money saved.');
    }
  };

  // Edit Goal Handler
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setEditError('');

    if (!editTitle.trim()) {
      setEditError('Goal name cannot be empty.');
      return;
    }
    const parsed = Number(editTarget.replace(/,/g, '').trim());
    if (!editTarget || isNaN(parsed) || parsed <= 0) {
      setEditError('Target amount must be greater than ₹0.');
      return;
    }

    const res = await onEditGoal(goal.id, {
      title: editTitle.trim(),
      targetAmount: parsed,
      targetDate: editTargetDate ? editTargetDate.slice(0, 10) : null,
    });

    if (res.success) {
      setShowEdit(false);
    } else {
      setEditError(res.error || 'Failed to save changes.');
    }
  };

  return (
    <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl sm:text-3xl shrink-0">{meta.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-[#0F2747] dark:text-[#F8FAFC]">
                {goal.label}
              </h3>
              {isCompleted && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                  Goal reached 🎉
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-[#52657A] dark:text-[#94A3B8] mt-0.5">
              Target: <span className="font-semibold text-[#0F2747] dark:text-[#F8FAFC]">{formatRupees(goal.targetRupees)}</span>
              {goal.targetDate && (
                <span>
                  {' '}· by{' '}
                  {new Date(goal.targetDate + 'T00:00:00').toLocaleDateString('en-IN', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Actions (Edit, Delete) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditTitle(goal.label);
              setEditTarget(String(goal.targetRupees));
              setEditTargetDate(goal.targetDate || '');
              setShowEdit(true);
            }}
            className="text-[#52657A] dark:text-[#94A3B8] hover:text-[#2563EB] dark:hover:text-[#60A5FA] p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Edit goal"
            aria-label="Edit goal"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-[#52657A] dark:text-[#94A3B8] hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Delete goal"
            aria-label="Delete goal"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress & Numbers */}
      <div className="space-y-2 pt-1">
        <div className="flex justify-between items-baseline text-xs sm:text-sm font-bold">
          <span className="text-[#0F2747] dark:text-[#F8FAFC]">
            Saved so far: {formatRupees(effectiveCurrent)}
          </span>
          <span className={isCompleted ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-[#2563EB] dark:text-[#60A5FA]'}>
            {progressPercent}%
          </span>
        </div>

        {/* Visual Progress Bar capped at 100% */}
        <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            style={{ width: `${progressPercent}%` }}
            className={`h-full rounded-full transition-all duration-500 ${
              isCompleted
                ? 'bg-emerald-500'
                : 'bg-[#2563EB]'
            }`}
          />
        </div>

        {/* Remaining amount or Goal Reached celebration */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <p className="text-[#52657A] dark:text-[#CBD5E1]">
            {isCompleted ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                🎉 Goal reached! Amazing work on saving for this.
              </span>
            ) : (
              <span>
                <strong className="text-[#0F2747] dark:text-[#F8FAFC]">{formatRupees(remainingRupees)}</strong> left to save.
              </span>
            )}
          </p>

          {effectiveCurrent > goal.targetRupees && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              (+{formatRupees(effectiveCurrent - goal.targetRupees)} extra saved)
            </span>
          )}
        </div>

        {/* Monthly Target Guidance */}
        {monthlyGuidance && (
          <p className={`text-[11px] sm:text-xs pt-1 ${monthlyGuidance.isPast ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-[#52657A] dark:text-[#94A3B8]'}`}>
            {monthlyGuidance.text}
          </p>
        )}
      </div>

      {/* Primary Action Button: Add Money */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => {
            setAddError('');
            setShowAddMoney(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold transition-colors shadow-2xs"
        >
          <span>＋ Add money</span>
        </button>

        {!hasProgress && (
          <p className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">
            Click &quot;Add money&quot; when you set cash aside for this goal.
          </p>
        )}
      </div>

      {/* ─── Add Money Modal / Panel ─── */}
      {showAddMoney && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-extrabold text-base text-[#0F2747] dark:text-[#F8FAFC]">
                  Add money to goal
                </h4>
                <p className="text-xs text-[#52657A] dark:text-[#94A3B8] mt-0.5">
                  {goal.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMoney(false)}
                className="text-[#52657A] dark:text-[#94A3B8] hover:text-[#0F2747] dark:hover:text-white p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {addSuccess ? (
              <div className="py-4 text-center space-y-2">
                <span className="text-3xl">🎉</span>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Money added! Updated your goal.
                </p>
              </div>
            ) : (
              <form onSubmit={handleAddMoneySubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] uppercase tracking-wider">
                    Amount you added
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#52657A] dark:text-[#94A3B8]">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      autoFocus
                      value={addAmountInput}
                      onChange={(e) => {
                        setAddAmountInput(e.target.value);
                        setAddError('');
                      }}
                      placeholder="500"
                      required
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] bg-white dark:bg-[#0F1A2A] text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
                    />
                  </div>
                  <p className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">
                    Current saved: {formatRupees(effectiveCurrent)} → will become {formatRupees(effectiveCurrent + (Number(addAmountInput) || 0))}
                  </p>
                </div>

                {addError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{addError}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMoney(false)}
                    disabled={isSaving}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#52657A] dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 disabled:bg-blue-400 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {isSaving ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save amount</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── Edit Goal Modal ─── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-extrabold text-base text-[#0F2747] dark:text-[#F8FAFC]">
                  Edit goal
                </h4>
                <p className="text-xs text-[#52657A] dark:text-[#94A3B8] mt-0.5">
                  Update target details without changing saved money
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="text-[#52657A] dark:text-[#94A3B8] hover:text-[#0F2747] dark:hover:text-white p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] uppercase tracking-wider">
                  Goal name
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                    setEditError('');
                  }}
                  maxLength={60}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] bg-white dark:bg-[#0F1A2A] text-sm text-[#0F2747] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] uppercase tracking-wider">
                  Target amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#52657A] dark:text-[#94A3B8]">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editTarget}
                    onChange={(e) => {
                      setEditTarget(e.target.value);
                      setEditError('');
                    }}
                    required
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] bg-white dark:bg-[#0F1A2A] text-sm text-[#0F2747] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] uppercase tracking-wider">
                  Target date (optional)
                </label>
                <input
                  type="date"
                  value={editTargetDate}
                  onChange={(e) => {
                    setEditTargetDate(e.target.value);
                    setEditError('');
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] bg-white dark:bg-[#0F1A2A] text-sm text-[#0F2747] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {editError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{editError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#52657A] dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 disabled:bg-blue-400 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111C2E] border border-rose-200 dark:border-rose-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
              🗑️
            </div>
            <div>
              <h4 className="font-extrabold text-base text-[#0F2747] dark:text-[#F8FAFC]">
                Delete this goal?
              </h4>
              <p className="text-xs text-[#52657A] dark:text-[#94A3B8] mt-1">
                Are you sure you want to remove &quot;{goal.label}&quot;? This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#52657A] dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Keep goal
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDelete(goal.id);
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
              >
                Delete goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create Goal Form ──────────────────────────────────────────────────────────

function CreateGoalForm({
  onCreated,
  onCancel,
  onAddGoal,
  isSaving,
  serverError,
}: {
  onCreated: () => void;
  onCancel?: () => void;
  onAddGoal: (_g: {
    type: GoalType;
    label: string;
    targetRupees: number;
    currentRupees?: number;
    targetDate?: string;
  }) => Promise<{ success: boolean; goal?: Goal; error?: string }>;
  isSaving: boolean;
  serverError?: string | null;
}) {
  const [type, setType] = useState<GoalType>('EMERGENCY_CUSHION');
  const [customLabel, setCustomLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [localError, setLocalError] = useState('');
  const [successBanner, setSuccessBanner] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setLocalError('');
    const parsed = Number(amount.replace(/,/g, '').trim());
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setLocalError('Please enter a valid target amount greater than ₹0.');
      return;
    }
    if (parsed > 100_000_000) {
      setLocalError('Please enter a target amount under ₹10 crore.');
      return;
    }

    let parsedCurrent = 0;
    if (currentAmount.trim()) {
      parsedCurrent = Number(currentAmount.replace(/,/g, '').trim());
      if (isNaN(parsedCurrent) || parsedCurrent < 0) {
        setLocalError('Current amount already saved cannot be negative.');
        return;
      }
    }

    if (targetDate) {
      const selected = new Date(targetDate + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        setLocalError('Target date cannot be in the past.');
        return;
      }
    }

    const label =
      type === 'OTHER' && customLabel.trim()
        ? customLabel.trim()
        : GOAL_TYPE_LABELS[type].label;

    const result = await onAddGoal({
      type,
      label,
      targetRupees: parsed,
      currentRupees: parsedCurrent,
      targetDate: targetDate || undefined,
    });

    if (result.success) {
      setSuccessBanner(true);
      setTimeout(() => {
        onCreated();
      }, 500);
    } else if (result.error) {
      setLocalError(result.error);
    }
  };

  const activeError = localError || serverError;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 shadow-sm space-y-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base text-[#0F2747] dark:text-[#F8FAFC]">
          Create a goal
        </h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="text-xs font-semibold text-[#52657A] dark:text-[#94A3B8] hover:text-[#0F2747] dark:hover:text-white"
          >
            Cancel
          </button>
        )}
      </div>

      {successBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <span>✓</span>
          <span>Goal created and saved successfully!</span>
        </div>
      )}

      {/* Goal type */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] uppercase tracking-wider">
          What are you saving for?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.keys(GOAL_TYPE_LABELS) as GoalType[]).map((t) => {
            const meta = GOAL_TYPE_LABELS[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-colors text-xs font-semibold ${
                  type === t
                    ? 'bg-[#EFF6FF] dark:bg-blue-950/50 border-[#2563EB] text-[#2563EB] dark:text-[#60A5FA]'
                    : 'bg-[#F8FAFC] dark:bg-[#17243A] border-[#E2E8F0] dark:border-[#26354D] text-[#0F2747] dark:text-[#F8FAFC] hover:border-[#2563EB]/50'
                }`}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom label for OTHER */}
      {type === 'OTHER' && (
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] uppercase tracking-wider">
            Describe your goal (optional)
          </label>
          <input
            type="text"
            value={customLabel}
            onChange={(e) => { setCustomLabel(e.target.value); setLocalError(''); }}
            placeholder="e.g. Laptop, vehicle repair, deposit…"
            maxLength={60}
            className="w-full px-4 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] bg-white dark:bg-[#0F1A2A] text-sm text-[#0F2747] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA] transition-colors"
          />
        </div>
      )}

      {/* Target amount */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] uppercase tracking-wider">
          Target amount
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#52657A] dark:text-[#94A3B8]">
            ₹
          </span>
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setLocalError(''); }}
            placeholder="10,000"
            required
            className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] bg-white dark:bg-[#0F1A2A] text-sm text-[#0F2747] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA] transition-colors"
          />
        </div>
      </div>

      {/* Already saved amount (optional) */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] uppercase tracking-wider">
          Already saved toward this <span className="font-normal normal-case">(optional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#52657A] dark:text-[#94A3B8]">
            ₹
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={currentAmount}
            onChange={(e) => { setCurrentAmount(e.target.value); setLocalError(''); }}
            placeholder="0"
            className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] bg-white dark:bg-[#0F1A2A] text-sm text-[#0F2747] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA] transition-colors"
          />
        </div>
      </div>

      {/* Target date (optional) */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[#52657A] dark:text-[#94A3B8] uppercase tracking-wider">
          Target date <span className="font-normal normal-case">(optional)</span>
        </label>
        <input
          type="date"
          value={targetDate}
          onChange={(e) => { setTargetDate(e.target.value); setLocalError(''); }}
          min={new Date().toISOString().slice(0, 10)}
          className="w-full px-4 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] bg-white dark:bg-[#0F1A2A] text-sm text-[#0F2747] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA] transition-colors"
        />
      </div>

      {activeError && (
        <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{activeError}</p>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-blue-600 disabled:bg-blue-400 text-white font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
      >
        {isSaving ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>Saving goal...</span>
          </>
        ) : (
          <span>Create goal</span>
        )}
      </button>
    </form>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MyGoalsPage() {
  const { user } = useAuth();
  const {
    goals,
    addGoal,
    updateGoal,
    addMoneyToGoal,
    deleteGoal,
    hydrated,
    isLoading,
    isSaving,
    error,
  } = useGoals(user?.id);
  const { profile } = useFinancialData();
  const [showForm, setShowForm] = useState(false);

  const currentCashRupees =
    profile.currentCashBalanceRupees && !isNaN(Number(profile.currentCashBalanceRupees))
      ? Number(profile.currentCashBalanceRupees)
      : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] dark:text-[#F8FAFC] tracking-tight">
              My Goals
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#52657A] dark:text-[#CBD5E1]">
            Set a target that works for you.
          </p>
        </div>

        {goals.length > 0 && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors shrink-0"
          >
            ＋ Add another goal
          </button>
        )}
      </div>

      {/* Loading state indicator */}
      {isLoading && !hydrated && (
        <div className="py-12 text-center text-[#52657A] dark:text-[#CBD5E1] space-y-3">
          <div className="w-8 h-8 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs">Loading your saved goals...</p>
        </div>
      )}

      {/* Empty state */}
      {hydrated && goals.length === 0 && !showForm && (
        <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-8 sm:p-12 text-center space-y-5 shadow-sm">
          <div className="text-4xl">🎯</div>
          <div className="space-y-2">
            <p className="text-base font-bold text-[#0F2747] dark:text-[#F8FAFC]">
              Set your first money goal.
            </p>
            <p className="text-sm text-[#52657A] dark:text-[#CBD5E1]">
              A clear goal makes it easier to save, even when income changes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#2563EB] text-white font-bold text-sm hover:bg-blue-600 transition-colors shadow-sm"
          >
            Create a goal →
          </button>
        </div>
      )}

      {/* Create goal form */}
      {(showForm || (hydrated && goals.length === 0 && showForm)) && (
        <CreateGoalForm
          onCreated={() => setShowForm(false)}
          onCancel={goals.length > 0 ? () => setShowForm(false) : undefined}
          onAddGoal={addGoal}
          isSaving={isSaving}
          serverError={error}
        />
      )}

      {/* Goal list */}
      {hydrated && goals.length > 0 && (
        <div className="space-y-4">
          {goals.map((goal: Goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currentCashRupees={currentCashRupees}
              onAddMoney={addMoneyToGoal}
              onEditGoal={updateGoal}
              onDelete={deleteGoal}
              isSaving={isSaving}
            />
          ))}
        </div>
      )}

      {/* How to track progress note */}
      {hydrated && goals.length > 0 && currentCashRupees === null && (
        <div className="p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <p className="text-xs text-[#52657A] dark:text-[#CBD5E1]">
            <span className="font-bold text-[#0F2747] dark:text-[#F8FAFC]">Tip:</span>{' '}
            Add your current cash balance in Profile to track progress towards your goals.
          </p>
          <Link
            href="/profile"
            className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline shrink-0"
          >
            Update Profile →
          </Link>
        </div>
      )}

      {/* Cross-link to Save More */}
      {hydrated && goals.length > 0 && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52]">
          <p className="text-xs text-[#52657A] dark:text-[#CBD5E1]">
            See personalised saving suggestions
          </p>
          <Link href="/savings" className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline">
            Save More →
          </Link>
        </div>
      )}
    </div>
  );
}
