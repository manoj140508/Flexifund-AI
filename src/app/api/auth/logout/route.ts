import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth/store';
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from '@/lib/auth/cookie';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await deleteSession(token);
    }

    const response = NextResponse.json({ success: true });
    const cookieOpts = getSessionCookieOptions();

    // Expire cookie immediately
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      ...cookieOpts,
      maxAge: 0,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Logout failed.' },
      { status: 500 }
    );
  }
}
