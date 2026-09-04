'use client';

import { useState, useEffect, useCallback } from 'react';

export type GoalType =
  | 'EMERGENCY_CUSHION'
  | 'REDUCE_EXPENSES'
  | 'LOWER_INCOME_PREP'
  | 'SPECIFIC_SAVINGS'
  | 'REDUCE_REPAYMENT'
  | 'OTHER';

export const GOAL_TYPE_LABELS: Record<GoalType, { label: string; icon: string; description: string }> = {
  EMERGENCY_CUSHION: {
    label: 'Build an emergency cushion',
    icon: '🛡',
    description: 'A safety net for unexpected costs or low-income weeks.',
  },
  REDUCE_EXPENSES: {
    label: 'Reduce monthly expenses',
    icon: '✂️',
    description: 'Find and cut spending that is not essential.',
  },
  LOWER_INCOME_PREP: {
    label: 'Prepare for lower-income months',
    icon: '📅',
    description: 'Set money aside before slow seasons arrive.',
  },
  SPECIFIC_SAVINGS: {
    label: 'Save for a specific goal',
    icon: '🎯',
    description: 'A phone, vehicle repair, travel — anything specific.',
  },
  REDUCE_REPAYMENT: {
    label: 'Reduce repayment pressure',
    icon: '💳',
    description: 'Pay down a loan or reduce EMI burden.',
  },
  OTHER: {
    label: 'Other',
    icon: '📝',
    description: 'Any other savings target you have in mind.',
  },
};

export interface Goal {
  id: string;
  type: GoalType;
  label: string;
  targetRupees: number;
  targetDate?: string; // YYYY-MM-DD, optional
  createdAt: string;   // ISO timestamp
}

function storageKey(userId: string | undefined) {
  return userId ? `flexifund_${userId}_goals` : 'flexifund_guest_goals';
}

function loadGoals(userId: string | undefined): Goal[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGoals(userId: string | undefined, goals: Goal[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(goals));
  } catch {}
}

export function useGoals(userId: string | undefined) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage after mount (SSR safe)
  useEffect(() => {
    setGoals(loadGoals(userId));
    setHydrated(true);
  }, [userId]);

  const addGoal = useCallback(
    (g: Omit<Goal, 'id' | 'createdAt'>) => {
      const newGoal: Goal = {
        ...g,
        id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
      };
      setGoals((prev) => {
        const next = [...prev, newGoal];
        saveGoals(userId, next);
        return next;
      });
    },
    [userId]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      setGoals((prev) => {
        const next = prev.filter((g) => g.id !== id);
        saveGoals(userId, next);
        return next;
      });
    },
    [userId]
  );

  // Primary goal: emergency cushion takes precedence, otherwise first
  const primaryGoal =
    goals.find((g) => g.type === 'EMERGENCY_CUSHION') || goals[0] || null;

  return { goals, addGoal, deleteGoal, primaryGoal, hydrated };
}
