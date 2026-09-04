import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createSession } from '@/lib/auth/store';
import { verifyPassword } from '@/lib/auth/password';
import { getSessionCookieOptions } from '@/lib/auth/cookie';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Please enter both your email and password.' },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);
    if (!user) {
      // Return generic error to avoid user enumeration (Requirement 13)
      return NextResponse.json(
        { error: 'Email or password is incorrect.' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Email or password is incorrect.' },
        { status: 401 }
      );
    }

    // Create session
    const session = await createSession(user.id);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };

    const response = NextResponse.json({
      success: true,
      user: safeUser,
    });

    const cookieOpts = getSessionCookieOptions();
    response.cookies.set(cookieOpts.name, session.token, cookieOpts);

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
