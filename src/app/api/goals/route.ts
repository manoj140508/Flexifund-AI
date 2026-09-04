import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUserById } from '@/lib/auth/store';
import { SESSION_COOKIE_NAME } from '@/lib/auth/cookie';
import { getGoalsByUserId, createGoalForUser } from '@/lib/goals/store';
import { GoalType } from '@/lib/use-goals';

async function getAuthenticatedUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await getSession(token);
  if (!session) return null;

  const user = await getUserById(session.userId);
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to retrieve goals.' },
        { status: 401 }
      );
    }

    const goals = await getGoalsByUserId(user.id);
    return NextResponse.json({ success: true, goals });
  } catch (err: any) {
    console.error('Error fetching user goals:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch goals.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Please log in to create and save goals.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { title, goalType, targetAmount, currentAmount, targetDate } = body;

    // 1. Validate Title
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Goal title is required.' },
        { status: 400 }
      );
    }
    if (title.trim().length > 100) {
      return NextResponse.json(
        { error: 'Goal title must be 100 characters or fewer.' },
        { status: 400 }
      );
    }

    // 2. Validate Target Amount
    const targetNum = Number(targetAmount);
    if (isNaN(targetNum) || targetNum <= 0) {
      return NextResponse.json(
        { error: 'Target amount must be a positive number greater than ₹0.' },
        { status: 400 }
      );
    }
    if (targetNum > 100_000_000) {
      return NextResponse.json(
        { error: 'Target amount must be under ₹10,00,00,000 (10 crore).' },
        { status: 400 }
      );
    }

    // 3. Validate Current Amount if provided
    let currentNum = 0;
    if (currentAmount !== undefined && currentAmount !== null && currentAmount !== '') {
      currentNum = Number(currentAmount);
      if (isNaN(currentNum) || currentNum < 0) {
        return NextResponse.json(
          { error: 'Current amount cannot be negative.' },
          { status: 400 }
        );
      }
    }

    // 4. Validate Target Date if provided
    let cleanTargetDate: string | undefined = undefined;
    if (targetDate && typeof targetDate === 'string' && targetDate.trim()) {
      const dateObj = new Date(targetDate.trim());
      if (isNaN(dateObj.getTime())) {
        return NextResponse.json(
          { error: 'Please provide a valid target date (YYYY-MM-DD).' },
          { status: 400 }
        );
      }
      cleanTargetDate = targetDate.trim().slice(0, 10);
    }

    // 5. Validate Goal Type
    const validTypes: GoalType[] = [
      'EMERGENCY_CUSHION',
      'REDUCE_EXPENSES',
      'LOWER_INCOME_PREP',
      'SPECIFIC_SAVINGS',
      'REDUCE_REPAYMENT',
      'OTHER',
    ];
    const cleanType: GoalType = validTypes.includes(goalType) ? goalType : 'OTHER';

    // 6. Save in PostgreSQL owned by authenticated user
    const newGoal = await createGoalForUser(user.id, {
      title: title.trim(),
      goalType: cleanType,
      targetAmount: targetNum,
      currentAmount: currentNum,
      targetDate: cleanTargetDate,
    });

    return NextResponse.json({ success: true, goal: newGoal }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating goal:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create goal.' },
      { status: 500 }
    );
  }
}
