import { query } from '@/lib/db';
import { Goal, GoalType } from '@/lib/use-goals';

export interface StoredGoalRow {
  id: string;
  user_id: string;
  title: string;
  goal_type: string;
  target_amount: string | number;
  current_amount: string | number;
  target_date: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

function mapRowToGoal(row: StoredGoalRow): Goal {
  let targetDateStr: string | undefined = undefined;
  if (row.target_date) {
    if (row.target_date instanceof Date) {
      targetDateStr = row.target_date.toISOString().slice(0, 10);
    } else {
      targetDateStr = String(row.target_date).slice(0, 10);
    }
  }

  return {
    id: row.id,
    type: row.goal_type as GoalType,
    label: row.title,
    targetRupees: Number(row.target_amount),
    currentRupees: Number(row.current_amount || 0),
    targetDate: targetDateStr,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function getGoalsByUserId(userId: string): Promise<Goal[]> {
  if (!userId) return [];

  const res = await query<StoredGoalRow>(
    `SELECT id, user_id, title, goal_type, target_amount, current_amount, target_date, created_at, updated_at
     FROM user_goals
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return res.rows.map(mapRowToGoal);
}

export async function createGoalForUser(
  userId: string,
  input: {
    title: string;
    goalType: GoalType;
    targetAmount: number;
    currentAmount?: number;
    targetDate?: string;
  }
): Promise<Goal> {
  if (!userId) {
    throw new Error('Authentication required to create a goal.');
  }

  const id = `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date();
  const currentAmount = input.currentAmount ?? 0;
  const targetDateVal = input.targetDate ? input.targetDate.slice(0, 10) : null;

  const res = await query<StoredGoalRow>(
    `INSERT INTO user_goals (id, user_id, title, goal_type, target_amount, current_amount, target_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, user_id, title, goal_type, target_amount, current_amount, target_date, created_at, updated_at`,
    [
      id,
      userId,
      input.title.trim(),
      input.goalType,
      input.targetAmount,
      currentAmount,
      targetDateVal,
      now,
      now,
    ]
  );

  return mapRowToGoal(res.rows[0]);
}

export async function deleteGoalForUser(userId: string, goalId: string): Promise<boolean> {
  if (!userId || !goalId) return false;

  const res = await query(
    `DELETE FROM user_goals
     WHERE id = $1 AND user_id = $2`,
    [goalId, userId]
  );

  return (res.rowCount ?? 0) > 0;
}

export async function updateGoalForUser(
  userId: string,
  goalId: string,
  updates: {
    title?: string;
    targetAmount?: number;
    currentAmount?: number;
    targetDate?: string | null;
  }
): Promise<Goal | null> {
  if (!userId || !goalId) return null;

  const fields: string[] = ['updated_at = NOW()'];
  const values: any[] = [goalId, userId];
  let paramIdx = 3;

  if (updates.title !== undefined) {
    fields.push(`title = $${paramIdx++}`);
    values.push(updates.title.trim());
  }
  if (updates.targetAmount !== undefined) {
    fields.push(`target_amount = $${paramIdx++}`);
    values.push(updates.targetAmount);
  }
  if (updates.currentAmount !== undefined) {
    fields.push(`current_amount = $${paramIdx++}`);
    values.push(updates.currentAmount);
  }
  if (updates.targetDate !== undefined) {
    fields.push(`target_date = $${paramIdx++}`);
    values.push(updates.targetDate ? updates.targetDate.slice(0, 10) : null);
  }

  const queryText = `
    UPDATE user_goals
    SET ${fields.join(', ')}
    WHERE id = $1 AND user_id = $2
    RETURNING id, user_id, title, goal_type, target_amount, current_amount, target_date, created_at, updated_at
  `;

  const res = await query<StoredGoalRow>(queryText, values);
  if (res.rows.length === 0) return null;
  return mapRowToGoal(res.rows[0]);
}

export async function addMoneyToGoalForUser(
  userId: string,
  goalId: string,
  amountToAdd: number
): Promise<Goal | null> {
  if (!userId || !goalId || amountToAdd <= 0) return null;

  const res = await query<StoredGoalRow>(
    `UPDATE user_goals
     SET current_amount = COALESCE(current_amount, 0) + $3,
         updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, title, goal_type, target_amount, current_amount, target_date, created_at, updated_at`,
    [goalId, userId, amountToAdd]
  );

  if (res.rows.length === 0) return null;
  return mapRowToGoal(res.rows[0]);
}

