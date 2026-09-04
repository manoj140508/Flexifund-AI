import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getGoalsHandler, POST as postGoalHandler } from '@/app/api/goals/route';
import { DELETE as deleteGoalHandler, PATCH as patchGoalHandler } from '@/app/api/goals/[id]/route';

// Mock DB query and auth store
const mockGoals: any[] = [];
let mockCurrentUser: { id: string; name: string; email: string } | null = {
  id: 'usr_test_123',
  name: 'Ravi Kumar',
  email: 'ravi@example.com',
};

vi.mock('@/lib/auth/store', () => ({
  getSession: vi.fn().mockImplementation(async (token: string) => {
    if (token === 'valid_token' && mockCurrentUser) {
      return { token, userId: mockCurrentUser.id, expiresAt: Date.now() + 100000 };
    }
    return null;
  }),
  getUserById: vi.fn().mockImplementation(async (id: string) => {
    if (mockCurrentUser && mockCurrentUser.id === id) {
      return { ...mockCurrentUser, createdAt: new Date().toISOString() };
    }
    return null;
  }),
}));

vi.mock('@/lib/goals/store', () => ({
  getGoalsByUserId: vi.fn().mockImplementation(async (userId: string) => {
    return mockGoals.filter((g) => g.user_id === userId).map((g) => ({
      id: g.id,
      type: g.goal_type,
      label: g.title,
      targetRupees: Number(g.target_amount),
      currentRupees: Number(g.current_amount || 0),
      targetDate: g.target_date,
      createdAt: g.created_at,
    }));
  }),
  createGoalForUser: vi.fn().mockImplementation(async (userId: string, input: any) => {
    const newGoal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      user_id: userId,
      title: input.title,
      goal_type: input.goalType,
      target_amount: input.targetAmount,
      current_amount: input.currentAmount || 0,
      target_date: input.targetDate || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockGoals.push(newGoal);
    return {
      id: newGoal.id,
      type: newGoal.goal_type,
      label: newGoal.title,
      targetRupees: Number(newGoal.target_amount),
      currentRupees: Number(newGoal.current_amount),
      targetDate: newGoal.target_date,
      createdAt: newGoal.created_at,
    };
  }),
  addMoneyToGoalForUser: vi.fn().mockImplementation(async (userId: string, goalId: string, amount: number) => {
    const goal = mockGoals.find((g) => g.id === goalId && g.user_id === userId);
    if (!goal) return null;
    goal.current_amount = (Number(goal.current_amount) || 0) + amount;
    goal.updated_at = new Date().toISOString();
    return {
      id: goal.id,
      type: goal.goal_type,
      label: goal.title,
      targetRupees: Number(goal.target_amount),
      currentRupees: Number(goal.current_amount),
      targetDate: goal.target_date,
      createdAt: goal.created_at,
      updatedAt: goal.updated_at,
    };
  }),
  updateGoalForUser: vi.fn().mockImplementation(async (userId: string, goalId: string, updates: any) => {
    const goal = mockGoals.find((g) => g.id === goalId && g.user_id === userId);
    if (!goal) return null;
    if (updates.title !== undefined) goal.title = updates.title;
    if (updates.targetAmount !== undefined) goal.target_amount = updates.targetAmount;
    if (updates.targetDate !== undefined) goal.target_date = updates.targetDate;
    goal.updated_at = new Date().toISOString();
    return {
      id: goal.id,
      type: goal.goal_type,
      label: goal.title,
      targetRupees: Number(goal.target_amount),
      currentRupees: Number(goal.current_amount || 0),
      targetDate: goal.target_date,
      createdAt: goal.created_at,
      updatedAt: goal.updated_at,
    };
  }),
  deleteGoalForUser: vi.fn().mockImplementation(async (userId: string, goalId: string) => {
    const idx = mockGoals.findIndex((g) => g.id === goalId && g.user_id === userId);
    if (idx !== -1) {
      mockGoals.splice(idx, 1);
      return true;
    }
    return false;
  }),
}));

