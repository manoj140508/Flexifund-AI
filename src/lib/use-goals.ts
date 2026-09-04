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
  currentRupees?: number;
  targetDate?: string; // YYYY-MM-DD, optional
  createdAt: string;   // ISO timestamp
  updatedAt?: string;
}

function storageKey(userId: string | undefined) {
  return userId ? `flexifund_${userId}_goals` : 'flexifund_guest_goals';
}

function loadGuestGoals(userId: string | undefined): Goal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGuestGoals(userId: string | undefined, goals: Goal[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(goals));
  } catch {}
}

export function useGoals(userId: string | undefined) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch from server if authenticated, or load from localStorage
  const refreshGoals = useCallback(async () => {
    if (!userId) {
      setGoals(loadGuestGoals(undefined));
      setHydrated(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/goals', {
        headers: { credentials: 'same-origin' },
      });
      if (res.ok) {
        const data = await res.json();
        const serverGoals: Goal[] = data.goals || [];
        setGoals(serverGoals);
        // Also keep localStorage updated as offline cache
        saveGuestGoals(userId, serverGoals);
      } else if (res.status === 401) {
        // Fallback to local storage if session expired or unauthenticated
        setGoals(loadGuestGoals(userId));
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to load goals from database.');
        setGoals(loadGuestGoals(userId));
      }
    } catch {
      // Offline fallback
      setGoals(loadGuestGoals(userId));
    } finally {
      setIsLoading(false);
      setHydrated(true);
    }
  }, [userId]);

  useEffect(() => {
    refreshGoals();
  }, [refreshGoals]);

  const addGoal = useCallback(
    async (g: {
      type: GoalType;
      label: string;
      targetRupees: number;
      currentRupees?: number;
      targetDate?: string;
    }): Promise<{ success: boolean; goal?: Goal; error?: string }> => {
      setIsSaving(true);
      setError(null);

      try {
        if (userId) {
          // Authenticated: Persist to PostgreSQL via API
          const res = await fetch('/api/goals', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: g.label,
              goalType: g.type,
              targetAmount: g.targetRupees,
              currentAmount: g.currentRupees ?? 0,
              targetDate: g.targetDate || undefined,
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            const msg = data.error || 'Failed to save goal to database.';
            setError(msg);
            return { success: false, error: msg };
          }

          const createdGoal: Goal = data.goal;
          setGoals((prev) => {
            const next = [createdGoal, ...prev.filter((item) => item.id !== createdGoal.id)];
            saveGuestGoals(userId, next);
            return next;
          });

          return { success: true, goal: createdGoal };
        } else {
          // Unauthenticated Guest: Persist to localStorage
          const newGoal: Goal = {
            id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            type: g.type,
            label: g.label,
            targetRupees: g.targetRupees,
            currentRupees: g.currentRupees ?? 0,
            targetDate: g.targetDate || undefined,
            createdAt: new Date().toISOString(),
          };

          setGoals((prev) => {
            const next = [newGoal, ...prev];
            saveGuestGoals(userId, next);
            return next;
          });

          return { success: true, goal: newGoal };
        }
      } catch (err: any) {
        const msg = err.message || 'An unexpected error occurred while saving your goal.';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSaving(false);
      }
    },
    [userId]
  );

  const deleteGoal = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      // Optimistic removal
      setGoals((prev) => {
        const next = prev.filter((g) => g.id !== id);
        saveGuestGoals(userId, next);
        return next;
      });

      if (userId) {
        try {
          const res = await fetch(`/api/goals/${id}`, {
            method: 'DELETE',
          });
          if (!res.ok) {
            // Rollback / refresh from server
            refreshGoals();
            return false;
          }
        } catch {
          refreshGoals();
          return false;
        }
      }

      return true;
    },
    [userId, refreshGoals]
  );

  const addMoneyToGoal = useCallback(
    async (
      goalId: string,
      amountToAdd: number
    ): Promise<{ success: boolean; goal?: Goal; error?: string }> => {
      setIsSaving(true);
      setError(null);

      try {
        if (userId) {
          const res = await fetch(`/api/goals/${goalId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addAmount: amountToAdd }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            const msg = data.error || 'Failed to update goal in database.';
            setError(msg);
            return { success: false, error: msg };
          }

          const updatedGoal: Goal = data.goal;
          setGoals((prev) =>
            prev.map((g) => (g.id === goalId ? updatedGoal : g))
          );
          return { success: true, goal: updatedGoal };
        } else {
          // Guest mode: update locally
          let updated: Goal | undefined;
          setGoals((prev) => {
            const next = prev.map((g) => {
              if (g.id === goalId) {
                const current = (g.currentRupees ?? 0) + amountToAdd;
                updated = { ...g, currentRupees: current, updatedAt: new Date().toISOString() };
                return updated;
              }
              return g;
            });
            saveGuestGoals(userId, next);
            return next;
          });
          return { success: true, goal: updated };
        }
      } catch (err: any) {
        const msg = err.message || 'An error occurred while updating the goal.';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSaving(false);
      }
    },
    [userId]
  );

  const updateGoal = useCallback(
    async (
      goalId: string,
      updates: {
        title?: string;
        targetAmount?: number;
        targetDate?: string | null;
      }
    ): Promise<{ success: boolean; goal?: Goal; error?: string }> => {
      setIsSaving(true);
      setError(null);

      try {
        if (userId) {
          const res = await fetch(`/api/goals/${goalId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            const msg = data.error || 'Failed to update goal in database.';
            setError(msg);
            return { success: false, error: msg };
          }

          const updatedGoal: Goal = data.goal;
          setGoals((prev) =>
            prev.map((g) => (g.id === goalId ? updatedGoal : g))
          );
          return { success: true, goal: updatedGoal };
        } else {
          // Guest mode
          let updated: Goal | undefined;
          setGoals((prev) => {
            const next = prev.map((g) => {
              if (g.id === goalId) {
                updated = {
                  ...g,
                  label: updates.title !== undefined ? updates.title : g.label,
                  targetRupees: updates.targetAmount !== undefined ? updates.targetAmount : g.targetRupees,
                  targetDate: updates.targetDate !== undefined ? (updates.targetDate || undefined) : g.targetDate,
                  updatedAt: new Date().toISOString(),
                };
                return updated;
              }
              return g;
            });
            saveGuestGoals(userId, next);
            return next;
          });
          return { success: true, goal: updated };
        }
      } catch (err: any) {
        const msg = err.message || 'An error occurred while updating the goal.';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSaving(false);
      }
    },
    [userId]
  );

  // Primary goal: emergency cushion takes precedence, otherwise first
  const primaryGoal =
    goals.find((g) => g.type === 'EMERGENCY_CUSHION') || goals[0] || null;

  return {
    goals,
    addGoal,
    updateGoal,
    addMoneyToGoal,
    deleteGoal,
    primaryGoal,
    hydrated,
    isLoading,
    isSaving,
    error,
    refreshGoals,
  };
}
