import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUserById } from '@/lib/auth/store';
import { SESSION_COOKIE_NAME } from '@/lib/auth/cookie';
import { deleteGoalForUser, updateGoalForUser, addMoneyToGoalForUser } from '@/lib/goals/store';

async function getAuthenticatedUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await getSession(token);
  if (!session) return null;

  const user = await getUserById(session.userId);
  return user;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to delete goals.' },
        { status: 401 }
      );
    }

    const goalId = params.id;
    if (!goalId) {
      return NextResponse.json(
        { error: 'Goal ID is required.' },
        { status: 400 }
      );
    }

    const deleted = await deleteGoalForUser(user.id, goalId);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Goal not found or unauthorized to delete.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting goal:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete goal.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to update goals.' },
        { status: 401 }
      );
    }

    const goalId = params.id;
    if (!goalId) {
      return NextResponse.json(
        { error: 'Goal ID is required.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { addAmount, title, targetAmount, currentAmount, targetDate } = body;

    // 1. If adding money incrementally
    if (addAmount !== undefined) {
      const parsedAdd = Number(addAmount);
      if (isNaN(parsedAdd) || parsedAdd <= 0) {
        return NextResponse.json(
          { error: 'Amount to add must be greater than ₹0.' },
          { status: 400 }
        );
      }
      if (parsedAdd > 100_000_000) {
        return NextResponse.json(
          { error: 'Amount to add is too large.' },
          { status: 400 }
        );
      }

      const updated = await addMoneyToGoalForUser(user.id, goalId, parsedAdd);
      if (!updated) {
        return NextResponse.json(
          { error: 'Goal not found or unauthorized to update.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, goal: updated });
    }

    // 2. Otherwise updating goal properties
    if (title !== undefined && (!title || typeof title !== 'string' || !title.trim())) {
      return NextResponse.json(
        { error: 'Goal title cannot be empty.' },
        { status: 400 }
      );
    }

    if (targetAmount !== undefined) {
      const parsedTarget = Number(targetAmount);
      if (isNaN(parsedTarget) || parsedTarget <= 0) {
        return NextResponse.json(
          { error: 'Target amount must be greater than ₹0.' },
          { status: 400 }
        );
      }
    }

    if (currentAmount !== undefined) {
      const parsedCurrent = Number(currentAmount);
      if (isNaN(parsedCurrent) || parsedCurrent < 0) {
        return NextResponse.json(
          { error: 'Current amount cannot be negative.' },
          { status: 400 }
        );
      }
    }

    const updated = await updateGoalForUser(user.id, goalId, {
      title: title ? title.trim() : undefined,
      targetAmount: targetAmount !== undefined ? Number(targetAmount) : undefined,
      currentAmount: currentAmount !== undefined ? Number(currentAmount) : undefined,
      targetDate: targetDate !== undefined ? targetDate : undefined,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Goal not found or unauthorized to update.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, goal: updated });
  } catch (err: any) {
    console.error('Error updating goal:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update goal.' },
      { status: 500 }
    );
  }
}

