import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockGoalRows } = vi.hoisted(() => ({
  mockGoalRows: [] as any[],
}));

vi.mock('@/lib/db', () => ({
  query: vi.fn(async (sql: string, params: any[] = []) => {
    const normalizedSql = sql.replace(/\s+/g, ' ').trim();

    // INSERT INTO user_goals
    if (normalizedSql.startsWith('INSERT INTO user_goals')) {
      const [id, userId, title, goalType, targetAmount, currentAmount, targetDate, createdAt, updatedAt] = params;
      const newRow = {
        id,
        user_id: userId,
        title,
        goal_type: goalType,
        target_amount: targetAmount,
        current_amount: currentAmount,
        target_date: targetDate,
        created_at: createdAt,
        updated_at: updatedAt,
      };
      mockGoalRows.push(newRow);
      return { rows: [newRow] };
    }

    // SELECT ... FROM user_goals WHERE user_id = $1
    if (normalizedSql.includes('FROM user_goals WHERE user_id = $1')) {
      const userId = params[0];
      const rows = mockGoalRows.filter((r) => r.user_id === userId);
      return { rows };
    }

    // UPDATE user_goals SET current_amount = COALESCE(current_amount, 0) + $3 ... WHERE id = $1 AND user_id = $2
    if (normalizedSql.includes('UPDATE user_goals SET current_amount = COALESCE(current_amount, 0) + $3')) {
      const [goalId, userId, amountToAdd] = params;
      const row = mockGoalRows.find((r) => r.id === goalId && r.user_id === userId);
      if (!row) return { rows: [] };
      row.current_amount = Number(row.current_amount || 0) + Number(amountToAdd);
      row.updated_at = new Date();
      return { rows: [row] };
    }

    // Generic UPDATE user_goals
    if (normalizedSql.startsWith('UPDATE user_goals')) {
      const goalId = params[0];
      const userId = params[1];
      const row = mockGoalRows.find((r) => r.id === goalId && r.user_id === userId);
      if (!row) return { rows: [] };

      // Parse fields set from params
      let paramIdx = 3;
      if (normalizedSql.includes(`title = $${paramIdx}`)) {
        row.title = params[paramIdx - 1];
        paramIdx++;
      }
      if (normalizedSql.includes(`target_amount = $${paramIdx}`)) {
        row.target_amount = params[paramIdx - 1];
        paramIdx++;
      }
      if (normalizedSql.includes(`current_amount = $${paramIdx}`)) {
        row.current_amount = params[paramIdx - 1];
        paramIdx++;
      }
      if (normalizedSql.includes(`target_date = $${paramIdx}`)) {
        row.target_date = params[paramIdx - 1];
        paramIdx++;
      }
      row.updated_at = new Date();
      return { rows: [row] };
    }

    // DELETE FROM user_goals WHERE id = $1 AND user_id = $2
    if (normalizedSql.startsWith('DELETE FROM user_goals')) {
      const [goalId, userId] = params;
      const idx = mockGoalRows.findIndex((r) => r.id === goalId && r.user_id === userId);
      if (idx !== -1) {
        mockGoalRows.splice(idx, 1);
        return { rowCount: 1, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    }

    return { rows: [] };
  }),
  ensureSchema: vi.fn(async () => {}),
}));

import {
  getGoalsByUserId,
  createGoalForUser,
  addMoneyToGoalForUser,
  updateGoalForUser,
  deleteGoalForUser,
} from '@/lib/goals/store';

describe('PostgreSQL Goals Store (SQL Operations)', () => {
  beforeEach(() => {
    mockGoalRows.length = 0;
  });

  it('creates a goal and retrieves it for the user', async () => {
    const goal = await createGoalForUser('usr_001', {
      title: 'Bike Fund',
      goalType: 'SPECIFIC_SAVINGS',
      targetAmount: 5000,
      currentAmount: 200,
      targetDate: '2026-12-31',
    });

    expect(goal.label).toBe('Bike Fund');
    expect(goal.targetRupees).toBe(5000);
    expect(goal.currentRupees).toBe(200);

    const userGoals = await getGoalsByUserId('usr_001');
    expect(userGoals.length).toBe(1);
    expect(userGoals[0].id).toBe(goal.id);
  });

  it('atomically adds money to current_amount without resetting existing savings', async () => {
    const goal = await createGoalForUser('usr_001', {
      title: 'Save for rainy day',
      goalType: 'EMERGENCY_CUSHION',
      targetAmount: 5000,
      currentAmount: 200,
    });

    // Add ₹500
    const updated = await addMoneyToGoalForUser('usr_001', goal.id, 500);
    expect(updated).not.toBeNull();
    expect(updated?.currentRupees).toBe(700); // 200 + 500 = 700!
    expect(updated?.targetRupees).toBe(5000);

    // Add another ₹1,300
    const updatedAgain = await addMoneyToGoalForUser('usr_001', goal.id, 1300);
    expect(updatedAgain?.currentRupees).toBe(2000); // 700 + 1300 = 2000!
  });

  it('rejects adding money with invalid or negative amounts', async () => {
    const goal = await createGoalForUser('usr_001', {
      title: 'Festival Shopping',
      goalType: 'FESTIVAL_EXPENSE',
      targetAmount: 3000,
      currentAmount: 500,
    });

    const resultZero = await addMoneyToGoalForUser('usr_001', goal.id, 0);
    expect(resultZero).toBeNull();

    const resultNeg = await addMoneyToGoalForUser('usr_001', goal.id, -100);
    expect(resultNeg).toBeNull();

    // Verify current amount remained 500
    const fetched = await getGoalsByUserId('usr_001');
    expect(fetched[0].currentRupees).toBe(500);
  });

  it('updates goal properties (title, targetAmount, targetDate) while preserving current savings', async () => {
    const goal = await createGoalForUser('usr_001', {
      title: 'Old Title',
      goalType: 'SPECIFIC_SAVINGS',
      targetAmount: 5000,
      currentAmount: 1500,
      targetDate: '2026-10-01',
    });

    const updated = await updateGoalForUser('usr_001', goal.id, {
      title: 'New Goal Title',
      targetAmount: 8000,
      targetDate: '2027-02-15',
    });

    expect(updated).not.toBeNull();
    expect(updated?.label).toBe('New Goal Title');
    expect(updated?.targetRupees).toBe(8000);
    expect(updated?.targetDate).toBe('2027-02-15');
    expect(updated?.currentRupees).toBe(1500); // Current savings preserved!
  });

  it('isolates user goals: User B cannot add money, edit, or delete User A goals', async () => {
    const userAGoal = await createGoalForUser('usr_A', {
      title: 'User A Secret Fund',
      goalType: 'EMERGENCY_CUSHION',
      targetAmount: 20000,
      currentAmount: 5000,
    });

    // User B attempts to add money
    const addMoneyAttempt = await addMoneyToGoalForUser('usr_B', userAGoal.id, 500);
    expect(addMoneyAttempt).toBeNull();

    // User B attempts to update
    const updateAttempt = await updateGoalForUser('usr_B', userAGoal.id, { title: 'Hacked Title' });
    expect(updateAttempt).toBeNull();

    // User B attempts to delete
    const deleteAttempt = await deleteGoalForUser('usr_B', userAGoal.id);
    expect(deleteAttempt).toBe(false);

    // Verify User A's goal is intact
    const userAGoals = await getGoalsByUserId('usr_A');
    expect(userAGoals.length).toBe(1);
    expect(userAGoals[0].title || userAGoals[0].label).toBe('User A Secret Fund');
    expect(userAGoals[0].currentRupees).toBe(5000);

    // User B has 0 goals
    const userBGoals = await getGoalsByUserId('usr_B');
    expect(userBGoals.length).toBe(0);
  });
});