describe('Goals API & Server-Side Persistence', () => {
  beforeEach(() => {
    mockGoals.length = 0;
    mockCurrentUser = {
      id: 'usr_test_123',
      name: 'Ravi Kumar',
      email: 'ravi@example.com',
    };
  });

  function createRequest(method: string, url: string, body?: any, cookieToken?: string): NextRequest {
    const headers = new Headers();
    if (cookieToken) {
      headers.set('cookie', `flexifund_session=${cookieToken}`);
    }
    if (body) {
      headers.set('content-type', 'application/json');
    }

    return new NextRequest(new URL(url, 'http://localhost:3000'), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  it('rejects goal creation when unauthenticated (HTTP 401)', async () => {
    const req = createRequest('POST', '/api/goals', {
      title: 'Emergency Cushion',
      targetAmount: 50000,
      goalType: 'EMERGENCY_CUSHION',
    });

    const res = await postGoalHandler(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('log in');
  });

  it('validates goal inputs strictly (rejects empty title, negative/zero amount)', async () => {
    // Empty title
    let req = createRequest('POST', '/api/goals', {
      title: '   ',
      targetAmount: 50000,
      goalType: 'EMERGENCY_CUSHION',
    }, 'valid_token');

    let res = await postGoalHandler(req);
    expect(res.status).toBe(400);
    let data = await res.json();
    expect(data.error).toContain('title is required');

    // Zero target amount
    req = createRequest('POST', '/api/goals', {
      title: 'Emergency Cushion',
      targetAmount: 0,
      goalType: 'EMERGENCY_CUSHION',
    }, 'valid_token');

    res = await postGoalHandler(req);
    expect(res.status).toBe(400);
    data = await res.json();
    expect(data.error).toContain('greater than ₹0');

    // Negative target amount
    req = createRequest('POST', '/api/goals', {
      title: 'Emergency Cushion',
      targetAmount: -500,
      goalType: 'EMERGENCY_CUSHION',
    }, 'valid_token');

    res = await postGoalHandler(req);
    expect(res.status).toBe(400);
    data = await res.json();
    expect(data.error).toContain('greater than ₹0');
  });

  it('creates goal and assigns ownership automatically to the session user', async () => {
    const req = createRequest('POST', '/api/goals', {
      title: 'Vehicle Repair',
      targetAmount: 15000,
      currentAmount: 2000,
      goalType: 'SPECIFIC_SAVINGS',
      targetDate: '2026-12-31',
    }, 'valid_token');

    const res = await postGoalHandler(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.goal.label).toBe('Vehicle Repair');
    expect(data.goal.targetRupees).toBe(15000);
    expect(data.goal.currentRupees).toBe(2000);

    // Verify stored goal belongs to user
    expect(mockGoals.length).toBe(1);
    expect(mockGoals[0].user_id).toBe('usr_test_123');
  });

  it('enforces strict multi-user isolation: User B cannot see or delete User A goals', async () => {
    // Seed Goal for User A
    mockGoals.push({
      id: 'goal_user_a',
      user_id: 'usr_test_123',
      title: 'User A Secret Goal',
      goal_type: 'EMERGENCY_CUSHION',
      target_amount: 30000,
      current_amount: 0,
      target_date: null,
      created_at: new Date().toISOString(),
    });

    // Switch session to User B
    mockCurrentUser = {
      id: 'usr_other_456',
      name: 'Priya Sharma',
      email: 'priya@example.com',
    };

    // User B fetches goals
    const getReq = createRequest('GET', '/api/goals', undefined, 'valid_token');
    const getRes = await getGoalsHandler(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.goals.length).toBe(0); // Zero goals visible to User B

    // User B attempts to delete User A's goal
    const delReq = createRequest('DELETE', '/api/goals/goal_user_a', undefined, 'valid_token');
    const delRes = await deleteGoalHandler(delReq, { params: { id: 'goal_user_a' } });
    expect(delRes.status).toBe(404);

    // Ensure User A's goal still exists in the database
    expect(mockGoals.some((g) => g.id === 'goal_user_a')).toBe(true);
  });

  it('atomically adds money to an existing goal without resetting or replacing it', async () => {
    // Seed existing goal with currentAmount = 200 and targetAmount = 5000
    mockGoals.push({
      id: 'goal_prog_1',
      user_id: 'usr_test_123',
      title: 'Bike Downpayment',
      goal_type: 'SPECIFIC_SAVINGS',
      target_amount: 5000,
      current_amount: 200,
      target_date: '2026-12-31',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Send PATCH with addAmount = 500
    const patchReq = createRequest(
      'PATCH',
      '/api/goals/goal_prog_1',
      { addAmount: 500 },
      'valid_token'
    );
    const patchRes = await patchGoalHandler(patchReq, { params: { id: 'goal_prog_1' } });
    expect(patchRes.status).toBe(200);

    const patchData = await patchRes.json();
    expect(patchData.success).toBe(true);
    expect(patchData.goal.currentRupees).toBe(700); // 200 + 500 = 700
    expect(patchData.goal.targetRupees).toBe(5000);
    expect(patchData.goal.label).toBe('Bike Downpayment');

    // Verify DB state
    const stored = mockGoals.find((g) => g.id === 'goal_prog_1');
    expect(stored.current_amount).toBe(700);
  });

  it('validates addAmount inputs strictly (rejects <= 0, NaN, unauthenticated)', async () => {
    mockGoals.push({
      id: 'goal_prog_2',
      user_id: 'usr_test_123',
      title: 'Emergency Fund',
      goal_type: 'EMERGENCY_CUSHION',
      target_amount: 10000,
      current_amount: 1000,
      target_date: null,
      created_at: new Date().toISOString(),
    });

    // Zero amount
    let req = createRequest('PATCH', '/api/goals/goal_prog_2', { addAmount: 0 }, 'valid_token');
    let res = await patchGoalHandler(req, { params: { id: 'goal_prog_2' } });
    expect(res.status).toBe(400);

    // Negative amount
    req = createRequest('PATCH', '/api/goals/goal_prog_2', { addAmount: -50 }, 'valid_token');
    res = await patchGoalHandler(req, { params: { id: 'goal_prog_2' } });
    expect(res.status).toBe(400);

    // Non-numeric amount
    req = createRequest('PATCH', '/api/goals/goal_prog_2', { addAmount: 'not-a-number' }, 'valid_token');
    res = await patchGoalHandler(req, { params: { id: 'goal_prog_2' } });
    expect(res.status).toBe(400);

    // Unauthenticated request
    req = createRequest('PATCH', '/api/goals/goal_prog_2', { addAmount: 500 });
    res = await patchGoalHandler(req, { params: { id: 'goal_prog_2' } });
    expect(res.status).toBe(401);
  });

  it('allows editing goal name, target amount, and target date without altering saved money', async () => {
    mockGoals.push({
      id: 'goal_edit_1',
      user_id: 'usr_test_123',
      title: 'Old Goal Title',
      goal_type: 'SPECIFIC_SAVINGS',
      target_amount: 10000,
      current_amount: 3500,
      target_date: '2026-10-01',
      created_at: new Date().toISOString(),
    });

    const editReq = createRequest(
      'PATCH',
      '/api/goals/goal_edit_1',
      {
        title: 'New Goal Title',
        targetAmount: 15000,
        targetDate: '2027-03-31',
      },
      'valid_token'
    );
    const editRes = await patchGoalHandler(editReq, { params: { id: 'goal_edit_1' } });
    expect(editRes.status).toBe(200);

    const editData = await editRes.json();
    expect(editData.goal.label).toBe('New Goal Title');
    expect(editData.goal.targetRupees).toBe(15000);
    expect(editData.goal.targetDate).toBe('2027-03-31');
    expect(editData.goal.currentRupees).toBe(3500); // Preserved!
  });

  it('prevents user from editing or adding money to another user’s goal', async () => {
    mockGoals.push({
      id: 'goal_private',
      user_id: 'usr_test_123',
      title: 'Private Goal',
      goal_type: 'EMERGENCY_CUSHION',
      target_amount: 5000,
      current_amount: 200,
      target_date: null,
      created_at: new Date().toISOString(),
    });

    // Switch to User B
    mockCurrentUser = {
      id: 'usr_stranger_999',
      name: 'Stranger',
      email: 'stranger@example.com',
    };

    const patchReq = createRequest(
      'PATCH',
      '/api/goals/goal_private',
      { addAmount: 500 },
      'valid_token'
    );
    const patchRes = await patchGoalHandler(patchReq, { params: { id: 'goal_private' } });
    expect(patchRes.status).toBe(404);

    // Verify User A's goal balance did NOT change
    const stored = mockGoals.find((g) => g.id === 'goal_private');
    expect(stored.current_amount).toBe(200);
  });
});

