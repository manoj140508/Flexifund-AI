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

function monthsUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth());
  return Math.max(0, months);
}

// ─── Goal Progress Card ────────────────────────────────────────────────────────

function GoalCard({
  goal,
  currentCashRupees,
  onDelete,
}: {
  goal: Goal;
  currentCashRupees: number | null;
  onDelete: (_id: string) => void;
}) {
  const meta = GOAL_TYPE_LABELS[goal.type];
  const hasCash = currentCashRupees !== null;
  const progress = hasCash
    ? Math.min(100, Math.round((currentCashRupees / goal.targetRupees) * 100))
    : null;
  const remaining = hasCash
    ? Math.max(0, goal.targetRupees - currentCashRupees)
    : null;
  const months = goal.targetDate ? monthsUntil(goal.targetDate) : null;

  return (
    <div className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <h3 className="font-bold text-sm text-[#0F2747] dark:text-[#F8FAFC]">
              {goal.label}
            </h3>
            <p className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">
              Target: {formatRupees(goal.targetRupees)}
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
        <button
          type="button"
          onClick={() => onDelete(goal.id)}
          className="text-[#52657A] dark:text-[#94A3B8] hover:text-rose-500 transition-colors p-1 rounded-lg"
          title="Remove goal"
          aria-label="Remove goal"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress */}
      {hasCash && progress !== null && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-[#0F2747] dark:text-[#F8FAFC]">
              {formatRupees(currentCashRupees!)} of {formatRupees(goal.targetRupees)}
            </span>
            <span className="text-[#2563EB] dark:text-[#60A5FA]">{progress}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              style={{ width: `${progress}%` }}
              className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
            />
          </div>
          <p className="text-xs text-[#52657A] dark:text-[#CBD5E1]">
            {remaining === 0
              ? '🎉 Goal reached!'
              : `${formatRupees(remaining ?? 0)} more to reach your goal.`}
          </p>
          {months !== null && months > 0 && remaining! > 0 && (
            <p className="text-[11px] text-[#52657A] dark:text-[#94A3B8]">
              Save about{' '}
              {formatRupees(Math.ceil(remaining! / months))}/month to reach this by{' '}
              {new Date(goal.targetDate! + 'T00:00:00').toLocaleDateString('en-IN', {
                month: 'short',
                year: 'numeric',
              })}
              .
            </p>
          )}
        </div>
      )}

      {/* No cash balance — honest prompt */}
      {!hasCash && (
        <div className="p-3 rounded-xl bg-[#F5FAFF] dark:bg-[#17243A] border border-[#D7E7F5] dark:border-[#2A3B52] text-xs text-[#52657A] dark:text-[#CBD5E1]">
          <span className="font-semibold text-[#0F2747] dark:text-[#F8FAFC]">Add your current available cash</span>{' '}
          to track progress toward this goal.{' '}
          <Link href="/profile" className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline">
            Update in Profile →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Create Goal Form ──────────────────────────────────────────────────────────

function CreateGoalForm({ onCreated }: { onCreated: () => void }) {
  const { addGoal } = useGoals(useAuth().user?.id);
  const [type, setType] = useState<GoalType>('EMERGENCY_CUSHION');
  const [customLabel, setCustomLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(amount.replace(/,/g, '').trim());
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid target amount.');
      return;
    }
    if (parsed > 10_000_000) {
      setError('Please enter a realistic target amount (under ₹1 crore).');
      return;
    }
    const label =
      type === 'OTHER' && customLabel.trim()
        ? customLabel.trim()
        : GOAL_TYPE_LABELS[type].label;
    addGoal({ type, label, targetRupees: parsed, targetDate: targetDate || undefined });
    onCreated();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-[#111C2E] border border-[#D7E7F5] dark:border-[#2A3B52] rounded-3xl p-6 shadow-sm space-y-5"
    >
      <h2 className="font-bold text-base text-[#0F2747] dark:text-[#F8FAFC]">
        Create a goal
      </h2>

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
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="e.g. Laptop, wedding, house deposit…"
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
            onChange={(e) => { setAmount(e.target.value); setError(''); }}
            placeholder="10,000"
            required
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
          onChange={(e) => setTargetDate(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          className="w-full px-4 py-2.5 rounded-xl border border-[#D7E7F5] dark:border-[#2A3B52] bg-white dark:bg-[#0F1A2A] text-sm text-[#0F2747] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA] transition-colors"
        />
      </div>

      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{error}</p>
      )}

      <button
        type="submit"
        className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-sm transition-colors shadow-sm"
      >
        Create goal
      </button>
    </form>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MyGoalsPage() {
  const { user } = useAuth();
  const { goals, deleteGoal, hydrated } = useGoals(user?.id);
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
              onDelete={deleteGoal}
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
