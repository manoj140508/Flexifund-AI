import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUserById } from '@/lib/auth/store';
import { SESSION_COOKIE_NAME } from '@/lib/auth/cookie';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const session = await getSession(token);
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
